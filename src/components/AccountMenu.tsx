"use client";

import { FormEvent, useEffect, useState } from "react";
import { readApiJson } from "@/lib/api-client";

export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
};

type Props = {
  user: PublicUser | null;
  loading?: boolean;
  onChanged: (user: PublicUser | null) => void;
};

type Mode = "login" | "register";

export function AccountMenu({ user, loading, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
      setPassword("");
    }
  }, [open]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        mode === "login" ? "/api/auth/login" : "/api/auth/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            ...(mode === "register" ? { name } : {}),
          }),
        },
      );
      const data = await readApiJson<{ error?: string; user?: PublicUser }>(res);
      if (!res.ok) throw new Error(data.error || "操作失败");
      onChanged(data.user ?? null);
      setOpen(false);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    onChanged(null);
  }

  if (loading) {
    return (
      <span className="px-2 text-[12px] text-[var(--muted)]">账号…</span>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="max-w-[140px] truncate text-[12px] text-[var(--muted)]"
          title={user.email}
        >
          {user.name || user.email}
        </span>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-md border border-[var(--rule)] px-2 py-1 text-[12px] text-[var(--ink)] hover:bg-[var(--hover)]"
        >
          退出
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMode("login");
          setOpen(true);
        }}
        className="rounded-md bg-[var(--accent)] px-2 py-1 text-[12px] text-white"
      >
        登录 / 注册
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-xl border border-[var(--rule)] bg-[var(--panel)] p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-[15px] font-medium text-[var(--ink-soft)]">
                {mode === "login" ? "登录" : "注册"}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
              >
                关闭
              </button>
            </div>
            <p className="mt-2 text-[12px] leading-5 text-[var(--muted)]">
              每人独立书架与对话，互不可见。
            </p>

            <div className="mt-4 flex gap-2 text-[12px]">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={[
                  "rounded-md px-2 py-1",
                  mode === "login"
                    ? "bg-[var(--hover)] text-[var(--ink-soft)]"
                    : "text-[var(--muted)]",
                ].join(" ")}
              >
                登录
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={[
                  "rounded-md px-2 py-1",
                  mode === "register"
                    ? "bg-[var(--hover)] text-[var(--ink-soft)]"
                    : "text-[var(--muted)]",
                ].join(" ")}
              >
                注册
              </button>
            </div>

            <form onSubmit={submit} className="mt-4 space-y-3">
              {mode === "register" ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="昵称（可选）"
                  className="w-full rounded-md border border-[var(--rule)] bg-[var(--paper-deep)] px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]"
                />
              ) : null}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="邮箱"
                autoComplete="email"
                className="w-full rounded-md border border-[var(--rule)] bg-[var(--paper-deep)] px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]"
              />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "register" ? "密码（至少 8 位）" : "密码"}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                className="w-full rounded-md border border-[var(--rule)] bg-[var(--paper-deep)] px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]"
              />
              {error ? (
                <p className="text-[12px] text-[var(--danger)]" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-md bg-[var(--accent)] px-3 py-2 text-[13px] text-white disabled:opacity-50"
              >
                {busy
                  ? "请稍候…"
                  : mode === "login"
                    ? "登录"
                    : "注册并进入"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

export async function fetchCurrentUser(): Promise<PublicUser | null> {
  try {
    const res = await fetch("/api/auth/me");
    const data = await readApiJson<{ user?: PublicUser | null }>(res);
    return data.user ?? null;
  } catch {
    return null;
  }
}
