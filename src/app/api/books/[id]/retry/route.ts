import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { eq } from "drizzle-orm";
import { isUser, requireUser } from "@/lib/auth";
import { bookNotFound, getOwnedBook } from "@/lib/book-access";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { runWithLlm } from "@/lib/llm";
import { processBook } from "@/lib/process-book";
import { readLlmSettingsFromRequest } from "@/lib/user-llm";

export const runtime = "nodejs";
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const user = requireUser(req);
  if (!isUser(user)) return user;

  const { id } = await params;
  const book = getOwnedBook(id, user);
  if (!book) return bookNotFound();

  const llm = readLlmSettingsFromRequest(req);
  if (!llm?.apiKey) {
    return NextResponse.json(
      { error: "请先连接你的 AI 账号" },
      { status: 401 },
    );
  }

  const force =
    req.nextUrl.searchParams.get("force") === "1" ||
    book.status !== "processing";

  if (!force) {
    return NextResponse.json({ error: "正在处理中，请稍候" }, { status: 409 });
  }

  db.update(books)
    .set({
      status: "processing",
      statusMessage: "重新排队处理中…",
      error: null,
    })
    .where(eq(books.id, id))
    .run();

  after(async () => {
    await runWithLlm(llm, () =>
      processBook(id, { skipEmbedIfPresent: true }),
    );
  });

  const updated = db.select().from(books).where(eq(books.id, id)).get();
  return NextResponse.json({ book: updated });
}
