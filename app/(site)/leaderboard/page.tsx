import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import LeaderboardPage from "@/components/leaderboard/leaderboard-page";

export const dynamic = "force-dynamic";

export default async function LeaderboardRoute() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/leaderboard");

  return (
    <main className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-8">
      <LeaderboardPage />
    </main>
  );
}
