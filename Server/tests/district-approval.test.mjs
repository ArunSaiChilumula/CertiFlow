import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import app from "../dist/app.js";
import prisma from "../dist/lib/prisma.js";

let server;
let baseUrl;
let centre;
let creator;
let officers;
const testBatchIds = [];
const testUserIds = [];

before(async () => {
  centre = await prisma.trainingCentre.create({
    data: { name: "District Approval Test Centre", code: `DAT-${crypto.randomUUID()}` },
  });
  creator = await prisma.user.create({
    data: {
      name: "District Approval Test Creator",
      email: `creator-${crypto.randomUUID()}@certiflow.test`,
      passwordHash: "TEST_ONLY_NO_AUTH",
      role: "TRAINING_CENTRE",
      trainingCentreId: centre.id,
    },
  });
  testUserIds.push(creator.id);
  officers = await Promise.all([1, 2, 3].map(async (number) => {
    const user = await prisma.user.create({
      data: {
        name: `District Approval Test Officer ${number}`,
        email: `officer-${number}-${crypto.randomUUID()}@certiflow.test`,
        passwordHash: "TEST_ONLY_NO_AUTH",
        role: "DISTRICT_OFFICER",
      },
    });
    testUserIds.push(user.id);
    return user;
  }));

  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/api/batches`;
});

after(async () => {
  if (testBatchIds.length > 0) {
    await prisma.auditLog.deleteMany({ where: { batchId: { in: testBatchIds } } });
    await prisma.approval.deleteMany({ where: { batchId: { in: testBatchIds } } });
    await prisma.candidate.deleteMany({ where: { batchId: { in: testBatchIds } } });
    await prisma.batch.deleteMany({ where: { id: { in: testBatchIds } } });
  }
  if (testUserIds.length > 0) await prisma.user.deleteMany({ where: { id: { in: testUserIds } } });
  if (centre) await prisma.trainingCentre.delete({ where: { id: centre.id } });
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await prisma.$disconnect();
});

async function createBatch({ requiresQualityReview = false, withCandidate = true } = {}) {
  const batch = await prisma.batch.create({
    data: {
      batchNumber: `TEST-${crypto.randomUUID()}`,
      courseName: "District Approval Test",
      trainingCentreId: centre.id,
      createdById: creator.id,
      requiresQualityReview,
      ...(withCandidate ? {
        candidates: { create: { fullName: "Test Candidate", phone: `9${crypto.randomUUID().replaceAll("-", "").slice(0, 9)}` } },
      } : {}),
    },
  });
  testBatchIds.push(batch.id);
  return batch;
}

async function post(path, body) {
  const response = await fetch(`${baseUrl}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() };
}

async function submit(batchId) {
  const response = await post(`${batchId}/submit`);
  assert.equal(response.status, 200);
}

async function approve(batchId, userId, decision = "APPROVED") {
  return post(`${batchId}/approvals/district`, { userId, decision, comments: "Test decision" });
}

test("first approval stays in district review; second distinct approval advances and duplicate is rejected", async () => {
  const batch = await createBatch();
  await submit(batch.id);

  const first = await approve(batch.id, officers[0].id);
  assert.equal(first.status, 200);
  assert.equal(first.body.data.status, "DISTRICT_REVIEW");
  assert.equal(first.body.data.districtApprovalCount, 1);

  const duplicate = await approve(batch.id, officers[0].id);
  assert.equal(duplicate.status, 409);

  const second = await approve(batch.id, officers[1].id);
  assert.equal(second.status, 200);
  assert.equal(second.body.data.status, "STATE_REVIEW");
  assert.equal(second.body.data.districtApprovalCount, 2);
  assert.equal((await prisma.batch.findUniqueOrThrow({ where: { id: batch.id } })).status, "STATE_REVIEW");

  const transitionAudit = await prisma.auditLog.findFirst({
    where: { batchId: batch.id, action: "BATCH_STAGE_TRANSITIONED" },
  });
  assert.ok(transitionAudit);
  assert.equal(transitionAudit.details.toStatus, "STATE_REVIEW");
});

test("second distinct approval advances to quality review when required", async () => {
  const batch = await createBatch({ requiresQualityReview: true });
  await submit(batch.id);
  assert.equal((await approve(batch.id, officers[0].id)).body.data.status, "DISTRICT_REVIEW");
  const second = await approve(batch.id, officers[1].id);
  assert.equal(second.status, 200);
  assert.equal(second.body.data.status, "QUALITY_REVIEW");
});

test("only distinct APPROVED decisions count toward the threshold", async () => {
  const batch = await createBatch();
  await submit(batch.id);
  await prisma.approval.create({
    data: {
      batchId: batch.id,
      userId: officers[0].id,
      stage: "DISTRICT",
      decision: "REJECTED",
      round: batch.approvalRound,
      comments: "Fixture to verify rejected decisions do not count",
    },
  });

  const firstApproved = await approve(batch.id, officers[1].id);
  assert.equal(firstApproved.body.data.status, "DISTRICT_REVIEW");
  assert.equal(firstApproved.body.data.districtApprovalCount, 1);
  const secondApproved = await approve(batch.id, officers[2].id);
  assert.equal(secondApproved.body.data.status, "STATE_REVIEW");
  assert.equal(secondApproved.body.data.districtApprovalCount, 2);
});

test("rejected and returned decisions keep their existing terminal behavior", async () => {
  const rejectedBatch = await createBatch();
  await submit(rejectedBatch.id);
  const rejected = await approve(rejectedBatch.id, officers[0].id, "REJECTED");
  assert.equal(rejected.status, 200);
  const rejectedState = await prisma.batch.findUniqueOrThrow({ where: { id: rejectedBatch.id } });
  assert.equal(rejectedState.status, "REJECTED");
  assert.equal(rejectedState.rejectionReason, "Test decision");

  const returnedBatch = await createBatch();
  await submit(returnedBatch.id);
  const returned = await approve(returnedBatch.id, officers[0].id, "RETURNED");
  assert.equal(returned.status, 200);
  const returnedState = await prisma.batch.findUniqueOrThrow({ where: { id: returnedBatch.id } });
  assert.equal(returnedState.status, "RETURNED");
  assert.equal(returnedState.returnReason, "Test decision");
});

test("simultaneous distinct approvals finish with the correct state and transition audit", async () => {
  const batch = await createBatch();
  await submit(batch.id);
  const results = await Promise.all([
    approve(batch.id, officers[0].id),
    approve(batch.id, officers[1].id),
  ]);
  assert.ok(results.every((result) => result.status === 200 || result.status === 409));

  let approved = await prisma.approval.findMany({
    where: { batchId: batch.id, round: batch.approvalRound, stage: "DISTRICT", decision: "APPROVED" },
    distinct: ["userId"],
    select: { userId: true },
  });
  if (approved.length === 1) {
    const remainingOfficer = officers.find((officer) => officer.id !== approved[0].userId);
    const retry = await approve(batch.id, remainingOfficer.id);
    assert.equal(retry.status, 200);
    approved = await prisma.approval.findMany({
      where: { batchId: batch.id, round: batch.approvalRound, stage: "DISTRICT", decision: "APPROVED" },
      distinct: ["userId"],
      select: { userId: true },
    });
  }

  assert.equal(approved.length, 2);
  assert.equal((await prisma.batch.findUniqueOrThrow({ where: { id: batch.id } })).status, "STATE_REVIEW");
  assert.equal(await prisma.auditLog.count({ where: { batchId: batch.id, action: "BATCH_STAGE_TRANSITIONED" } }), 1);
});
