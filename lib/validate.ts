import { CATEGORIES, DIFFICULTIES, LANGUAGES, type Category, type Challenge, type Difficulty, type Language } from "./types";

export type ChallengeInput = Omit<Challenge, "id" | "codeTemplates" | "createdAt"> & {
  codeTemplates?: Partial<Record<Language, string>>;
};

export function validateChallengeInput(body: Record<string, unknown>): { value: ChallengeInput } | { error: string } {
  const title = String(body.title ?? "").trim();
  const category = String(body.category ?? "") as Category;
  const difficulty = String(body.difficulty ?? "") as Difficulty;
  const points = Number(body.points);
  const desc = String(body.desc ?? "").trim();
  const sampleOutput = String(body.sampleOutput ?? "").replace(/\r\n/g, "\n").replace(/\s+$/, "");

  if (!title || title.length > 80) return { error: "Title is required (max 80 characters)." };
  if (!CATEGORIES.includes(category)) return { error: "Invalid category." };
  if (!DIFFICULTIES.includes(difficulty)) return { error: "Invalid difficulty." };
  if (!Number.isFinite(points) || points < 10 || points > 10000) {
    return { error: "Points must be between 10 and 10000." };
  }
  if (!desc || desc.length > 2000) return { error: "Description is required (max 2000 characters)." };
  if (!sampleOutput) return { error: "Target verification pattern output is required." };

  const codeTemplates: Partial<Record<Language, string>> = {};
  const rawTemplates = body.codeTemplates;
  if (rawTemplates && typeof rawTemplates === "object") {
    for (const lang of LANGUAGES) {
      const value = (rawTemplates as Record<string, unknown>)[lang];
      if (typeof value === "string" && value.trim()) codeTemplates[lang] = value;
    }
  }

  return { value: { title, category, difficulty, points, desc, sampleOutput, codeTemplates } };
}
