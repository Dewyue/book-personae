import type { Distill, Persona } from "@/lib/db/schema";

type Props = {
  personas: Persona[];
  selectedPersonaId: string | null;
  onSelectPersona: (id: string) => void;
  distill: Distill | null;
  status: "processing" | "ready" | "failed";
  statusMessage?: string | null;
  error?: string | null;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function PersonaPanel({
  personas,
  selectedPersonaId,
  onSelectPersona,
  distill,
  status,
  statusMessage,
  error,
}: Props) {
  if (status === "processing") {
    return (
      <div className="rounded-sm border border-[var(--rule)] bg-[var(--paper)] p-6">
        <p className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
          正在生成分身…
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {statusMessage || "解析、识别角色、蒸馏人格进行中"}
        </p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="rounded-sm border border-[var(--danger)]/30 bg-[var(--paper)] p-6">
        <p className="font-[family-name:var(--font-display)] text-xl text-[var(--danger)]">
          生成失败
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">{error || "未知错误"}</p>
      </div>
    );
  }

  const selected =
    personas.find((p) => p.id === selectedPersonaId) ?? personas[0] ?? null;

  return (
    <div className="space-y-6">
      {personas.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {personas.map((p) => {
            const active = p.id === selected?.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPersona(p.id)}
                className={[
                  "rounded-sm border px-3 py-1.5 text-sm transition",
                  active
                    ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]"
                    : "border-[var(--rule)] bg-[var(--paper)] text-[var(--ink-soft)] hover:border-[var(--ink-soft)]",
                ].join(" ")}
              >
                {p.kind === "author" ? "作者" : p.roleLabel || "角色"} · {p.name}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">暂无分身，请重新生成。</p>
      )}

      {selected ? (
        <div className="space-y-8 rounded-sm border border-[var(--rule)] bg-[var(--paper)] p-6">
          <Section title="分身概览">
            <p className="text-[15px] leading-7 text-[var(--ink)]">
              {selected.profile.summary}
            </p>
            {selected.profile.voiceRegister ? (
              <p className="mt-2 text-sm text-[var(--muted)]">
                声口：{selected.profile.voiceRegister}
              </p>
            ) : null}
          </Section>

          {selected.profile.speakingStyle ? (
            <Section title="说话风格">
              <p className="text-[15px] leading-7 text-[var(--ink)]">
                {selected.profile.speakingStyle}
              </p>
            </Section>
          ) : null}

          {selected.profile.avoidSounds?.length ? (
            <Section title="不会是这种味道">
              <ul className="space-y-1 text-sm leading-6 text-[var(--muted)]">
                {selected.profile.avoidSounds.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            </Section>
          ) : null}

          {selected.profile.worldview?.length > 0 ? (
            <Section title="世界观">
              <ul className="space-y-2 text-[15px] leading-7 text-[var(--ink)]">
                {selected.profile.worldview.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {selected.profile.catchphrases.length > 0 ? (
            <Section title="典型表述">
              <div className="space-y-3">
                {selected.profile.catchphrases.map((q) => (
                  <blockquote
                    key={q}
                    className="border-l-2 border-[var(--accent)] pl-4 text-[15px] leading-7 text-[var(--ink-soft)]"
                  >
                    {q}
                  </blockquote>
                ))}
              </div>
            </Section>
          ) : null}

          {selected.sampleQuotes.length > 0 ? (
            <Section title="书中原话">
              <div className="space-y-3">
                {selected.sampleQuotes.map((q) => (
                  <blockquote
                    key={q}
                    className="border-l-2 border-[var(--rule)] pl-4 text-[15px] leading-7 text-[var(--ink-soft)]"
                  >
                    {q}
                  </blockquote>
                ))}
              </div>
            </Section>
          ) : null}
        </div>
      ) : null}

      {distill ? (
        <details className="rounded-sm border border-[var(--rule)] bg-[var(--paper)] p-5">
          <summary className="cursor-pointer select-none font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
            全书概要
          </summary>
          <div className="mt-4 space-y-4 text-[15px] leading-7 text-[var(--ink)]">
            <p>{distill.summary}</p>
            {distill.keyPoints.length > 0 ? (
              <ul className="space-y-1 text-[var(--ink-soft)]">
                {distill.keyPoints.slice(0, 5).map((k) => (
                  <li key={k}>· {k}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}
