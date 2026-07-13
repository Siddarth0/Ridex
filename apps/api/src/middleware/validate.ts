import type { NextFunction, Request, Response } from "express";
import { z, type ZodType } from "zod";
import { AppError } from "./errorHandler.js";

/** Validates req.body against a Zod schema and replaces it with the parsed value. */
export function validate<T extends ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new AppError(400, "VALIDATION", "Validation failed", z.treeifyError(result.error));
    }
    req.body = result.data;
    next();
  };
}
