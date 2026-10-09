export type Role = "admin" | "user";
export type Category = "Matrix" | "Pyramid" | "Numerical";
export type Difficulty = "Easy" | "Medium" | "Hard";
export type Language = "javascript" | "c";

export const CATEGORIES: Category[] = ["Matrix", "Pyramid", "Numerical"];
export const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];
export const LANGUAGES: Language[] = ["javascript", "c"];

export const LANGUAGE_LABELS: Record<Language, string> = {
  javascript: "JavaScript (Node.js)",
  c: "C (GCC)",
};

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: Role;
  score: number;
  solved: string[];
  createdAt: string;
  lastSeenAt: string;
  bot?: boolean;
  banned?: boolean;
  bannedAt?: string;
  tabViolations?: number;
}

export interface PublicUser {
  id: string;
  username: string;
  email: string;
  role: Role;
  score: number;
  solvedCount: number;
  createdAt: string;
  lastSeenAt: string;
}

export interface Challenge {
  id: string;
  title: string;
  category: Category;
  difficulty: Difficulty;
  points: number;
  desc: string;
  sampleOutput: string;
  codeTemplates: Record<Language, string>;
  createdAt: string;
}

export interface Submission {
  id: string;
  userId: string;
  username: string;
  challengeId: string;
  challengeTitle: string;
  language: Language;
  status: JudgeStatus;
  points: number;
  durationMs: number;
  createdAt: string;
}

export type JudgeStatus =
  | "passed"
  | "failed"
  | "error"
  | "timeout"
  | "runtime-unavailable";

export interface JudgeResult {
  status: JudgeStatus;
  output: string;
  expected: string;
  stderr: string;
  runtime: string;
  durationMs: number;
  message: string;
}

export interface LeaderboardRow {
  rank: number;
  username: string;
  score: number;
  solves: number;
  status: "Online" | "Offline";
  isSelf: boolean;
  lastSeenAt: string;
  group: string;
}
