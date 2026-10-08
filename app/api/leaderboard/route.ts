import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getLeaderboardRows } from "@/lib/leaderboard";

export async function GET() {
  const user = await getSessionUser();
  const rows = await getLeaderboardRows(user?.id);
  return NextResponse.json({ rows, me: user ? { id: user.id, score: user.score, solvedCount: user.solvedCount } : null });
}
