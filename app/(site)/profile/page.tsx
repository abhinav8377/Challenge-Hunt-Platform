import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserRecord } from "@/lib/auth";
import { challengesCol } from "@/lib/db";
import { getLeaderboardRows } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

const DIFF_STYLES: Record<string, string> = {
  Easy: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  Medium: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  Hard: "bg-rose-500/10 border-rose-500/30 text-rose-400",
};

export default async function ProfilePage() {
  const user = await getSessionUserRecord();
  if (!user) redirect("/login?next=/profile");

  const [challenges, rows] = await Promise.all([
    (await challengesCol())
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: 1, _id: 1 })
      .toArray(),
    getLeaderboardRows(user.id),
  ]);
  const myRank = user.role === "admin" ? null : (rows.find((row) => row.isSelf)?.rank ?? null);
  const solvedChallenges = challenges.filter((c) => user.solved.includes(c.id));
  const unsolvedChallenges = challenges.filter((c) => !user.solved.includes(c.id));
  const completion = challenges.length ? Math.round((solvedChallenges.length / challenges.length) * 100) : 0;

  const stats = [
    { label: "Total Score", value: user.score.toLocaleString(), icon: "fa-solid fa-bolt" },
    { label: user.role === "admin" ? "Leaderboard" : "Global Rank", value: myRank ? `#${myRank}` : "—", icon: "fa-solid fa-ranking-star" },
    { label: "Patterns Solved", value: `${solvedChallenges.length}/${challenges.length}`, icon: "fa-solid fa-check-double" },
    { label: "Completion", value: `${completion}%`, icon: "fa-solid fa-chart-pie" },
  ];

  return (
    <main className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-8">
      <div className="space-y-8 pb-8 max-w-5xl mx-auto">
      <div className="border-b border-cyan-500/20 pb-4">
        <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-widest">
          <i className="fa-solid fa-fingerprint" /> Operative Dossier
        </div>
        <h1 className="font-orbitron text-3xl md:text-4xl font-extrabold text-white mt-1">
          USER <span className="text-brand-neon-cyan">PROFILE</span>
        </h1>
      </div>

      <div className="glass-panel rounded-2xl border border-cyan-500/30 p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
        <div className="w-24 h-24 rounded-2xl bg-cyan-500/10 border-2 border-brand-neon-cyan flex items-center justify-center font-orbitron font-black text-4xl text-brand-neon-cyan shadow-neon-cyan shrink-0">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div className="text-center sm:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <h2 className="font-orbitron font-extrabold text-2xl sm:text-3xl text-white">{user.username}</h2>
            <span
              className={`px-2.5 py-0.5 rounded font-mono text-xs border ${
                user.role === "admin"
                  ? "bg-purple-500/10 border-purple-500/40 text-purple-300"
                  : "bg-cyan-500/10 border-cyan-500/40 text-cyan-300"
              }`}
            >
              {user.role === "admin" ? "ADMINISTRATOR" : "OPERATIVE"}
            </span>
          </div>
          <p className="font-mono text-xs text-cyan-400 mt-2 break-all">{user.email}</p>
          <p className="font-rajdhani text-sm text-gray-400 mt-1">
            Joined {new Date(user.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}{" "}
            · Last active {new Date(user.lastSeenAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <Link
            href="/challenges"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-orbitron font-extrabold text-xs uppercase text-center shadow-neon-cyan hover:shadow-neon-blue transition-all"
          >
            <i className="fa-solid fa-terminal mr-2" />
            Solve Patterns
          </Link>
          {user.role === "admin" && (
            <Link
              href="/admin"
              className="px-5 py-2.5 rounded-xl glass-panel border border-cyan-500/50 text-cyan-300 font-orbitron font-bold text-xs uppercase text-center hover:bg-cyan-500/20 transition-all"
            >
              <i className="fa-solid fa-shield-halved mr-2" />
              Admin Panel
            </Link>
          )}
          <a
            href="/logout"
            className="px-5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-400 font-orbitron font-bold text-xs uppercase text-center hover:bg-rose-500/20 transition-all"
          >
            <i className="fa-solid fa-power-off mr-2" />
            Sign Out
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-panel rounded-2xl p-5 text-center border border-cyan-500/20">
            <i className={`${stat.icon} text-brand-neon-cyan mb-2`} />
            <div className="font-orbitron font-extrabold text-2xl text-white">{stat.value}</div>
            <div className="font-rajdhani text-[11px] uppercase tracking-widest text-cyan-400 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-2xl border border-cyan-500/20 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-cyan-500/10 pb-3">
          <h3 className="font-orbitron font-bold text-lg text-white">
            VERIFIED <span className="text-brand-neon-cyan">PATTERNS</span>
          </h3>
          <span className="font-mono text-xs text-cyan-400">{solvedChallenges.length} solved</span>
        </div>

        {solvedChallenges.length === 0 ? (
          <p className="font-mono text-sm text-gray-500 py-4 text-center">
            No patterns verified yet — open the editor and claim your first points.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {solvedChallenges.map((challenge) => (
              <div
                key={challenge.id}
                className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="font-rajdhani font-bold text-white text-sm truncate">{challenge.title}</div>
                  <div className="font-mono text-[10px] text-gray-400">
                    {challenge.category} · {challenge.difficulty}
                  </div>
                </div>
                <span className="font-orbitron font-bold text-emerald-400 text-sm shrink-0 ml-3">
                  +{challenge.points}
                </span>
              </div>
            ))}
          </div>
        )}

        {unsolvedChallenges.length > 0 && (
          <>
            <div className="flex items-center justify-between border-b border-cyan-500/10 pb-3 pt-4">
              <h3 className="font-orbitron font-bold text-lg text-gray-300">REMAINING QUESTS</h3>
              <span className="font-mono text-xs text-gray-500">{unsolvedChallenges.length} left</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {unsolvedChallenges.map((challenge) => (
                <div
                  key={challenge.id}
                  className="flex items-center justify-between bg-brand-navy/60 border border-cyan-500/10 rounded-xl px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="font-rajdhani font-bold text-gray-300 text-sm truncate">{challenge.title}</div>
                    <div className="font-mono text-[10px] text-gray-500">
                      {challenge.category} · {challenge.difficulty}
                    </div>
                  </div>
                  <span className="shrink-0 ml-3 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded border font-mono text-[10px] ${DIFF_STYLES[challenge.difficulty]}`}>
                      {challenge.difficulty}
                    </span>
                    <span className="font-mono text-xs text-cyan-400">{challenge.points} pts</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      </div>
    </main>
  );
}
