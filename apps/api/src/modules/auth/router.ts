import { Router, type Request } from "express";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
} from "@ridex/shared";
import type { Db } from "../../db/index.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { AppError } from "../../middleware/errorHandler.js";
import { clearAuthCookies, setAuthCookies } from "./cookies.js";
import { createLoginThrottle } from "./loginThrottle.js";
import {
  forgotPassword,
  login,
  register,
  resendVerification,
  resetPassword,
  revokeRefreshToken,
  rotateRefreshToken,
  toPublicUser,
  verifyEmail,
} from "./service.js";

function requestMeta(req: Request) {
  return { userAgent: req.headers["user-agent"], ip: req.ip };
}

function refreshTokenFrom(req: Request): string | null {
  return (req.cookies as Record<string, string> | undefined)?.refresh_token ?? null;
}

export function authRouter(db: Db): Router {
  const router = Router();
  const loginThrottle = createLoginThrottle();

  router.post("/register", validate(registerSchema), async (req, res) => {
    const user = await register(db, req.body);
    res.status(201).json({
      success: true,
      data: { user, message: "Account created. Check your email to verify your account." },
    });
  });

  router.get("/verify-email/:token", async (req, res) => {
    await verifyEmail(db, req.params.token);
    res.json({ success: true, data: { message: "Email verified successfully" } });
  });

  router.post("/resend-verification", validate(resendVerificationSchema), async (req, res) => {
    await resendVerification(db, req.body.email);
    res.json({ success: true, data: { message: "If that account exists, a new link has been sent" } });
  });

  router.post("/login", validate(loginSchema), async (req, res) => {
    const email = req.body.email as string;
    loginThrottle.assertAllowed(email);
    try {
      const { user, tokens } = await login(db, email, req.body.password, requestMeta(req));
      loginThrottle.recordSuccess(email);
      setAuthCookies(res, tokens);
      res.json({ success: true, data: { user, accessToken: tokens.accessToken } });
    } catch (err) {
      if (err instanceof AppError && err.code === "INVALID_CREDENTIALS") {
        loginThrottle.recordFailure(email);
      }
      throw err;
    }
  });

  router.post("/refresh", async (req, res) => {
    const token = refreshTokenFrom(req);
    if (!token) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHENTICATED", message: "No refresh token" },
      });
      return;
    }
    const { user, tokens } = await rotateRefreshToken(db, token, requestMeta(req));
    setAuthCookies(res, tokens);
    res.json({ success: true, data: { user, accessToken: tokens.accessToken } });
  });

  router.post("/logout", async (req, res) => {
    const token = refreshTokenFrom(req);
    if (token) await revokeRefreshToken(db, token);
    clearAuthCookies(res);
    res.json({ success: true, data: { message: "Logged out" } });
  });

  router.post("/forgot-password", validate(forgotPasswordSchema), async (req, res) => {
    await forgotPassword(db, req.body.email);
    res.json({ success: true, data: { message: "If that account exists, a reset link has been sent" } });
  });

  router.post("/reset-password", validate(resetPasswordSchema), async (req, res) => {
    await resetPassword(db, req.body.token, req.body.password);
    res.json({ success: true, data: { message: "Password updated. You can now log in." } });
  });

  router.get("/me", requireAuth(db), (req, res) => {
    res.json({ success: true, data: { user: toPublicUser(req.user!) } });
  });

  return router;
}
