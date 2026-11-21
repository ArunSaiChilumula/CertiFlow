import type { Request, Response } from "express";
import {
  BatchServiceError,
  BatchWorkflowError,
  CandidateUploadError,
  createBatch,
  getBatch,
  listBatches,
  recordDistrictApproval,
  recordQualityOrStateApproval,
  submitBatch,
  uploadCandidates,
} from "./batch.service.js";
import { parseCandidateCsv } from "./candidate-upload.validation.js";
import { validateCreateBatch, validateDistrictApproval, validateStageApproval } from "./batch.validation.js";

export async function createBatchController(req: Request, res: Response) {
  const validation = validateCreateBatch(req.body);
  if (!validation.success) {
    return res.status(400).json({ success: false, message: validation.message });
  }

  try {
    const batch = await createBatch(validation.data);
    return res.status(201).json({
      success: true,
      message: "Batch created successfully",
      data: batch,
    });
  } catch (error) {
    if (error instanceof BatchServiceError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }

    console.error("Batch creation failed:", error);
    return res.status(500).json({ success: false, message: "Failed to create batch" });
  }
}

export async function uploadCandidatesController(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "CSV file is required in the 'file' field" });
  }
  const batchId = req.params.batchId;
  if (typeof batchId !== "string" || !batchId.trim()) {
    return res.status(400).json({ success: false, message: "A valid batch ID is required" });
  }

  const parsed = parseCandidateCsv(req.file.buffer);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "CSV validation failed",
      errors: parsed.errors,
    });
  }

  try {
    const data = await uploadCandidates(batchId, parsed.candidates);
    return res.status(201).json({
      success: true,
      message: "Candidates uploaded successfully",
      data,
    });
  } catch (error) {
    if (error instanceof CandidateUploadError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        ...(error.errors ? { errors: error.errors } : {}),
      });
    }

    console.error("Candidate upload failed:", error);
    return res.status(500).json({ success: false, message: "Failed to upload candidates" });
  }
}

function getBatchId(req: Request, res: Response): string | null {
  const batchId = req.params.batchId;
  if (typeof batchId !== "string" || !batchId.trim()) {
    res.status(400).json({ success: false, message: "A valid batch ID is required" });
    return null;
  }
  return batchId.trim();
}

export async function submitBatchController(req: Request, res: Response) {
  const batchId = getBatchId(req, res);
  if (!batchId) return;

  try {
    const data = await submitBatch(batchId);
    return res.status(200).json({ success: true, message: "Batch submitted successfully", data });
  } catch (error) {
    if (error instanceof BatchWorkflowError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error("Batch submission failed:", error);
    return res.status(500).json({ success: false, message: "Failed to submit batch" });
  }
}

export async function districtApprovalController(req: Request, res: Response) {
  const batchId = getBatchId(req, res);
  if (!batchId) return;

  const validation = validateDistrictApproval(req.body);
  if (!validation.success) {
    return res.status(400).json({ success: false, message: validation.message });
  }

  try {
    const data = await recordDistrictApproval(batchId, validation.data);
    const message = data.decision === "APPROVED"
      ? "District approval recorded successfully"
      : `Batch ${data.status.toLowerCase()} by district officer`;
    return res.status(200).json({ success: true, message, data });
  } catch (error) {
    if (error instanceof BatchWorkflowError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error("District decision failed:", error);
    return res.status(500).json({ success: false, message: "Failed to record district decision" });
  }
}

export function stageApprovalController(stage: "QUALITY" | "STATE") {
  return async (req: Request, res: Response) => {
    const batchId = getBatchId(req, res);
    if (!batchId) return;
    const validation = validateStageApproval(req.body);
    if (!validation.success) return res.status(400).json({ success: false, message: validation.message });
    if (stage === "STATE" && validation.data.decision === "RETURNED") {
      return res.status(400).json({ success: false, message: "State decisions must be APPROVED or REJECTED" });
    }
    try {
      const data = await recordQualityOrStateApproval(batchId, stage, validation.data);
      const message = stage === "STATE" && data.status === "APPROVED"
        ? `Final approval recorded and ${data.certificateCount} certificates generated`
        : `${stage === "QUALITY" ? "Quality" : "State"} decision recorded successfully`;
      return res.status(200).json({ success: true, message, data });
    } catch (error) {
      if (error instanceof BatchWorkflowError) return res.status(error.statusCode).json({ success: false, message: error.message });
      console.error(`${stage} decision failed:`, error);
      return res.status(500).json({ success: false, message: `Failed to record ${stage.toLowerCase()} decision` });
    }
  };
}

export async function listBatchesController(req: Request, res: Response) {
  const trainingCentreId = req.query.trainingCentreId;
  const status = req.query.status;
  const filters: { trainingCentreId?: string; status?: "DISTRICT_REVIEW" | "QUALITY_REVIEW" | "STATE_REVIEW" } = {};
  if (typeof trainingCentreId === "string" && trainingCentreId.trim()) {
    filters.trainingCentreId = trainingCentreId.trim();
  } else if (status === "DISTRICT_REVIEW" || status === "QUALITY_REVIEW" || status === "STATE_REVIEW") {
    filters.status = status;
  } else {
    return res.status(400).json({ success: false, message: "Provide trainingCentreId or a supported review status" });
  }

  try {
    const data = await listBatches(filters);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Batch list request failed:", error);
    return res.status(500).json({ success: false, message: "Failed to load batches" });
  }
}

export async function getBatchController(req: Request, res: Response) {
  const batchId = getBatchId(req, res);
  if (!batchId) return;

  try {
    const data = await getBatch(batchId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    if (error instanceof BatchServiceError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error("Batch details request failed:", error);
    return res.status(500).json({ success: false, message: "Failed to load batch" });
  }
}
