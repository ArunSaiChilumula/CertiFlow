import { Prisma } from "../../generated/prisma/client.js";
import prisma from "../../lib/prisma.js";
import type { CandidateInput, CandidateCsvIssue } from "./candidate-upload.validation.js";
import type { CreateBatchInput, DistrictApprovalInput, StageApprovalInput } from "./batch.validation.js";

export class BatchServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "BatchServiceError";
  }
}

export class CandidateUploadError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly errors?: CandidateCsvIssue[],
  ) {
    super(message);
    this.name = "CandidateUploadError";
  }
}

export class BatchWorkflowError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = "BatchWorkflowError";
  }
}

export async function listBatches(filters: { trainingCentreId?: string; status?: "DISTRICT_REVIEW" | "QUALITY_REVIEW" | "STATE_REVIEW" }) {
  const batches = await prisma.batch.findMany({
    where: {
      ...(filters.trainingCentreId ? { trainingCentreId: filters.trainingCentreId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      batchNumber: true,
      courseName: true,
      candidateCount: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      submittedAt: true,
      approvalRound: true,
    },
  });

  if (batches.length === 0) return [];
  const approvals = await prisma.approval.findMany({
    where: { batchId: { in: batches.map((batch) => batch.id) }, stage: "DISTRICT", decision: "APPROVED" },
    select: { batchId: true, round: true, userId: true },
  });
  return batches.map((batch) => ({
    ...batch,
    districtApprovalCount: new Set(approvals
      .filter((approval) => approval.batchId === batch.id && approval.round === batch.approvalRound)
      .map((approval) => approval.userId)).size,
  }));
}

export async function getBatch(batchId: string) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: {
      id: true,
      batchNumber: true,
      courseName: true,
      candidateCount: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      submittedAt: true,
      approvalRound: true,
      requiresQualityReview: true,
      candidates: {
        orderBy: { createdAt: "asc" },
        select: { id: true, fullName: true, email: true, phone: true, candidateCode: true },
      },
    },
  });
  if (!batch) throw new BatchServiceError("Batch not found", 404);
  const approvals = await prisma.approval.findMany({
    where: { batchId, round: batch.approvalRound },
    orderBy: { createdAt: "asc" },
    select: {
      stage: true,
      userId: true,
      decision: true,
      comments: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  });
  const districtApprovalCount = new Set(approvals
    .filter((approval) => approval.stage === "DISTRICT" && approval.decision === "APPROVED")
    .map((approval) => approval.userId)).size;
  return {
    ...batch,
    districtApprovals: approvals.filter((approval) => approval.stage === "DISTRICT"),
    stageApprovals: approvals,
    districtApprovalCount,
  };
}

function mapWorkflowDatabaseError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      throw new BatchWorkflowError("This officer has already recorded a decision for this batch in this round", 409);
    }
    if (error.code === "P2034") {
      throw new BatchWorkflowError("Batch workflow changed during this request; please retry", 409);
    }
  }
  throw error;
}

