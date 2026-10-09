import { broadcast } from "./events";
import { NO_ID, teamsCol, usersCol } from "./db";
import type { LeaderboardRow } from "./types";

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export async function getLeaderboardRows(selfId?: string): Promise<LeaderboardRow[]> {
  const teams = await teamsCol();
  const users = await usersCol();
  const now = Date.now();

  const allTeams = await teams.find({}, NO_ID).toArray();
  if (!allTeams.length) return [];

  const memberDocs = await users
    .find(
      { teamId: { $in: allTeams.map((team) => team.id) } },
      { projection: { _id: 0, teamId: 1, username: 1, lastSeenAt: 1 } }
    )
    .toArray();

  const byTeam = new Map<string, typeof memberDocs>();
  for (const member of memberDocs) {
    if (!member.teamId) continue;
    const list = byTeam.get(member.teamId) ?? [];
    list.push(member);
    byTeam.set(member.teamId, list);
  }

  const standings = allTeams
    .map((team) => {
      const members = (byTeam.get(team.id) ?? [])
        .map((member) => member.username)
        .sort((a, b) => a.localeCompare(b));
      const memberDocsForTeam = byTeam.get(team.id) ?? [];
      const lastSeenAt = memberDocsForTeam.reduce<string>(
        (latest, member) =>
          new Date(member.lastSeenAt).getTime() > new Date(latest).getTime() ? member.lastSeenAt : latest,
        team.createdAt
      );
      const online = memberDocsForTeam.some(
        (member) => now - new Date(member.lastSeenAt).getTime() < ONLINE_WINDOW_MS
      );
      return { team, members, lastSeenAt, online, solves: team.solved.length };
    })
    .sort((a, b) => {
      if (b.team.score !== a.team.score) return b.team.score - a.team.score;
      if (b.solves !== a.solves) return b.solves - a.solves;
      return a.team.name.localeCompare(b.team.name);
    });

  return standings.map((row, index) => ({
    rank: index + 1,
    teamName: row.team.name,
    teamSlug: row.team.slug,
    members: row.members,
    score: row.team.score,
    solves: row.solves,
    status: row.online ? "Online" : "Offline",
    isSelf: selfId ? row.team.memberIds.includes(selfId) : false,
    lastSeenAt: row.lastSeenAt,
    group: `${row.members.length} ${row.members.length === 1 ? "player" : "players"}`,
  }));
}

export function broadcastLeaderboard() {
  broadcast({ type: "leaderboard" });
}
