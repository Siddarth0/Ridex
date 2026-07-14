import rateLimit, { type Options } from "express-rate-limit";
import { env } from "../config/env.js";

/**
 * IP-based rate limits. The login route additionally has per-account backoff
 * (see auth/loginThrottle.ts). Disabled under test so integration suites can
 * hammer the auth endpoints deterministically.
 */
function makeLimiter(opts: Partial<Options>) {
  return rateLimit({
    windowMs: 60_000,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: () => env.NODE_ENV === "test",
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: { code: "RATE_LIMITED", message: "Too many requests, please slow down" },
      });
    },
    ...opts,
  });
}

/** Broad safety net on every request. */
export const globalLimiter = makeLimiter({ limit: 300 });

/** Credential endpoints (login/register/forgot/reset) — tighter. */
export const authLimiter = makeLimiter({ limit: 10 });

/** Token refresh happens more often than login but is still cheap to abuse. */
export const refreshLimiter = makeLimiter({ limit: 30 });
