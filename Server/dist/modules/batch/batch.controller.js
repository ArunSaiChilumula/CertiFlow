import { BatchServiceError, BatchWorkflowError, CandidateUploadError, createBatch, recordDistrictApproval, submitBatch, uploadCandidates, } from "./batch.service.js";
import { parseCandidateCsv } from "./candidate-upload.validation.js";
import { validateCreateBatch, validateDistrictApproval } from "./batch.validation.js";
export async function createBatchController(req, res) {
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
    }
    catch (error) {
        if (error instanceof BatchServiceError) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        console.error("Batch creation failed:", error);
        return res.status(500).json({ success: false, message: "Failed to create batch" });
    }
}
export async function uploadCandidatesController(req, res) {
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
    }
    catch (error) {
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
function getBatchId(req, res) {
    const batchId = req.params.batchId;
    if (typeof batchId !== "string" || !batchId.trim()) {
        res.status(400).json({ success: false, message: "A valid batch ID is required" });
        return null;
    }
    return batchId.trim();
}
export async function submitBatchController(req, res) {
    const batchId = getBatchId(req, res);
    if (!batchId)
        return;
    try {
        const data = await submitBatch(batchId);
        return res.status(200).json({ success: true, message: "Batch submitted successfully", data });
    }
    catch (error) {
        if (error instanceof BatchWorkflowError) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        console.error("Batch submission failed:", error);
        return res.status(500).json({ success: false, message: "Failed to submit batch" });
    }
}
export async function districtApprovalController(req, res) {
    const batchId = getBatchId(req, res);
    if (!batchId)
        return;
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
    }
    catch (error) {
        if (error instanceof BatchWorkflowError) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        console.error("District decision failed:", error);
        return res.status(500).json({ success: false, message: "Failed to record district decision" });
    }
}
