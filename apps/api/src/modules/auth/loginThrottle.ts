import { AppError } from "../../middleware/errorHandler.js";

/**
 * Per-account login backoff. After a burst of wrong passwords an account is
 * locked for a growing window, independent of the IP rate limiter (which caps
 * per-IP volume). In-memory is fine: the API runs single-instance on Render;
 * when a second instance is added this moves behind Redis (see PLAN §8).
 */
const FREE_ATTEMPTS = 5; // wrong tries before any lock kicks in
const BASE_LOCK_MS = 30_000; // first lock; doubles each further failure
const MAX_LOCK_MS = 15 * 60_000; // cap
const RESET_AFTER_MS = 15 * 60_000; // forget failures after this quiet period

interface Attempt {
  fails: number;
  lockedUntil: number;
  last: number;
}

export interface LoginThrottle {
  assertAllowed(key: string, now?: number): void;
  recordFailure(key: string, now?: number): void;
  recordSuccess(key: string): void;
}

export function createLoginThrottle(): LoginThrottle {
  const attempts = new Map<string, Attempt>();

  const norm = (key: string) => key.trim().toLowerCase();

  return {
    assertAllowed(rawKey, now = Date.now()) {
      const key = norm(rawKey);
      const a = attempts.get(key);
      if (!a) return;
      if (now - a.last > RESET_AFTER_MS) {
        attempts.delete(key);
        return;
      }
      if (a.lockedUntil > now) {
        const retryAfter = Math.ceil((a.lockedUntil - now) / 1000);
        throw new AppError(429, "TOO_MANY_ATTEMPTS", "Too many failed attempts, try again later", {
          retryAfter,
        });
      }
    },
    recordFailure(rawKey, now = Date.now()) {
      const key = norm(rawKey);
      const a = attempts.get(key) ?? { fails: 0, lockedUntil: 0, last: now };
      if (now - a.last > RESET_AFTER_MS) a.fails = 0;
      a.fails += 1;
      a.last = now;
      if (a.fails > FREE_ATTEMPTS) {
        const over = a.fails - FREE_ATTEMPTS;
        a.lockedUntil = now + Math.min(BASE_LOCK_MS * 2 ** (over - 1), MAX_LOCK_MS);
      }
      attempts.set(key, a);
    },
    recordSuccess(rawKey) {
      attempts.delete(norm(rawKey));
    },
  };
}
