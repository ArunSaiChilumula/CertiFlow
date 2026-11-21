import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import app from "../dist/app.js";
import prisma from "../dist/lib/prisma.js";

let server;
let baseUrl;
let centre;
let creator;
let qualityOfficer;
let stateOfficer;
const batchIds = [];
const userIds = [];

before(async () => {
  centre = await prisma.trainingCentre.create({ data: { name: "Stage Approval Test Centre", code: `SAT-${crypto.randomUUID()}` } });
  creator = await prisma.user.create({ data: { name: "Stage Test Creator", email: `creator-${crypto.randomUUID()}@certiflow.test`, passwordHash: "TEST_ONLY", role: "TRAINING_CENTRE", trainingCentreId: centre.id } });
  qualityOfficer = await prisma.user.create({ data: { name: "Stage Test Quality Officer", email: `quality-${crypto.randomUUID()}@certiflow.test`, passwordHash: "TEST_ONLY", role: "QUALITY_OFFICER" } });
  stateOfficer = await prisma.user.create({ data: { name: "Stage Test State Officer", email: `state-${crypto.randomUUID()}@certiflow.test`, passwordHash: "TEST_ONLY", role: "STATE_OFFICER" } });
  userIds.push(creator.id, qualityOfficer.id, stateOfficer.id);
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  baseUrl = `http://127.0.0.1:${server.address().port}/api/batches`;
});

after(async () => {
  if (batchIds.length) {
    await prisma.auditLog.deleteMany({ where: { batchId: { in: batchIds } } });
    await prisma.approval.deleteMany({ where: { batchId: { in: batchIds } } });
    const candidates = await prisma.candidate.findMany({ where: { batchId: { in: batchIds } }, select: { id: true } });
    await prisma.certificate.deleteMany({ where: { candidateId: { in: candidates.map((candidate) => candidate.id) } } });
    await prisma.candidate.deleteMany({ where: { batchId: { in: batchIds } } });
    await prisma.batch.deleteMany({ where: { id: { in: batchIds } } });
  }
  if (userIds.length) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  if (centre) await prisma.trainingCentre.delete({ where: { id: centre.id } });
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await prisma.$disconnect();
});

async function createBatch(status) {
  const batch = await prisma.batch.create({ data: {
    batchNumber: `STAGE-${crypto.randomUUID()}`, courseName: "Stage Approval Test", status,
    trainingCentreId: centre.id, createdById: creator.id,
    candidates: { create: { fullName: "Test Candidate", phone: `9${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`, candidateCode: "STAGE-CANDIDATE" } },
    candidateCount: 1,
  } });
  batchIds.push(batch.id);
  return batch;
}

async function decide(batch, stage, user, decision = "APPROVED") {
  return fetch(`${baseUrl}/${batch.id}/approvals/${stage}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: user.id, decision, comments: "Stage test review" }),
  });
}

test("quality approval advances to state review and quality return remains supported", async () => {
  const approved = await createBatch("QUALITY_REVIEW");
  const response = await decide(approved, "quality", qualityOfficer);
  assert.equal(response.status, 200, JSON.stringify(await response.clone().json()));
  assert.equal((await response.json()).data.status, "STATE_REVIEW");
  assert.equal((await prisma.batch.findUnique({ where: { id: approved.id } })).status, "STATE_REVIEW");

  const returned = await createBatch("QUALITY_REVIEW");
  const returnResponse = await decide(returned, "quality", qualityOfficer, "RETURNED");
  assert.equal(returnResponse.status, 200);
  assert.equal((await prisma.batch.findUnique({ where: { id: returned.id } })).status, "RETURNED");
});

test("state final approval generates candidate certificates and rejection is recorded", async () => {
  const approved = await createBatch("STATE_REVIEW");
  const response = await decide(approved, "state", stateOfficer);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.certificateCount, 1);
  const stored = await prisma.batch.findUnique({ where: { id: approved.id } });
  assert.equal(stored.status, "APPROVED");
  assert.ok(stored.approvedAt);
  assert.equal(await prisma.certificate.count({ where: { batchId: approved.id } }), 1);
  assert.equal(await prisma.auditLog.count({ where: { batchId: approved.id, action: "BATCH_STAGE_TRANSITIONED" } }), 1);

  const rejected = await createBatch("STATE_REVIEW");
  const rejectResponse = await decide(rejected, "state", stateOfficer, "REJECTED");
  assert.equal(rejectResponse.status, 200);
  assert.equal((await prisma.batch.findUnique({ where: { id: rejected.id } })).status, "REJECTED");
});

test("stage role checks reject a wrong officer and state return decisions", async () => {
  const qualityBatch = await createBatch("QUALITY_REVIEW");
  const wrongOfficer = await decide(qualityBatch, "quality", stateOfficer);
  assert.equal(wrongOfficer.status, 403);
  const stateBatch = await createBatch("STATE_REVIEW");
  const unsupportedReturn = await decide(stateBatch, "state", stateOfficer, "RETURNED");
  assert.equal(unsupportedReturn.status, 400);
});