export async function submitBatch(batchId: string) {
  try {
    return await prisma.$transaction(async (transaction) => {
      const batch = await transaction.batch.findUnique({
        where: { id: batchId },
        select: { id: true, status: true },
      });
      if (!batch) throw new BatchWorkflowError("Batch not found", 404);
      if (batch.status !== "DRAFT") {
        throw new BatchWorkflowError("Only DRAFT batches can be submitted", 409);
      }

      const candidateCount = await transaction.candidate.count({ where: { batchId } });
      if (candidateCount === 0) {
        throw new BatchWorkflowError("A batch must contain at least one candidate before submission", 400);
      }

      const submittedAt = new Date();
      const transition = await transaction.batch.updateMany({
        where: { id: batchId, status: "DRAFT" },
        data: { status: "DISTRICT_REVIEW", submittedAt },
      });
      if (transition.count !== 1) {
        throw new BatchWorkflowError("Only DRAFT batches can be submitted", 409);
      }

      await transaction.auditLog.create({
        data: {
          action: "BATCH_SUBMITTED",
          entity: "Batch",
          entityId: batchId,
          batchId,
          details: { fromStatus: "DRAFT", toStatus: "DISTRICT_REVIEW", candidateCount },
        },
      });

      return { batchId, status: "DISTRICT_REVIEW" as const, submittedAt, candidateCount };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof BatchWorkflowError) throw error;
    mapWorkflowDatabaseError(error);
  }
}

export async function recordDistrictApproval(batchId: string, input: DistrictApprovalInput) {
  try {
    return await prisma.$transaction(async (transaction) => {
      const batch = await transaction.batch.findUnique({
        where: { id: batchId },
        select: {
          id: true,
          status: true,
          approvalRound: true,
          createdById: true,
          requiresQualityReview: true,
        },
      });
      if (!batch) throw new BatchWorkflowError("Batch not found", 404);
      if (batch.status !== "DISTRICT_REVIEW") {
        throw new BatchWorkflowError("Batch must be in DISTRICT_REVIEW to receive a district decision", 409);
      }

      const user = await transaction.user.findUnique({
        where: { id: input.userId },
        select: { id: true, role: true },
      });
      if (!user) throw new BatchWorkflowError("District officer user not found", 404);
      if (user.role !== "DISTRICT_OFFICER") {
        throw new BatchWorkflowError("User must have the DISTRICT_OFFICER role", 403);
      }
      if (batch.createdById === user.id) {
        throw new BatchWorkflowError("A batch creator cannot approve their own batch", 403);
      }

      const existingDecision = await transaction.approval.findUnique({
        where: {
          batchId_round_stage_userId: {
            batchId,
            round: batch.approvalRound,
            stage: "DISTRICT",
            userId: user.id,
          },
        },
        select: { id: true },
      });
      if (existingDecision) {
        throw new BatchWorkflowError("This officer has already recorded a decision for this batch in this round", 409);
      }

      await transaction.approval.create({
        data: {
          batchId,
          userId: user.id,
          stage: "DISTRICT",
          decision: input.decision,
          comments: input.comments,
          round: batch.approvalRound,
        },
      });

      let status: "DISTRICT_REVIEW" | "REJECTED" | "RETURNED" | "QUALITY_REVIEW" | "STATE_REVIEW" = batch.status;
      let action = "DISTRICT_APPROVAL_RECORDED";
      if (input.decision === "REJECTED" || input.decision === "RETURNED") {
        status = input.decision;
        action = input.decision === "REJECTED" ? "BATCH_REJECTED" : "BATCH_RETURNED";
        const transition = await transaction.batch.updateMany({
          where: { id: batchId, status: "DISTRICT_REVIEW" },
          data: input.decision === "REJECTED"
            ? { status: "REJECTED", rejectionReason: input.comments }
            : { status: "RETURNED", returnReason: input.comments },
        });
        if (transition.count !== 1) {
          throw new BatchWorkflowError("Batch workflow changed during this request; please retry", 409);
        }
      }

      const districtApprovers = await transaction.approval.findMany({
        where: {
          batchId,
          round: batch.approvalRound,
          stage: "DISTRICT",
          decision: "APPROVED",
        },
        distinct: ["userId"],
        select: { userId: true },
      });
      const approvalCount = districtApprovers.length;

      let transitionedFrom: "DISTRICT_REVIEW" | null = null;
      if (input.decision === "APPROVED" && approvalCount >= 2) {
        status = batch.requiresQualityReview ? "QUALITY_REVIEW" : "STATE_REVIEW";
        const transition = await transaction.batch.updateMany({
          where: { id: batchId, status: "DISTRICT_REVIEW" },
          data: { status },
        });
        if (transition.count !== 1) {
          throw new BatchWorkflowError("Batch workflow changed during this request; please retry", 409);
        }
        transitionedFrom = "DISTRICT_REVIEW";
      }

      await transaction.auditLog.create({
        data: {
          action,
          entity: "Batch",
          entityId: batchId,
          batchId,
          userId: user.id,
          details: {
            stage: "DISTRICT",
            decision: input.decision,
            approvalRound: batch.approvalRound,
            approvalCount,
            status,
            ...(input.comments ? { comments: input.comments } : {}),
          },
        },
      });

      if (transitionedFrom) {
        await transaction.auditLog.create({
          data: {
            action: "BATCH_STAGE_TRANSITIONED",
            entity: "Batch",
            entityId: batchId,
            batchId,
            details: {
              fromStatus: transitionedFrom,
              toStatus: status,
              fromStage: "DISTRICT",
              toStage: batch.requiresQualityReview ? "QUALITY" : "STATE",
              approvalRound: batch.approvalRound,
              distinctDistrictApprovals: approvalCount,
            },
          },
        });
      }

      return {
        batchId,
        decision: input.decision,
        status,
        approvalRound: batch.approvalRound,
        districtApprovalCount: approvalCount,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof BatchWorkflowError) throw error;
    mapWorkflowDatabaseError(error);
  }
}

export async function recordQualityOrStateApproval(batchId: string, stage: "QUALITY" | "STATE", input: StageApprovalInput) {
  const expectedStatus = stage === "QUALITY" ? "QUALITY_REVIEW" : "STATE_REVIEW";
  const expectedRole = stage === "QUALITY" ? "QUALITY_OFFICER" : "STATE_OFFICER";
  try {
    return await prisma.$transaction(async (transaction) => {
      const batch = await transaction.batch.findUnique({
        where: { id: batchId },
        select: { id: true, batchNumber: true, status: true, approvalRound: true, createdById: true },
      });
      if (!batch) throw new BatchWorkflowError("Batch not found", 404);
      if (batch.status !== expectedStatus) {
        throw new BatchWorkflowError(`Batch must be in ${expectedStatus} to receive a ${stage.toLowerCase()} decision`, 409);
      }
      const user = await transaction.user.findUnique({ where: { id: input.userId }, select: { id: true, role: true } });
      if (!user) throw new BatchWorkflowError(`${stage === "QUALITY" ? "Quality" : "State"} officer user not found`, 404);
      if (user.role !== expectedRole) throw new BatchWorkflowError(`User must have the ${expectedRole} role`, 403);
      if (batch.createdById === user.id) throw new BatchWorkflowError("A batch creator cannot approve their own batch", 403);

      await transaction.approval.create({
        data: {
          batchId,
          userId: user.id,
          stage,
          decision: input.decision,
          comments: input.comments,
          round: batch.approvalRound,
        },
      });

      let status: "STATE_REVIEW" | "APPROVED" | "RETURNED" | "REJECTED";
      if (input.decision === "REJECTED") status = "REJECTED";
      else if (input.decision === "RETURNED") status = "RETURNED";
      else status = stage === "QUALITY" ? "STATE_REVIEW" : "APPROVED";

      const now = new Date();
      const transition = await transaction.batch.updateMany({
        where: { id: batchId, status: expectedStatus },
        data: {
          status,
          ...(status === "REJECTED" ? { rejectionReason: input.comments } : {}),
          ...(status === "RETURNED" ? { returnReason: input.comments } : {}),
          ...(stage === "STATE" && status === "APPROVED" ? { approvedAt: now } : {}),
        },
      });
      if (transition.count !== 1) throw new BatchWorkflowError("Batch workflow changed during this request; please retry", 409);

      let certificateCount = 0;
      if (stage === "STATE" && status === "APPROVED") {
        const candidates = await transaction.candidate.findMany({ where: { batchId }, select: { id: true } });
        if (candidates.length === 0) throw new BatchWorkflowError("Cannot approve a batch without candidates", 409);
        const existing = await transaction.certificate.findMany({ where: { candidateId: { in: candidates.map((candidate) => candidate.id) } }, select: { candidateId: true } });
        const existingIds = new Set(existing.map((certificate) => certificate.candidateId));
        const newCandidates = candidates.filter((candidate) => !existingIds.has(candidate.id));
        if (newCandidates.length) {
          await transaction.certificate.createMany({
            data: newCandidates.map((candidate) => ({
              batchId,
              candidateId: candidate.id,
              certificateNumber: `CF-${batch.batchNumber}-${candidate.id}`,
            })),
          });
        }
        certificateCount = candidates.length;
      }

      await transaction.auditLog.create({
        data: {
          action: `${stage}_DECISION_RECORDED`,
          entity: "Batch",
          entityId: batchId,
          batchId,
          userId: user.id,
          details: { stage, decision: input.decision, approvalRound: batch.approvalRound, fromStatus: expectedStatus, toStatus: status, ...(input.comments ? { comments: input.comments } : {}), ...(certificateCount ? { certificateCount } : {}) },
        },
      });
      await transaction.auditLog.create({
        data: {
          action: "BATCH_STAGE_TRANSITIONED",
          entity: "Batch",
          entityId: batchId,
          batchId,
          details: { fromStatus: expectedStatus, toStatus: status, fromStage: stage, toStage: stage === "QUALITY" && status === "STATE_REVIEW" ? "STATE" : status, approvalRound: batch.approvalRound, ...(certificateCount ? { certificateCount } : {}) },
        },
      });
      return { batchId, decision: input.decision, status, approvalRound: batch.approvalRound, certificateCount };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof BatchWorkflowError) throw error;
    mapWorkflowDatabaseError(error);
  }
}

export async function uploadCandidates(batchId: string, candidates: CandidateInput[]) {
  try {
    return await prisma.$transaction(async (transaction) => {
      const batch = await transaction.batch.findUnique({
        where: { id: batchId },
        select: { id: true, status: true },
      });
      if (!batch) throw new CandidateUploadError("Batch not found", 404);
      if (batch.status !== "DRAFT") {
        throw new CandidateUploadError("Candidates can only be uploaded to a DRAFT batch", 409);
      }

      const phones = candidates.map((candidate) => candidate.phone);
      const existing = await transaction.candidate.findMany({
        where: { batchId, phone: { in: phones } },
        select: { phone: true },
      });
      if (existing.length > 0) {
        const existingPhones = new Set(existing.map((candidate) => candidate.phone));
        const errors: CandidateCsvIssue[] = candidates.flatMap((candidate, index) =>
          existingPhones.has(candidate.phone)
            ? [{ row: index + 2, field: "phone", message: "Phone number already exists in this batch" }]
            : [],
        );
        throw new CandidateUploadError("CSV validation failed", 400, errors);
      }

      await transaction.candidate.createMany({
        data: candidates.map((candidate) => ({ ...candidate, batchId })),
      });
      const candidateCount = await transaction.candidate.count({ where: { batchId } });
      const updatedBatch = await transaction.batch.update({
        where: { id: batchId },
        data: { candidateCount },
        select: { candidateCount: true },
      });

      return { batchId, uploadedCount: candidates.length, candidateCount: updatedBatch.candidateCount };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof CandidateUploadError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new CandidateUploadError("A candidate phone number already exists in this batch", 409);
    }
    throw error;
  }
}

export async function createBatch(input: CreateBatchInput) {
  const centre = await prisma.trainingCentre.findUnique({
    where: { id: input.trainingCentreId },
    select: { id: true },
  });
  if (!centre) throw new BatchServiceError("Training centre not found", 404);

  const creator = await prisma.user.findUnique({
    where: { id: input.createdById },
    select: { id: true, role: true, trainingCentreId: true },
  });
  if (!creator) throw new BatchServiceError("User not found", 404);
  if (creator.role !== "TRAINING_CENTRE" || creator.trainingCentreId !== centre.id) {
    throw new BatchServiceError(
      "Creator must have the TRAINING_CENTRE role and belong to this training centre",
      403,
    );
  }

  const existingBatch = await prisma.batch.findUnique({
    where: { batchNumber: input.batchNumber },
    select: { id: true },
  });
  if (existingBatch) {
    throw new BatchServiceError("A batch with this batch number already exists", 409);
  }

  try {
    return await prisma.batch.create({
      data: {
        batchNumber: input.batchNumber,
        courseName: input.courseName,
        trainingCentreId: centre.id,
        createdById: creator.id,
        candidateCount: 0,
        requiresQualityReview: input.requiresQualityReview,
        status: "DRAFT",
        approvalRound: 1,
      },
      select: {
        id: true,
        batchNumber: true,
        courseName: true,
        status: true,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new BatchServiceError("A batch with this batch number already exists", 409);
    }
    throw error;
  }
}
