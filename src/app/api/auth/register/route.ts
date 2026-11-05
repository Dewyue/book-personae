import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
  attachSessionCookie,
  createPasswordHash,
  createSession,
  publicUser,
  validateCredentials,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    email?: string;
    password?: string;
    name?: string;
  };
  const check = validateCredentials(
    String(body.email ?? ""),
    String(body.password ?? ""),
  );
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }

  const existing = db
    .select()
    .from(users)
    .where(eq(users.email, check.email))
    .get();
  if (existing) {
    return NextResponse.json({ error: "该邮箱已注册，请直接登录" }, { status: 409 });
  }

  const id = crypto.randomUUID();
  const name = String(body.name ?? "").trim() || check.email.split("@")[0]!;
  db.insert(users)
    .values({
      id,
      email: check.email,
      passwordHash: createPasswordHash(String(body.password)),
      name,
      createdAt: new Date(),
    })
    .run();

  const user = db.select().from(users).where(eq(users.id, id)).get()!;
  const { token, expiresAt } = createSession(user.id);
  const res = NextResponse.json({ user: publicUser(user) }, { status: 201 });
  return attachSessionCookie(res, token, expiresAt);
}
