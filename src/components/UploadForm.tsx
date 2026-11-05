"use client";

import { useRef, useState } from "react";
import {
  formatBytes,
  maxUploadBytes,
  readApiJson,
} from "@/lib/api-client";

type Props = {
  onUploaded: () => void;
  disabled?: boolean;
  compact?: boolean;
};

export function UploadForm({ onUploaded, disabled, compact }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const limit = maxUploadBytes();

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      if (file.size > limit) {
        throw new Error(
          `文件 ${formatBytes(file.size)} 超过当前环境上限 ${formatBytes(limit)}。线上约 4MB；大书请本地运行。`,
        );
      }
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/books", { method: "POST", body: form });
      const data = await readApiJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "上传失败");
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="w-full">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void upload(file);
        }}
        className={[
          compact
            ? "flex cursor-pointer items-center justify-center rounded-md border border-[var(--rule)] bg-[var(--panel)] px-2 py-1.5 text-[12px] text-[var(--ink)] hover:bg-[var(--hover)]"
            : "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--rule)] px-6 py-10",
          dragging ? "border-[var(--accent)] bg-[var(--hover)]" : "",
          busy || disabled ? "pointer-events-none opacity-60" : "",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.epub,.txt,.md,application/pdf,application/epub+zip,text/plain,text/markdown"
          className="hidden"
          disabled={busy || disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        {compact ? (
          <span>
            {busy ? "上传中…" : disabled ? "先连接 AI" : "打开一本书"}
          </span>
        ) : (
          <>
            <span className="text-[15px] text-[var(--ink-soft)]">
              {busy ? "上传中…" : disabled ? "请先连接 AI" : "把书拖到这里"}
            </span>
            <span className="max-w-sm text-center text-[12px] text-[var(--muted)]">
              PDF / EPUB / TXT / MD · 上限 {formatBytes(limit)}
            </span>
          </>
        )}
      </label>
      {error ? (
        <p className="mt-2 px-1 text-[12px] text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
