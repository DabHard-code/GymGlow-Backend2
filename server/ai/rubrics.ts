// server/ai/rubrics.ts

import type { SportType } from "@shared/schema";

type RubricInput = {
  sport: SportType;
  skillName: string;
  category: string | null;
  description: string | null;
  keyPoints: string[] | null;
  commonMistakes: string[] | null;
};

/**
 * Builds a compact rubric block for the system prompt.
 * This works even if you don't have a full rubric DB yet:
 * - It still reinforces "what skill is this" + key checkpoints.
 * - It’s safe: if fields are missing, it returns a minimal block.
 */
export function buildSkillRubricBlock(input: RubricInput): string {
  const skill = (input.skillName || "").trim();
  if (!skill) return "";

  const lines: string[] = [];

  lines.push(`Skill: ${skill}`);
  if (input.category) lines.push(`Category: ${input.category}`);
  if (input.description) lines.push(`Description: ${input.description}`);

  if (input.keyPoints?.length) {
    lines.push("Key checkpoints:");
    for (const kp of input.keyPoints.slice(0, 10)) {
      const t = String(kp).trim();
      if (t) lines.push(`- ${t}`);
    }
  }

  if (input.commonMistakes?.length) {
    lines.push("Common mistakes to watch for:");
    for (const m of input.commonMistakes.slice(0, 10)) {
      const t = String(m).trim();
      if (t) lines.push(`- ${t}`);
    }
  }

  // If you want the model to structure by phases, you can hint it here:
  lines.push("");
  lines.push("Scoring guidance:");
  lines.push("- Identify phases (setup / entry / action / finish) when applicable.");
  lines.push("- Tie feedback items to a phase when possible.");
  lines.push("- If the frames do NOT show this skill clearly, say so and score low.");

  return lines.join("\n");
}