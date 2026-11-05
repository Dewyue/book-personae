"use client";

import Link from "next/link";
import type { Book } from "@/lib/db/schema";
import { UploadForm } from "@/components/UploadForm";

type Props = {
  books: Book[];
  activeId?: string;
  connected: boolean;
  onUploaded: () => void;
};

const statusDot: Record<Book["status"], string> = {
  processing: "bg-[var(--muted)]",
  ready: "bg-[var(--accent)]",
  failed: "bg-[var(--danger)]",
};

export function Sidebar({ books, activeId, connected, onUploaded }: Props) {
  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-[var(--rule)] bg-[var(--sidebar)]">
      <div className="flex h-10 items-center px-3 text-[12px] font-medium tracking-wide text-[var(--ink-soft)]">
        书中人
      </div>
      <div className="px-2 pb-2">
        <UploadForm compact onUploaded={onUploaded} disabled={!connected} />
      </div>
      <div className="px-3 pb-1 text-[11px] uppercase tracking-wide text-[var(--muted)]">
        书架
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-1 pb-3">
        {books.length === 0 ? (
          <p className="px-2 py-2 text-[12px] text-[var(--muted)]">还没有书</p>
        ) : (
          books.map((book) => {
            const active = book.id === activeId;
            return (
              <Link
                key={book.id}
                href={`/books/${book.id}`}
                className={[
                  "mb-0.5 flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px]",
                  active
                    ? "bg-[var(--hover)] text-[var(--ink-soft)]"
                    : "text-[var(--ink)] hover:bg-[var(--hover)]",
                ].join(" ")}
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot[book.status]}`}
                />
                <span className="min-w-0 truncate">{book.title}</span>
              </Link>
            );
          })
        )}
      </nav>
    </aside>
  );
}
