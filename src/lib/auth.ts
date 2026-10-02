import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "gym_progress_session";
const SESSION_DAYS = 30;
const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function loginThrottleKey(email: string) {
  return createHash("sha256").update(`login:${email}`).digest("hex");
}

export async function getLoginThrottle(email: string) {
  const bucket = await prisma.loginThrottle.findUnique({
    where: { key: loginThrottleKey(email) },
    select: { blockedUntil: true },
  });
  const remainingMs = (bucket?.blockedUntil?.getTime() ?? 0) - Date.now();
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
}

export async function recordFailedLogin(email: string) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - LOGIN_WINDOW_MS);
  const key = loginThrottleKey(email);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "LoginThrottle" ("key", "attempts", "windowStartedAt", "blockedUntil", "updatedAt")
    VALUES (${key}, 1, ${now}, NULL, ${now})
    ON CONFLICT("key") DO UPDATE SET
      "attempts" = CASE WHEN "windowStartedAt" <= ${windowStart} THEN 1 ELSE "attempts" + 1 END,
      "windowStartedAt" = CASE WHEN "windowStartedAt" <= ${windowStart} THEN ${now} ELSE "windowStartedAt" END,
      "blockedUntil" = CASE WHEN "windowStartedAt" <= ${windowStart} THEN NULL ELSE "blockedUntil" END,
      "updatedAt" = ${now}
  `);

  const bucket = await prisma.loginThrottle.findUniqueOrThrow({ where: { key }, select: { attempts: true } });
  if (bucket.attempts < LOGIN_ATTEMPT_LIMIT) return 0;

  const blockedUntil = new Date(now.getTime() + LOGIN_WINDOW_MS);
  await prisma.loginThrottle.update({ where: { key }, data: { blockedUntil } });
  return Math.ceil(LOGIN_WINDOW_MS / 1000);
}

export async function clearLoginThrottle(email: string) {
  await prisma.loginThrottle.deleteMany({ where: { key: loginThrottleKey(email) } });
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.authSession.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { profile: true, onboarding: true } } },
  });

  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    await prisma.authSession.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  return session.user;
}

export async function destroyCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.authSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  }

  cookieStore.delete(SESSION_COOKIE);
}
