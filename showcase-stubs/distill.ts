import { omitCore } from "@/lib/_core-omitted";

export type DistillResult = {
  summary: string;
  keyPoints: string[];
  outline: string[];
  quotes: string[];
  questions: string[];
};

/** Showcase stub — distillation prompts/logic not published. */
export async function generateDistill(
  _title: string,
  _text: string,
): Promise<DistillResult> {
  omitCore("观点蒸馏");
}
