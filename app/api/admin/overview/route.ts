import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { getSessionUserRecord } from "@/lib/auth";
import { availableRuntimes } from "@/lib/judge";
import { getLeaderboardRows } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getSessionUserRecord();
  if (!admin) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (admin.role !== "admin") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  const db = await getDB();
  const runtimes = await availableRuntimes();

  const totalSolves = db.users.reduce((sum, u) => sum + u.solved.length, 0);
  const passed = db.submissions.filter((s) => s.status === "passed").length;
  const pointsAwarded = db.users.reduce((sum, u) => sum + u.score, 0);

  return NextResponse.json({
    stats: {
      users: db.users.length,
      challenges: db.challenges.length,
      totalSolves,
      submissions: db.submissions.length,
      passRate: db.submissions.length ? Math.round((passed / db.submissions.length) * 100) : 0,
      pointsAwarded,
      activeSessions: Object.keys(db.sessions).length,
    },
    runtimes,
    users: db.users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      score: u.score,
      solves: u.solved.length,
      bot: Boolean(u.bot),
      banned: Boolean(u.banned),
      createdAt: u.createdAt,
      lastSeenAt: u.lastSeenAt,
    })),
    submissions: db.submissions.slice(0, 30),
    leaderboard: await getLeaderboardRows(admin.id),
  });
}
