import type { PersonaProfile } from "@/lib/db/schema";

/** Public-safe suggested questions (no proprietary prompts). */
export function personaChatQuestions(persona: {
  kind: string;
  name: string;
  profile: PersonaProfile;
}) {
  if (persona.kind === "author") {
    return [
      "你写这本书时最想先说清哪一点？",
      "如果有人误解了你，你会怎么回应？",
      "今天若只谈一个核心观点，你会选哪个？",
    ];
  }
  const topic = persona.profile.topics?.[0];
  return [
    topic ? `关于「${topic}」，你怎么看？` : "你现在最在意什么？",
    "你做过最艰难的选择是什么？",
    "有句话你一直想对读者说吗？",
  ];
}
