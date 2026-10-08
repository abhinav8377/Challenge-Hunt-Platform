import { getDB } from "./db";
import { broadcast } from "./events";
import type { LeaderboardRow } from "./types";

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export async function getLeaderboardRows(selfId?: string): Promise<LeaderboardRow[]> {
  const db = await getDB();
  const now = Date.now();

  const rows = db.users
    .filter((user) => user.role !== "admin")
    .map((user) => ({
      username: user.username,
      score: user.score,
      solves: user.solved.length,
      online: user.bot || now - new Date(user.lastSeenAt).getTime() < ONLINE_WINDOW_MS,
      isSelf: user.id === selfId,
      id: user.id,
      lastSeenAt: user.lastSeenAt,
      bot: user.bot,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.solves !== a.solves) return b.solves - a.solves;
      return a.username.localeCompare(b.username);
    });

  return rows.map((row, index) => ({
    rank: index + 1,
    username: row.username,
    score: row.score,
    solves: row.solves,
    status: row.online ? "Online" : "Offline",
    isSelf: row.isSelf,
    lastSeenAt: row.lastSeenAt,
    group: row.bot ? "Arena Legend" : "Pattern Operative",
  }));
}

export function broadcastLeaderboard() {
  broadcast({ type: "leaderboard" });
}
