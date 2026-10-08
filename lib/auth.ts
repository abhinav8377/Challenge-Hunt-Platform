import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getDB, mutate, toPublicUser } from "./db";
import type { PublicUser, User } from "./types";

export const SESSION_COOKIE = "htp_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const TOUCH_INTERVAL_MS = 60 * 1000;

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await mutate((db) => {
    db.sessions[token] = {
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    };
    pruneSessions(db);
  });
  return token;
}

function pruneSessions(db: { sessions: Record<string, { expiresAt: string }> }) {
  const now = Date.now();
  for (const [token, session] of Object.entries(db.sessions)) {
    if (new Date(session.expiresAt).getTime() < now) delete db.sessions[token];
  }
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

export async function getSessionUser(): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = await getDB();
  const session = db.sessions[token];
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) return null;

  const user = db.users.find((u) => u.id === session.userId);
  if (!user) return null;

  const stale = Date.now() - new Date(user.lastSeenAt).getTime() > TOUCH_INTERVAL_MS;
  if (stale) {
    await mutate((d) => {
      const fresh = d.users.find((u) => u.id === user.id);
      if (fresh) fresh.lastSeenAt = new Date().toISOString();
    });
  }

  return toPublicUser(user);
}

export async function getSessionUserRecord(): Promise<User | null> {
  const publicUser = await getSessionUser();
  if (!publicUser) return null;
  const db = await getDB();
  return db.users.find((u) => u.id === publicUser.id) ?? null;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await mutate((db) => {
      delete db.sessions[token];
    });
  }
  cookieStore.delete(SESSION_COOKIE);
}
