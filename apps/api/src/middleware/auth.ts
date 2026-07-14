import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@ridex/shared";
import { eq } from "drizzle-orm";
import type { Db } from "../db/index.js";
import { users } from "../db/schema/index.js";
import { verifyAccessToken } from "../lib/tokens.js";
import { AppError } from "./errorHandler.js";

export type AuthedUser = typeof users.$inferSelect;

declare global {
  namespace Express {
    interface Request {
      user?: AuthedUser;
      /** Correlation id set in app.ts and echoed as the x-request-id header. */
      id?: string;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  const cookie = (req.cookies as Record<string, string> | undefined)?.access_token;
  return cookie ?? null;
}

export function requireAuth(db: Db) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) throw new AppError(401, "UNAUTHENTICATED", "Authentication required");

    let userId: string;
    try {
      ({ userId } = await verifyAccessToken(token));
    } catch {
      throw new AppError(401, "INVALID_TOKEN", "Invalid or expired token");
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user || !user.isActive) {
      throw new AppError(401, "UNAUTHENTICATED", "Account not found or deactivated");
    }

    req.user = user;
    next();
  };
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, "FORBIDDEN", "You do not have access to this resource");
    }
    next();
  };
}
