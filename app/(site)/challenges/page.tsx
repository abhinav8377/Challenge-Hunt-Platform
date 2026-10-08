import { redirect } from "next/navigation";
import { getSessionUserRecord } from "@/lib/auth";
import { getDB, toPublicUser } from "@/lib/db";
import ChallengesView from "@/components/challenges-view";

export const dynamic = "force-dynamic";

export default async function ChallengesPage() {
  const user = await getSessionUserRecord();
  if (!user) redirect("/login?next=/challenges");

  const db = await getDB();

  return (
    <main className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-8">
      <ChallengesView
        user={toPublicUser(user)}
        initialChallenges={db.challenges}
        initialSolved={user.solved}
      />
    </main>
  );
}
