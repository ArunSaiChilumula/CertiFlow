export interface CreateBatchInput {
  batchNumber: string;
  courseName: string;
  trainingCentreId: string;
  createdById: string;
}

export type DistrictDecision = "APPROVED" | "REJECTED" | "RETURNED";

export interface DistrictApprovalInput {
  userId: string;
  decision: DistrictDecision;
  comments: string | null;
}

export type ValidationResult =
  | { success: true; data: CreateBatchInput }
  | { success: false; message: string };

const requiredFields: (keyof CreateBatchInput)[] = [
  "batchNumber",
  "courseName",
  "trainingCentreId",
  "createdById",
];

export function validateCreateBatch(body: unknown): ValidationResult {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { success: false, message: "Request body must be a JSON object" };
  }

  const values = body as Record<string, unknown>;
  const data = {} as CreateBatchInput;

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

  return { success: true, data };
}

export type DistrictApprovalValidationResult =
  | { success: true; data: DistrictApprovalInput }
  | { success: false; message: string };

export function validateDistrictApproval(body: unknown): DistrictApprovalValidationResult {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { success: false, message: "Request body must be a JSON object" };
  }

  const values = body as Record<string, unknown>;
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
