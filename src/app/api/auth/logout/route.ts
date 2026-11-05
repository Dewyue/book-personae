import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  clearSessionCookie,
  destroySession,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) destroySession(token);
  const res = NextResponse.json({ ok: true });
  return clearSessionCookie(res);
}
