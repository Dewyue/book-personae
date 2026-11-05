"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { readApiJson } from "@/lib/api-client";
import type { Message } from "@/lib/db/schema";

type Citation = { index: number; excerpt: string };

type Props = {
  bookId: string;
  personaId: string | null;
  personaName?: string;
  initialMessages: Message[];
  enabled: boolean;
  suggestedQuestions?: string[];
};

export function ChatPanel({
  bookId,
  personaId,
  personaName,
  initialMessages,
  enabled,
  suggestedQuestions = [],
}: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveCitations, setLiveCitations] = useState<Citation[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(false);

  useEffect(() => {
    setMessages(initialMessages);
    stickToBottomRef.current = true;
    // Open on latest messages; scroll up inside the panel to see older ones.
    const snap = () => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    };
    requestAnimationFrame(() => requestAnimationFrame(snap));
  }, [initialMessages]);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  function onListScroll() {
    const el = listRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // If user scrolled up to read history, don't yank them back down while streaming ends.
    stickToBottomRef.current = distanceFromBottom < 80;
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming || !enabled) return;

    setError(null);
    setStreaming(true);
    setLiveCitations([]);
    setInput("");
    stickToBottomRef.current = true;

    const tempUser: Message = {
      id: `tmp-user-${Date.now()}`,
      bookId,
      personaId,
      role: "user",
      content,
      citations: [],
      createdAt: new Date(),
    };
    const tempAssistant: Message = {
      id: `tmp-assistant-${Date.now()}`,
      bookId,
      personaId,
      role: "assistant",
      content: "",
      citations: [],
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, tempUser, tempAssistant]);

    try {
      const res = await fetch(`/api/books/${bookId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, personaId }),
      });

      if (!res.ok || !res.body) {
        const data = await readApiJson<{ error?: string }>(res).catch(
          () => ({}) as { error?: string },
        );
        throw new Error(data.error || "对话失败");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";
      let citations: Citation[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const lines = part.split("\n");
          const event = lines
            .find((l) => l.startsWith("event:"))
            ?.replace("event:", "")
            .trim();
          const dataLine = lines
            .find((l) => l.startsWith("data:"))
            ?.replace("data:", "")
            .trim();
          if (!event || !dataLine) continue;
          const data = JSON.parse(dataLine) as {
            text?: string;
            citations?: Citation[];
            error?: string;
            content?: string;
            messageId?: string;
          };

          if (event === "citations" && data.citations) {
            citations = data.citations;
            setLiveCitations(citations);
          } else if (event === "token" && data.text) {
            assistantText += data.text;
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === "assistant") {
                next[next.length - 1] = {
                  ...last,
                  content: assistantText,
                  citations,
                };
              }
              return next;
            });
          } else if (event === "error") {
            throw new Error(data.error || "对话失败");
          } else if (event === "done") {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              const user = next[next.length - 2];
              if (user?.role === "user" && user.id.startsWith("tmp-")) {
                next[next.length - 2] = {
                  ...user,
                  id: `user-${Date.now()}`,
                };
              }
              if (last?.role === "assistant") {
                next[next.length - 1] = {
                  ...last,
                  id: data.messageId || `assistant-${Date.now()}`,
                  content: data.content || assistantText,
                  citations,
                };
              }
              return next;
            });
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "对话失败");
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("tmp-")));
    } finally {
      setStreaming(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={listRef}
        onScroll={onListScroll}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <div className="space-y-3 text-sm text-[var(--muted)]">
            <p>可以从这些问题开始：</p>
            <div className="flex flex-col gap-2">
              {(suggestedQuestions.length
                ? suggestedQuestions
                : ["这本书的核心主张是什么？", "作者如何论证主要观点？"]
              ).map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={!enabled || streaming}
                  onClick={() => void send(q)}
                  className="rounded-sm border border-[var(--rule)] px-3 py-2 text-left text-[var(--ink)] transition hover:border-[var(--ink-soft)] disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "ml-auto max-w-[80%] rounded-lg bg-[var(--panel)] px-3 py-2 text-[13px] leading-6 text-[var(--ink-soft)]"
                : "mr-8 max-w-[90%] space-y-2 text-[13px] leading-6 text-[var(--ink)]"
            }
          >
            <div className="whitespace-pre-wrap">
              {m.content || (streaming ? "…" : "")}
            </div>
            {m.role === "assistant" && m.citations?.length ? (
              <details className="text-sm text-[var(--muted)]">
                <summary className="cursor-pointer select-none">原文引用</summary>
                <ul className="mt-2 space-y-2">
                  {m.citations.map((c, i) => (
                    <li
                      key={`${m.id}-${c.index}-${i}`}
                      className="border-l border-[var(--rule)] pl-3"
                    >
                      <span className="text-[var(--accent)]">#{i + 1}</span>{" "}
                      {c.excerpt}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ))}

        {streaming &&
        liveCitations.length > 0 &&
        messages.at(-1)?.citations?.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">
            已检索 {liveCitations.length} 段原文…
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="shrink-0 px-5 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="shrink-0 px-4 pb-4"
      >
        <div className="flex items-end gap-2 rounded-xl border border-[var(--rule)] bg-[var(--panel)] px-3 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!enabled || streaming}
            placeholder={
              enabled
                ? personaName
                  ? `问 ${personaName}…`
                  : "提问…"
                : "处理完成后可对话"
            }
            className="min-w-0 flex-1 bg-transparent py-1 text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--muted)] disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!enabled || streaming || !input.trim()}
            className="rounded-md bg-[var(--accent)] px-2.5 py-1 text-[12px] text-white disabled:opacity-40"
          >
            发送
          </button>
        </div>
      </form>
    </div>
  );
}
