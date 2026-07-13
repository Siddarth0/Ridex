import type { NextFunction, Request, Response } from "express";
import { z, ZodError } from "zod";
import type { ApiError } from "@ridex/shared";
import { logger } from "../lib/logger.js";
import { isProd } from "../config/env.js";

/** Operational error with a stable machine-readable code. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function notFound(req: Request, res: Response): void {
  const body: ApiError = {
    success: false,
    error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.path} not found` },
  };
  res.status(404).json(body);
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // Express identifies error middleware by arity — the 4th param must exist.
  _next: NextFunction,
): void {
  // Zod errors thrown from query/param parsing are client errors
  if (err instanceof ZodError) {
    const body: ApiError = {
      success: false,
      error: { code: "VALIDATION", message: "Validation failed", details: z.treeifyError(err) },
    };
    res.status(400).json(body);
    return;
  }

  if (err instanceof AppError) {
    const body: ApiError = {
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  logger.error({ err, path: req.path }, "Unhandled error");
  const body: ApiError = {
    success: false,
    error: {
      code: "INTERNAL",
      message: isProd ? "Something went wrong" : err instanceof Error ? err.message : String(err),
    },
  };
  res.status(500).json(body);
}
