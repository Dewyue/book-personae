import type { Persona, PersonaProfile } from "@/lib/db/schema";
import { omitCore } from "@/lib/_core-omitted";

export type CastMember = {
  name: string;
  role: string;
  brief: string;
};

export type BookCast = {
  authorName: string;
  characters: CastMember[];
};

export type GeneratedPersona = {
  profile: PersonaProfile;
  systemPrompt: string;
  sampleQuotes: string[];
};

/** Showcase stub — cast analysis / persona prompts not published. */
export async function analyzeBookCast(
  _bookTitle: string,
  _text: string,
): Promise<BookCast> {
  omitCore("角色识别");
}

export async function generatePersona(
  _bookTitle: string,
  _text: string,
  _subject: {
    kind: "author" | "character";
    name: string;
    roleLabel?: string;
    brief?: string;
  },
): Promise<GeneratedPersona> {
  omitCore("分身生成");
}

export function coerceProfile(raw: PersonaProfile): PersonaProfile {
  return raw;
}

export function buildPersonaPrompt(
  _bookTitle: string,
  _subject: { kind: "author" | "character"; name: string; roleLabel?: string },
  _profile: PersonaProfile,
  _sampleQuotes: string[] = [],
): string {
  omitCore("人设提示词");
}

export function buildLiveSystemPrompt(
  _bookTitle: string,
  _persona: Pick<
    Persona,
    "kind" | "name" | "roleLabel" | "profile" | "sampleQuotes" | "systemPrompt"
  >,
  _context: string,
): string {
  omitCore("对话系统提示词");
}
