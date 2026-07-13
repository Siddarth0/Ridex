import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

let transporter: Transporter | null = null;

if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
}

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!transporter) {
    // Dev fallback: surface the mail in the console so flows stay testable
    logger.info({ to, subject, html }, "email (no SMTP configured, logging instead)");
    return;
  }
  await transporter.sendMail({
    from: env.SMTP_FROM ?? env.SMTP_USER,
    to,
    subject,
    html,
  });
}

export function sendVerificationEmail(to: string, firstName: string, token: string) {
  const url = `${env.FRONTEND_URL}/verify-email?token=${token}`;
  return send(
    to,
    "Verify your RideX email",
    `<p>Hi ${firstName},</p>
     <p>Welcome to RideX! Confirm your email to activate your account:</p>
     <p><a href="${url}">${url}</a></p>
     <p>This link expires in 24 hours.</p>`,
  );
}

export function sendPasswordResetEmail(to: string, firstName: string, token: string) {
  const url = `${env.FRONTEND_URL}/reset-password?token=${token}`;
  return send(
    to,
    "Reset your RideX password",
    `<p>Hi ${firstName},</p>
     <p>We received a request to reset your password:</p>
     <p><a href="${url}">${url}</a></p>
     <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
  );
}
