import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NO_ID, sessionsCol, toPublicUser, usersCol } from "./db";
import type { PublicUser, User } from "./types";

export const SESSION_COOKIE = "htp_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const TOUCH_INTERVAL_MS = 60 * 1000;

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const sessions = await sessionsCol();

  await sessions.insertOne({
    _id: token,
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  });
  await sessions.deleteMany({ expiresAt: { $lt: new Date().toISOString() } });

  return token;
}

export async function attachSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

async function loadSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const sessions = await sessionsCol();
  const session = await sessions.findOne({ _id: token }, { projection: { userId: 1, expiresAt: 1 } });
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) return null;

  const users = await usersCol();
  const user = await users.findOne({ id: session.userId }, NO_ID);
  if (!user) return null;
  if (user.banned) return null;

  if (Date.now() - new Date(user.lastSeenAt).getTime() > TOUCH_INTERVAL_MS) {
    user.lastSeenAt = new Date().toISOString();
    await users.updateOne({ id: user.id }, { $set: { lastSeenAt: user.lastSeenAt } });
  }

  return user;
}

export async function getSessionUser(): Promise<PublicUser | null> {
  const user = await loadSessionUser();
  return user ? toPublicUser(user) : null;
}

export async function getSessionUserRecord(): Promise<User | null> {
  return loadSessionUser();
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const sessions = await sessionsCol();
    await sessions.deleteOne({ _id: token });
  }
  cookieStore.delete(SESSION_COOKIE);
}
