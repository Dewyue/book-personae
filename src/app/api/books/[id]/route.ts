import { asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { isUser, requireUser } from "@/lib/auth";
import { bookNotFound, getOwnedBook } from "@/lib/book-access";
import { db } from "@/lib/db";
import { books, chunks, distills, messages, personas } from "@/lib/db/schema";
import { UPLOADS_DIR } from "@/lib/paths";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const user = requireUser(req);
  if (!isUser(user)) return user;

  const { id } = await params;
  const book = getOwnedBook(id, user);
  if (!book) return bookNotFound();

  const distill = db.select().from(distills).where(eq(distills.bookId, id)).get();
  const personaList = db
    .select()
    .from(personas)
    .where(eq(personas.bookId, id))
    .orderBy(asc(personas.sortOrder))
    .all();
  const chat = db
    .select()
    .from(messages)
    .where(eq(messages.bookId, id))
    .orderBy(asc(messages.createdAt))
    .all();

  return NextResponse.json({
    book,
    distill: distill ?? null,
    personas: personaList,
    messages: chat,
  });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const user = requireUser(req);
  if (!isUser(user)) return user;

  const { id } = await params;
  const book = getOwnedBook(id, user);
  if (!book) return bookNotFound();

  db.delete(messages).where(eq(messages.bookId, id)).run();
  db.delete(personas).where(eq(personas.bookId, id)).run();
  db.delete(chunks).where(eq(chunks.bookId, id)).run();
  db.delete(distills).where(eq(distills.bookId, id)).run();
  db.delete(books).where(eq(books.id, id)).run();

  const filePath = path.join(
    UPLOADS_DIR,
    `${id}${path.extname(book.sourceFilename)}`,
  );
  await fs.unlink(filePath).catch(() => undefined);

  return NextResponse.json({ ok: true });
}
