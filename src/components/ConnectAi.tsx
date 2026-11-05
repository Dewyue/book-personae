"use client";

import { FormEvent, useEffect, useState } from "react";
import { readApiJson } from "@/lib/api-client";

type Preset = {
  id: string;
  label: string;
  help: string;
  signupUrl: string;
  baseURL: string;
  model: string;
  embeddingModel: string;
};

type Status =
  | { connected: false }
  | {
      connected: true;
      maskedKey: string;
      preset?: string;
      model?: string | null;
    };

type Props = {
  compact?: boolean;
  onChanged?: (connected: boolean) => void;
};

export function ConnectAi({ compact, onChanged }: Props) {
  const [status, setStatus] = useState<Status | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [open, setOpen] = useState(false);
  const [presetId, setPresetId] = useState("siliconflow");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const res = await fetch("/api/settings/llm");
      const data = await readApiJson<{
        presets?: Preset[];
        connected?: boolean;
        maskedKey?: string;
        preset?: string;
        model?: string | null;
      }>(res);
      setPresets(data.presets ?? []);
      if (data.connected) {
        setStatus({
          connected: true,
          maskedKey: data.maskedKey ?? "",
          preset: data.preset,
          model: data.model,
        });
        onChanged?.(true);
      } else {
        setStatus({ connected: false });
        onChanged?.(false);
      }
    } catch {
      setStatus({ connected: false });
      onChanged?.(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const preset = presets.find((p) => p.id === presetId);
      const res = await fetch("/api/settings/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          preset: presetId,
          baseURL: preset?.baseURL,
          model: preset?.model,
          embeddingModel: preset?.embeddingModel,
        }),
      });
      const data = await readApiJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "连接失败");
      setApiKey("");
      setOpen(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "连接失败");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    await fetch("/api/settings/llm", { method: "DELETE" });
    await refresh();
  }

  const selected = presets.find((p) => p.id === presetId);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={[
          "rounded-md border px-2 py-1 text-[12px] transition",
          status?.connected
            ? "border-[var(--rule)] text-[var(--accent)] hover:bg-[var(--hover)]"
            : "border-transparent bg-[var(--accent)] text-white",
        ].join(" ")}
      >
        {status?.connected
          ? compact
            ? "AI 已连接"
            : `AI 已连接 · ${status.maskedKey}`
          : "连接 AI"}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--rule)] bg-[var(--panel)] p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-medium text-[var(--ink-soft)]">
                  连接 AI
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  对话和生成分身会消耗你自己的额度，不花别人的钱。按下面三步即可。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
              >
                关闭
              </button>
            </div>

            {status?.connected ? (
              <div className="mt-6 space-y-4 rounded-sm border border-[var(--rule)] bg-[var(--paper-deep)] p-4">
                <p className="text-sm text-[var(--ink)]">
                  当前已连接：<span className="font-medium">{status.maskedKey}</span>
                </p>
                <button
                  type="button"
                  onClick={() => void disconnect()}
                  className="text-sm text-[var(--danger)] underline-offset-2 hover:underline"
                >
                  断开并清除密钥
                </button>
              </div>
            ) : null}

            <ol className="mt-6 space-y-4 text-sm leading-6 text-[var(--ink)]">
              <li className="flex gap-3">
                <span className="font-[family-name:var(--font-display)] text-lg text-[var(--accent)]">
                  1
                </span>
                <div className="space-y-2">
                  <p>选一个平台（新手选硅基流动）</p>
                  <div className="flex flex-wrap gap-2">
                    {presets.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPresetId(p.id)}
                        className={[
                          "rounded-sm border px-3 py-1.5",
                          presetId === p.id
                            ? "border-[var(--accent)] bg-[var(--hover)] text-[var(--ink-soft)]"
                            : "border-[var(--rule)] text-[var(--ink)]",
                        ].join(" ")}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {selected ? (
                    <p className="text-[var(--muted)]">{selected.help}</p>
                  ) : null}
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-[family-name:var(--font-display)] text-lg text-[var(--accent)]">
                  2
                </span>
                <div>
                  <p>打开平台，注册/登录，复制 API 密钥</p>
                  {selected ? (
                    <a
                      href={selected.signupUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-[var(--accent)] underline-offset-2 hover:underline"
                    >
                      打开获取密钥页面 →
                    </a>
                  ) : null}
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-[family-name:var(--font-display)] text-lg text-[var(--accent)]">
                  3
                </span>
                <div className="w-full">
                  <p>粘贴到这里，点「保存并验证」</p>
                  <form onSubmit={onSubmit} className="mt-3 space-y-3">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-…"
                      autoComplete="off"
                      className="w-full rounded-sm border border-[var(--rule)] bg-[var(--paper-deep)] px-3 py-2 text-sm outline-none focus:border-[var(--ink-soft)]"
                    />
                    {error ? (
                      <p className="text-sm text-[var(--danger)]" role="alert">
                        {error}
                      </p>
                    ) : null}
                    <button
                      type="submit"
                      disabled={busy || !apiKey.trim()}
                      className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-[13px] text-white disabled:opacity-50"
                    >
                      {busy ? "验证中…" : "保存并验证"}
                    </button>
                  </form>
                </div>
              </li>
            </ol>

            <p className="mt-6 text-xs leading-5 text-[var(--muted)]">
              密钥只保存在你自己的浏览器 Cookie 里，不会提交到 GitHub。换电脑需重新粘贴。
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
