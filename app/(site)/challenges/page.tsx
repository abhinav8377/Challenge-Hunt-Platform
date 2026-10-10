import { redirect } from "next/navigation";
import { getSessionUserRecord } from "@/lib/auth";
import { challengesCol, teamsCol, toPublicUser } from "@/lib/db";
import ChallengesView from "@/components/challenges-view";

export const dynamic = "force-dynamic";

export default async function ChallengesPage() {
  const user = await getSessionUserRecord();
  if (!user) redirect("/login?next=/challenges");

  const [challenges, team] = await Promise.all([
    (await challengesCol())
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: 1, _id: 1 })
      .toArray(),
    user.teamId
      ? (await teamsCol()).findOne({ id: user.teamId }, { projection: { _id: 0, solved: 1 } })
      : Promise.resolve(null),
  ]);

  return (
    <main className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-8">
      <ChallengesView
        user={toPublicUser(user)}
        initialChallenges={challenges}
        initialSolved={team ? team.solved : user.solved}
        initialPatterns={user.patterns ?? []}
      />
    </main>
  );
}
