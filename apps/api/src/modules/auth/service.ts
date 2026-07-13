import { and, eq, isNull } from "drizzle-orm";
import type { PublicUser, RegisterInput } from "@ridex/shared";
import type { Db, DbConn } from "../../db/index.js";
import { refreshTokens, users, userTokens } from "../../db/schema/index.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import {
  generateOpaqueToken,
  hashToken,
  REFRESH_TOKEN_TTL_MS,
  signAccessToken,
} from "../../lib/tokens.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../../lib/email.js";
import { AppError } from "../../middleware/errorHandler.js";

type UserRow = typeof users.$inferSelect;

const EMAIL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    emailVerified: user.emailVerifiedAt !== null,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function createUser(db: DbConn, input: RegisterInput, role: "rider" | "driver" = "rider"): Promise<UserRow> {
  const [byEmail] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
  if (byEmail) throw new AppError(409, "EMAIL_TAKEN", "An account with this email already exists");

  const [byPhone] = await db.select({ id: users.id }).from(users).where(eq(users.phone, input.phone)).limit(1);
  if (byPhone) throw new AppError(409, "PHONE_TAKEN", "An account with this phone number already exists");

  const passwordHash = await hashPassword(input.password);
  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      phone: input.phone,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role,
    })
    .returning();
  if (!user) throw new AppError(500, "INTERNAL", "Failed to create user");
  return user;
}

export async function issueEmailVerification(db: Db, user: UserRow): Promise<void> {
  const { token, hash } = generateOpaqueToken();
  await db.insert(userTokens).values({
    userId: user.id,
    tokenHash: hash,
    purpose: "email_verification",
    expiresAt: new Date(Date.now() + EMAIL_TOKEN_TTL_MS),
  });
  await sendVerificationEmail(user.email, user.firstName, token);
}

export async function register(db: Db, input: RegisterInput): Promise<PublicUser> {
  const user = await createUser(db, input);
  await issueEmailVerification(db, user);
  return toPublicUser(user);
}

export async function verifyEmail(db: Db, token: string): Promise<void> {
  const [row] = await db
    .select()
    .from(userTokens)
    .where(
      and(
        eq(userTokens.tokenHash, hashToken(token)),
        eq(userTokens.purpose, "email_verification"),
        isNull(userTokens.usedAt),
      ),
    )
    .limit(1);

  if (!row || row.expiresAt < new Date()) {
    throw new AppError(400, "INVALID_TOKEN", "Verification link is invalid or has expired");
  }

  await db.update(userTokens).set({ usedAt: new Date() }).where(eq(userTokens.id, row.id));
  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, row.userId));
}

export async function resendVerification(db: Db, email: string): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  // Don't reveal whether the email exists
  if (!user || user.emailVerifiedAt) return;
  await issueEmailVerification(db, user);
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export async function issueSession(
  db: Db,
  user: UserRow,
  meta: { userAgent?: string; ip?: string },
): Promise<SessionTokens> {
  const accessToken = await signAccessToken({ userId: user.id, role: user.role });
  const { token: refreshToken, hash } = generateOpaqueToken();
  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hash,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    userAgent: meta.userAgent,
    ip: meta.ip,
  });
  return { accessToken, refreshToken };
}

export async function login(
  db: Db,
  email: string,
  password: string,
  meta: { userAgent?: string; ip?: string },
): Promise<{ user: PublicUser; tokens: SessionTokens }> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }
  if (!user.isActive) throw new AppError(403, "ACCOUNT_DISABLED", "This account has been deactivated");
  if (!user.emailVerifiedAt) {
    throw new AppError(403, "EMAIL_NOT_VERIFIED", "Please verify your email before logging in");
  }

  const tokens = await issueSession(db, user, meta);
  return { user: toPublicUser(user), tokens };
}

export async function rotateRefreshToken(
  db: Db,
  token: string,
  meta: { userAgent?: string; ip?: string },
): Promise<{ user: PublicUser; tokens: SessionTokens }> {
  const [row] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, hashToken(token)))
    .limit(1);

  if (!row) throw new AppError(401, "INVALID_TOKEN", "Invalid refresh token");

  // Reuse of a rotated/revoked token means the token may be stolen — kill the whole family.
  if (row.revokedAt || row.replacedBy) {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, row.userId), isNull(refreshTokens.revokedAt)));
    throw new AppError(401, "TOKEN_REUSED", "Session invalidated, please log in again");
  }

  if (row.expiresAt < new Date()) throw new AppError(401, "TOKEN_EXPIRED", "Session expired");

  const [user] = await db.select().from(users).where(eq(users.id, row.userId)).limit(1);
  if (!user || !user.isActive) throw new AppError(401, "UNAUTHENTICATED", "Account not found or deactivated");

  const tokens = await issueSession(db, user, meta);
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date(), replacedBy: row.id })
    .where(eq(refreshTokens.id, row.id));

  return { user: toPublicUser(user), tokens };
}

export async function revokeRefreshToken(db: Db, token: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.tokenHash, hashToken(token)));
}

export async function forgotPassword(db: Db, email: string): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  // Don't reveal whether the email exists
  if (!user) return;

  const { token, hash } = generateOpaqueToken();
  await db.insert(userTokens).values({
    userId: user.id,
    tokenHash: hash,
    purpose: "password_reset",
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });
  await sendPasswordResetEmail(user.email, user.firstName, token);
}

export async function resetPassword(db: Db, token: string, password: string): Promise<void> {
  const [row] = await db
    .select()
    .from(userTokens)
    .where(
      and(
        eq(userTokens.tokenHash, hashToken(token)),
        eq(userTokens.purpose, "password_reset"),
        isNull(userTokens.usedAt),
      ),
    )
    .limit(1);

  if (!row || row.expiresAt < new Date()) {
    throw new AppError(400, "INVALID_TOKEN", "Reset link is invalid or has expired");
  }

  const passwordHash = await hashPassword(password);
  await db.update(userTokens).set({ usedAt: new Date() }).where(eq(userTokens.id, row.id));
  await db.update(users).set({ passwordHash }).where(eq(users.id, row.userId));
  // Changing the password logs out every existing session
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, row.userId), isNull(refreshTokens.revokedAt)));
}
