import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { books, type Book, type User } from "@/lib/db/schema";

export function getOwnedBook(bookId: string, user: User): Book | null {
  const book = db
    .select()
    .from(books)
    .where(and(eq(books.id, bookId), eq(books.userId, user.id)))
    .get();
  return book ?? null;
}

export function bookNotFound() {
  return NextResponse.json({ error: "书籍不存在" }, { status: 404 });
}
