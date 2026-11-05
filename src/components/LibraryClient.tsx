"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AccountMenu,
  fetchCurrentUser,
  type PublicUser,
} from "@/components/AccountMenu";
import { ConnectAi } from "@/components/ConnectAi";
import { Sidebar } from "@/components/Sidebar";
import { UploadForm } from "@/components/UploadForm";
import { readApiJson } from "@/lib/api-client";
import type { Book } from "@/lib/db/schema";

export function LibraryClient() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  const refreshAuth = useCallback(async () => {
    const u = await fetchCurrentUser();
    setUser(u);
    setAuthLoading(false);
    return u;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/books");
      if (res.status === 401) {
        setBooks([]);
        setUser(null);
        return;
      }
      const data = await readApiJson<{ books?: Book[] }>(res);
      setBooks(data.books ?? []);
    } catch {
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const u = await refreshAuth();
      if (u) await refresh();
      else setLoading(false);
    })();
  }, [refresh, refreshAuth]);

  useEffect(() => {
    const hasProcessing = books.some((b) => b.status === "processing");
    if (!hasProcessing) return;
    const timer = setInterval(() => void refresh(), 2500);
    return () => clearInterval(timer);
  }, [books, refresh]);

  function onAuthChanged(next: PublicUser | null) {
    setUser(next);
    if (next) {
      setLoading(true);
      void refresh();
    } else {
      setBooks([]);
      setLoading(false);
    }
  }

  return (
    <div className="flex h-dvh">
      <Sidebar
        books={user ? books : []}
        connected={Boolean(user && connected)}
        onUploaded={() => void refresh()}
      />
      <main className="flex min-w-0 flex-1 flex-col bg-[var(--bg)]">
        <header className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--rule)] px-3">
          <span className="text-[12px] text-[var(--muted)]">
            {authLoading || loading ? "加载中…" : user ? "书架" : "书中人"}
          </span>
          <div className="flex items-center gap-2">
            {user ? <ConnectAi compact onChanged={setConnected} /> : null}
            <AccountMenu
              user={user}
              loading={authLoading}
              onChanged={onAuthChanged}
            />
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <h1 className="text-[22px] font-medium tracking-tight text-[var(--ink-soft)]">
            书中人
          </h1>
          {!user ? (
            <>
              <p className="mt-2 max-w-md text-center text-[13px] text-[var(--muted)]">
                上传书籍，生成作者与角色分身并对话。登录后每人独立书架，互不可见。
              </p>
              <p className="mt-6 text-[12px] text-[var(--muted)]">
                请先点击右上角登录或注册
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 max-w-md text-center text-[13px] text-[var(--muted)]">
                {connected
                  ? "从左侧打开一本书，或把文件拖到下面。"
                  : "先连接 AI，再上传 PDF / EPUB / TXT / MD。"}
              </p>
              <div className="mt-8 w-full max-w-md">
                <UploadForm
                  onUploaded={() => void refresh()}
                  disabled={!connected}
                />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
