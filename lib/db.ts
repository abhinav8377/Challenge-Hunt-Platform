import type { Collection } from "mongodb";
import { getDatabase } from "./mongo";
import type { Challenge, Submission, User } from "./types";

export { CI } from "./mongo";

export interface SessionDoc {
  _id: string;
  userId: string;
  expiresAt: string;
}

export async function usersCol(): Promise<Collection<User>> {
  return (await getDatabase()).collection<User>("users");
}

export async function challengesCol(): Promise<Collection<Challenge>> {
  return (await getDatabase()).collection<Challenge>("challenges");
}

export async function sessionsCol(): Promise<Collection<SessionDoc>> {
  return (await getDatabase()).collection<SessionDoc>("sessions");
}

export async function submissionsCol(): Promise<Collection<Submission>> {
  return (await getDatabase()).collection<Submission>("submissions");
}

export const NO_ID = { projection: { _id: 0 } } as const;

export function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function toPublicUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    score: user.score,
    solvedCount: user.solved.length,
    createdAt: user.createdAt,
    lastSeenAt: user.lastSeenAt,
  };
}
