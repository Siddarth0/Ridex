import type { Response } from "express";
import { isProd } from "../../config/env.js";
import type { SessionTokens } from "./service.js";

const ACCESS_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Refresh cookie is scoped to the auth endpoints so it never rides along on normal API calls. */
const REFRESH_PATH = "/api/auth";

export function setAuthCookies(res: Response, tokens: SessionTokens): void {
  const common = { httpOnly: true, secure: isProd, sameSite: "lax" as const };
  res.cookie("access_token", tokens.accessToken, { ...common, path: "/", maxAge: ACCESS_MAX_AGE_MS });
  res.cookie("refresh_token", tokens.refreshToken, {
    ...common,
    path: REFRESH_PATH,
    maxAge: REFRESH_MAX_AGE_MS,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie("access_token", { path: "/" });
  res.clearCookie("refresh_token", { path: REFRESH_PATH });
}
