import multer from "multer";
import { extname } from "node:path";
const acceptedMimeTypes = new Set([
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
]);
const uploadSingleCsv = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, callback) => {
        if (extname(file.originalname).toLowerCase() !== ".csv" || !acceptedMimeTypes.has(file.mimetype.toLowerCase())) {
            callback(new Error("Only CSV files are accepted"));
            return;
        }
        callback(null, true);
    },
}).single("file");
export const candidateCsvUploadMiddleware = (req, res, next) => {
    uploadSingleCsv(req, res, (error) => {
        if (!error) {
            next();
            return;
        }
        if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
            res.status(413).json({ success: false, message: "CSV file must be no larger than 2 MB" });
            return;
        }
        const message = error instanceof Error ? error.message : "Invalid file upload";
        res.status(400).json({ success: false, message });
    });
};
