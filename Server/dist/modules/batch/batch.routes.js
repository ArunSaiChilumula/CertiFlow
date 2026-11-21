import { Router } from "express";
import { createBatchController, districtApprovalController, submitBatchController, uploadCandidatesController, } from "./batch.controller.js";
import { candidateCsvUploadMiddleware } from "./candidate-upload.middleware.js";
const batchRouter = Router();
batchRouter.post("/", createBatchController);
batchRouter.post("/:batchId/candidates/upload", candidateCsvUploadMiddleware, uploadCandidatesController);
batchRouter.post("/:batchId/submit", submitBatchController);
batchRouter.post("/:batchId/approvals/district", districtApprovalController);
export default batchRouter;
