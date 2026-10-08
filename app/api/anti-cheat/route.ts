import { NextResponse } from "next/server";
import { getSessionUserRecord } from "@/lib/auth";
import { mutate } from "@/lib/db";
import { broadcast } from "@/lib/events";

const MAX_ATTEMPTS = 2;

export async function POST() {
  const user = await getSessionUserRecord();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  if (user.role === "admin") {
    return NextResponse.json({ banned: false, ignored: true, leftAttempts: MAX_ATTEMPTS });
  }

  if (user.banned) {
    return NextResponse.json({ banned: true, message: "You are Banned" }, { status: 403 });
  }

  const result = await mutate((db) => {
    const fresh = db.users.find((u) => u.id === user.id);
    if (!fresh) return null;
    fresh.tabViolations = (fresh.tabViolations ?? 0) + 1;
    const violations = fresh.tabViolations;

    if (violations > MAX_ATTEMPTS) {
      fresh.banned = true;
      fresh.bannedAt = new Date().toISOString();
      for (const [token, session] of Object.entries(db.sessions)) {
        if (session.userId === fresh.id) delete db.sessions[token];
      }
      return { violations, banned: true as const };
    }
    return { violations, banned: false as const };
  });

  if (!result) return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (result.banned) {
    broadcast({ type: "users" });
    broadcast({ type: "stats" });
    return NextResponse.json(
      { banned: true, violations: result.violations, message: "You are Banned" },
      { status: 403 }
    );
  }

  return NextResponse.json({
    banned: false,
    violations: result.violations,
    leftAttempts: Math.max(0, MAX_ATTEMPTS - result.violations + 1),
  });
}
