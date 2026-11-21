const requiredFields = [
    "batchNumber",
    "courseName",
    "trainingCentreId",
    "createdById",
];
export function validateCreateBatch(body) {
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
        return { success: false, message: "Request body must be a JSON object" };
    }
    const values = body;
    const data = {};
    for (const field of requiredFields) {
        const value = values[field];
        if (typeof value !== "string") {
            return { success: false, message: `${field} is required and must be a string` };
        }
        const trimmed = value.trim();
        if (!trimmed) {
            return { success: false, message: `${field} must not be empty` };
        }
        data[field] = trimmed;
    }
    if (values.requiresQualityReview !== undefined && typeof values.requiresQualityReview !== "boolean") {
        return { success: false, message: "requiresQualityReview must be a boolean when provided" };
    }
    data.requiresQualityReview = values.requiresQualityReview === true;
    return { success: true, data };
}
export function validateDistrictApproval(body) {
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
        return { success: false, message: "Request body must be a JSON object" };
    }
    const values = body;
    if (typeof values.userId !== "string" || !values.userId.trim()) {
        return { success: false, message: "userId is required and must be a non-empty string" };
    }
    if (values.decision !== "APPROVED" && values.decision !== "REJECTED" && values.decision !== "RETURNED") {
        return { success: false, message: "decision must be APPROVED, REJECTED, or RETURNED" };
    }
    if (values.comments !== undefined && values.comments !== null && typeof values.comments !== "string") {
        return { success: false, message: "comments must be a string when provided" };
    }
    const comments = typeof values.comments === "string" ? values.comments.trim() || null : null;
    return {
        success: true,
        data: { userId: values.userId.trim(), decision: values.decision, comments },
    };
}
export function validateStageApproval(body) {
    return validateDistrictApproval(body);
}
