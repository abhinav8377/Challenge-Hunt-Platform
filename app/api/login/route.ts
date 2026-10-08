import { NextRequest, NextResponse } from "next/server";
import { getDB, mutate, toPublicUser } from "@/lib/db";
import { attachSessionCookie, createSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const identifier = String(body.identifier ?? body.username ?? body.email ?? "").trim();
  const password = String(body.password ?? "");

  if (!identifier || !password) {
    return NextResponse.json({ error: "Handle/email and password are required." }, { status: 400 });
  }

  const db = await getDB();
  const user = db.users.find(
    (u) =>
      u.username.toLowerCase() === identifier.toLowerCase() ||
      u.email.toLowerCase() === identifier.toLowerCase()
  );

  if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid credentials. Check your handle and password." }, { status: 401 });
  }

  await mutate((d) => {
    const fresh = d.users.find((u) => u.id === user.id);
    if (fresh) fresh.lastSeenAt = new Date().toISOString();
  });

  const token = await createSession(user.id);
  await attachSessionCookie(token);

  return NextResponse.json({ user: toPublicUser(user) });
}
