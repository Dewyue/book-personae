import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions, users, type User } from "@/lib/db/schema";

export const SESSION_COOKIE = "bp_session";
const SESSION_DAYS = 30;

function hashPassword(password: string, salt: Buffer) {
  return scryptSync(password, salt, 64);
}

export function createPasswordHash(password: string) {
  const salt = randomBytes(16);
  const hash = hashPassword(password, salt);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = hashPassword(password, salt);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validateCredentials(email: string, password: string) {
  const normalized = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { ok: false as const, error: "请输入有效邮箱" };
  }
  if (password.length < 8) {
    return { ok: false as const, error: "密码至少 8 位" };
  }
  if (password.length > 128) {
    return { ok: false as const, error: "密码过长" };
  }
  return { ok: true as const, email: normalized };
}

export function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  db.insert(sessions)
    .values({
      id: crypto.randomUUID(),
      userId,
      tokenHash,
      expiresAt,
      createdAt: new Date(),
    })
    .run();
  return { token, expiresAt };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function destroySession(token: string) {
  db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token))).run();
}

export function getUserBySessionToken(token: string | undefined): User | null {
  if (!token) return null;
  const row = db
    .select({
      user: users,
      expiresAt: sessions.expiresAt,
      sessionId: sessions.id,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.tokenHash, hashToken(token)))
    .get();
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    db.delete(sessions).where(eq(sessions.id, row.sessionId)).run();
    return null;
  }
  return row.user;
}

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  return getUserBySessionToken(jar.get(SESSION_COOKIE)?.value);
}

export function getUserFromRequest(req: NextRequest): User | null {
  return getUserBySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
}

export function requireUser(req: NextRequest): User | NextResponse {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  return user;
}

export function isUser(value: User | NextResponse): value is User {
  return !(value instanceof NextResponse);
}

export function attachSessionCookie(
  res: NextResponse,
  token: string,
  expiresAt: Date,
) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return res;
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}

export function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}
