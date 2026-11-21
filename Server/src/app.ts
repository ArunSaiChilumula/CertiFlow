import express from "express";
import cors from "cors";
import prisma from "./lib/prisma.js";
import batchRouter from "./modules/batch/batch.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/batches", batchRouter);

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "CertiFlow API is running",
  });
});

app.get("/api/db-health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      message: "PostgreSQL connection is working",
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

export default app;
