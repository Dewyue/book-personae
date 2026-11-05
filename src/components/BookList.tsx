"use client";

import Link from "next/link";
import type { Book } from "@/lib/db/schema";

const statusLabel: Record<Book["status"], string> = {
  processing: "生成中",
  ready: "可对话",
  failed: "失败",
};

type Props = {
  books: Book[];
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
};

export function BookList({ books, onDelete, onRetry }: Props) {
  if (books.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">书架还是空的。先上传一本书吧。</p>
    );
  }

  return (
    <ul className="divide-y divide-[var(--rule)] border-y border-[var(--rule)]">
      {books.map((book) => (
        <li
          key={book.id}
          className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <Link
              href={`/books/${book.id}`}
              className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)] underline-offset-4 hover:underline"
            >
              {book.title}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--muted)]">
              <span
                className={
                  book.status === "ready"
                    ? "text-[var(--accent)]"
                    : book.status === "failed"
                      ? "text-[var(--danger)]"
                      : ""
                }
              >
                {statusLabel[book.status]}
                {book.statusMessage ? ` · ${book.statusMessage}` : ""}
              </span>
              <span className="truncate">{book.sourceFilename}</span>
            </div>
            {book.error ? (
              <p className="mt-1 text-sm text-[var(--danger)]">{book.error}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              href={`/books/${book.id}`}
              className="rounded-sm bg-[var(--ink)] px-4 py-2 text-sm text-[var(--paper)] transition hover:bg-[var(--ink-soft)]"
            >
              打开
            </Link>
            {book.status !== "processing" ? (
              <button
                type="button"
                onClick={() => onRetry(book.id)}
                className="rounded-sm border border-[var(--accent)] px-4 py-2 text-sm text-[var(--accent)] transition hover:bg-[var(--paper-deep)]"
              >
                重新生成
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onDelete(book.id)}
              className="rounded-sm border border-[var(--rule)] px-4 py-2 text-sm text-[var(--muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
            >
              删除
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
