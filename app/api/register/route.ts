import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDB, mutate, toPublicUser } from "@/lib/db";
import { attachSessionCookie, createSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { broadcast } from "@/lib/events";
import { broadcastLeaderboard } from "@/lib/leaderboard";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const username = String(body.username ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
    return NextResponse.json(
      { error: "Handle must be 3-20 characters using letters, numbers or underscore." },
      { status: 400 }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const db = await getDB();
  if (db.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return NextResponse.json({ error: "This handle is already registered." }, { status: 409 });
  }
  if (db.users.some((u) => u.email.toLowerCase() === email)) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const { salt, hash } = hashPassword(password);
  const now = new Date().toISOString();
  const user = {
    id: `u-${randomUUID()}`,
    username,
    email,
    passwordHash: hash,
    salt,
    role: "user" as const,
    score: 0,
    solved: [] as string[],
    createdAt: now,
    lastSeenAt: now,
  };

  await mutate((d) => {
    d.users.push(user);
  });

  const token = await createSession(user.id);
  await attachSessionCookie(token);

  broadcast({ type: "users" });
  broadcastLeaderboard();

  return NextResponse.json({ user: toPublicUser(user) }, { status: 201 });
}
