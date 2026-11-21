-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('TRAINING_CENTRE', 'DISTRICT_OFFICER', 'QUALITY_OFFICER', 'STATE_OFFICER');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'DISTRICT_REVIEW', 'QUALITY_REVIEW', 'STATE_REVIEW', 'RETURNED', 'REJECTED', 'APPROVED', 'ISSUED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalStage" AS ENUM ('DISTRICT', 'QUALITY', 'STATE');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REJECTED', 'RETURNED');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('VALID', 'REVOKED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "trainingCentreId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingCentre" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingCentre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'DRAFT',
    "candidateCount" INTEGER NOT NULL DEFAULT 0,
    "requiresQualityReview" BOOLEAN NOT NULL DEFAULT false,
    "approvalRound" INTEGER NOT NULL DEFAULT 1,
    "returnReason" TEXT,
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "trainingCentreId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "candidateCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "batchId" TEXT NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "stage" "ApprovalStage" NOT NULL,
    "decision" "ApprovalDecision" NOT NULL,
    "comments" TEXT,
    "round" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "batchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "status" "CertificateStatus" NOT NULL DEFAULT 'VALID',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "pdfPath" TEXT,
    "candidateId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "recipientPhone" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "candidateId" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "batchId" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingCentre_code_key" ON "TrainingCentre"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_batchNumber_key" ON "Batch"("batchNumber");

-- CreateIndex
CREATE INDEX "Batch_status_idx" ON "Batch"("status");

-- CreateIndex
CREATE INDEX "Batch_trainingCentreId_idx" ON "Batch"("trainingCentreId");

-- CreateIndex
CREATE INDEX "Batch_createdAt_idx" ON "Batch"("createdAt");

-- CreateIndex
CREATE INDEX "Candidate_batchId_idx" ON "Candidate"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_batchId_phone_key" ON "Candidate"("batchId", "phone");

-- CreateIndex
CREATE INDEX "Approval_batchId_round_stage_idx" ON "Approval"("batchId", "round", "stage");

-- CreateIndex
CREATE INDEX "Approval_userId_idx" ON "Approval"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Approval_batchId_round_stage_userId_key" ON "Approval"("batchId", "round", "stage", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_certificateNumber_key" ON "Certificate"("certificateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_candidateId_key" ON "Certificate"("candidateId");

-- CreateIndex
CREATE INDEX "Certificate_batchId_idx" ON "Certificate"("batchId");

-- CreateIndex
CREATE INDEX "Certificate_status_idx" ON "Certificate"("status");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");

-- CreateIndex
CREATE INDEX "Notification_certificateId_idx" ON "Notification"("certificateId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_batchId_idx" ON "AuditLog"("batchId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_trainingCentreId_fkey" FOREIGN KEY ("trainingCentreId") REFERENCES "TrainingCentre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_trainingCentreId_fkey" FOREIGN KEY ("trainingCentreId") REFERENCES "TrainingCentre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
