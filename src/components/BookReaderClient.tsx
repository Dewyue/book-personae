"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AccountMenu,
  fetchCurrentUser,
  type PublicUser,
} from "@/components/AccountMenu";
import { ChatPanel } from "@/components/ChatPanel";
import { ConnectAi } from "@/components/ConnectAi";
import { PersonaPanel } from "@/components/PersonaPanel";
import { Sidebar } from "@/components/Sidebar";
import { readApiJson } from "@/lib/api-client";
import { personaChatQuestions } from "@/lib/persona-utils";
import type { Book, Distill, Message, Persona } from "@/lib/db/schema";

type Props = { bookId: string };

export function BookReaderClient({ bookId }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [book, setBook] = useState<Book | null>(null);
  const [distill, setDistill] = useState<Distill | null>(null);
  const [personaList, setPersonaList] = useState<Persona[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [inspector, setInspector] = useState(false);

  const refreshLibrary = useCallback(async () => {
    try {
      const res = await fetch("/api/books");
      if (res.status === 401) {
        setBooks([]);
        return;
      }
      const data = await readApiJson<{ books?: Book[] }>(res);
      setBooks(data.books ?? []);
    } catch {
      setBooks([]);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/books/${bookId}`);
      if (res.status === 401) {
        setError("请先登录");
        setBook(null);
        return;
      }
      const data = await readApiJson<{
        error?: string;
        book: Book;
        distill: Distill | null;
        personas?: Persona[];
        messages?: Message[];
      }>(res);
      if (!res.ok) {
        setError(data.error || "加载失败");
        return;
      }
      setError(null);
      setBook(data.book);
      setDistill(data.distill);
      setPersonaList(data.personas ?? []);
      setMessages(data.messages ?? []);
      setSelectedPersonaId((prev) => {
        if (prev && data.personas?.some((p: Persona) => p.id === prev)) {
          return prev;
        }
        return data.book.defaultPersonaId ?? data.personas?.[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    }
  }, [bookId]);

  useEffect(() => {
    void (async () => {
      const u = await fetchCurrentUser();
      setUser(u);
      setAuthLoading(false);
      if (!u) {
        setError("请先登录");
        return;
      }
      void refreshLibrary();
      void refresh();
    })();
  }, [refresh, refreshLibrary]);

  useEffect(() => {
    if (book?.status !== "processing") return;
    const timer = setInterval(() => void refresh(), 2500);
    return () => clearInterval(timer);
  }, [book?.status, refresh]);

  const selectedPersona = useMemo(
    () => personaList.find((p) => p.id === selectedPersonaId) ?? null,
    [personaList, selectedPersonaId],
  );

  const personaMessages = useMemo(
    () => messages.filter((m) => m.personaId === selectedPersonaId),
    [messages, selectedPersonaId],
  );

  const suggestedQuestions = selectedPersona
    ? personaChatQuestions(selectedPersona)
    : distill?.questions?.slice(0, 3);

  async function regenerate() {
    if (!book) return;
    try {
      const res = await fetch(`/api/books/${book.id}/retry?force=1`, {
        method: "POST",
      });
      const data = await readApiJson<{ error?: string }>(res);
      if (!res.ok) {
        alert(data.error || "重新生成失败");
        return;
      }
      await refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "重新生成失败");
    }
  }

  return (
    <div className="flex h-dvh">
      <Sidebar
        books={books}
        activeId={bookId}
        connected={connected}
        onUploaded={() => {
          void refreshLibrary();
        }}
      />
      <main className="flex min-w-0 flex-1 flex-col bg-[var(--bg)]">
        <header className="flex h-10 shrink-0 items-center gap-2 border-b border-[var(--rule)] px-3">
          <div className="min-w-0 flex-1 truncate text-[13px] text-[var(--ink-soft)]">
            {book?.title ?? "加载中…"}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {book && book.status !== "processing" ? (
              <button
                type="button"
                onClick={() => void regenerate()}
                className="rounded-md px-2 py-1 text-[12px] text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--ink)]"
              >
                重新生成
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setInspector((v) => !v)}
              className="rounded-md px-2 py-1 text-[12px] text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--ink)]"
            >
              分身
            </button>
            {user ? <ConnectAi compact onChanged={setConnected} /> : null}
            <AccountMenu
              user={user}
              loading={authLoading}
              onChanged={(next) => {
                setUser(next);
                if (!next) {
                  setBooks([]);
                  setBook(null);
                  router.push("/");
                  return;
                }
                void refreshLibrary();
                void refresh();
              }}
            />
          </div>
        </header>

        {error ? (
          <div className="p-6 text-[13px]">
            <p className="text-[var(--danger)]">{error}</p>
            <Link href="/" className="mt-3 inline-block text-[var(--accent)]">
              返回
            </Link>
          </div>
        ) : !book ? (
          <div className="p-6 text-[13px] text-[var(--muted)]">加载中…</div>
        ) : (
          <div className="flex min-h-0 flex-1">
            <div className="flex min-w-0 flex-1 flex-col">
              {personaList.length > 0 ? (
                <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--rule)] px-2 py-1">
                  {personaList.map((p) => {
                    const active = p.id === selectedPersonaId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPersonaId(p.id)}
                        className={[
                          "shrink-0 rounded-md px-2 py-1 text-[12px]",
                          active
                            ? "bg-[var(--hover)] text-[var(--ink-soft)]"
                            : "text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--ink)]",
                        ].join(" ")}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {book.status !== "ready" ? (
                <p className="shrink-0 px-4 py-2 text-[12px] text-[var(--muted)]">
                  {book.status === "processing"
                    ? book.statusMessage || "处理中…"
                    : book.error || "处理失败"}
                </p>
              ) : null}
              <ChatPanel
                key={selectedPersonaId ?? "none"}
                bookId={book.id}
                personaId={selectedPersonaId}
                personaName={selectedPersona?.name}
                initialMessages={personaMessages}
                enabled={book.status === "ready" && Boolean(selectedPersonaId)}
                suggestedQuestions={suggestedQuestions}
              />
            </div>
            {inspector ? (
              <div className="hidden w-[320px] shrink-0 overflow-y-auto border-l border-[var(--rule)] bg-[var(--sidebar)] p-3 md:block">
                <PersonaPanel
                  personas={personaList}
                  selectedPersonaId={selectedPersonaId}
                  onSelectPersona={setSelectedPersonaId}
                  distill={distill}
                  status={book.status}
                  statusMessage={book.statusMessage}
                  error={book.error}
                />
              </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
