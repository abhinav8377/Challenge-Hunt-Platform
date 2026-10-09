import { broadcast } from "./events";
import { NO_ID, usersCol } from "./db";
import type { LeaderboardRow } from "./types";

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

interface RankedUser {
  id: string;
  username: string;
  score: number;
  solved: string[];
  lastSeenAt: string;
  bot?: boolean;
}

export async function getLeaderboardRows(selfId?: string): Promise<LeaderboardRow[]> {
  const users = await usersCol();
  const now = Date.now();

  const ranked = await users
    .aggregate<RankedUser>([
      { $match: { role: { $ne: "admin" } } },
      { $project: { ...NO_ID.projection, username: 1, score: 1, solved: 1, lastSeenAt: 1, bot: 1 } },
      { $addFields: { solves: { $size: { $ifNull: ["$solved", []] } } } },
      { $sort: { score: -1, solves: -1, username: 1 } },
    ])
    .toArray();

  return ranked.map((user, index) => {
    const solves = user.solved.length;
    const online = Boolean(user.bot) || now - new Date(user.lastSeenAt).getTime() < ONLINE_WINDOW_MS;

    return {
      rank: index + 1,
      username: user.username,
      score: user.score,
      solves,
      status: online ? "Online" : "Offline",
      isSelf: user.id === selfId,
      lastSeenAt: user.lastSeenAt,
      group: user.bot ? "Arena Legend" : "Pattern Operative",
    };
  });
}

export function broadcastLeaderboard() {
  broadcast({ type: "leaderboard" });
}
