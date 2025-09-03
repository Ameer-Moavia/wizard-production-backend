// src/middlewares/error.middleware.ts
import { NextFunction, Request, Response } from "express";
import multer from "multer";

export function errorMiddleware(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);

  if (res.headersSent) return;

  // ✅ Handle Multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large. Max size is 5MB" });
    }
    return res.status(400).json({ error: err.message });
  }

  // ✅ Generic errors
  res.status(err?.status || 500).json({ error: err?.message || "Server error" });
}
