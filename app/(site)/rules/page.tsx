import Link from "next/link";

export const metadata = { title: "Rules - TekQbe Hack the Pattern" };

const SECTIONS = [
  {
    icon: "fa-solid fa-scroll",
    title: "General Conduct",
    rules: [
      "The arena is open to all registered operatives. One account per operative — multi-accounting results in a leaderboard wipe.",
      "Respect fellow hackers. Harassment, spam or abuse of any kind leads to an immediate ban.",
      "The administrator team's decision is final in all dispute scenarios.",
    ],
  },
  {
    icon: "fa-solid fa-terminal",
    title: "Challenge & Submission Rules",
    rules: [
      "Each pattern challenge must be solved by writing code in the built-in editor — JavaScript or C (subject to server runtime availability).",
      "Press 'Run & Verify' to execute your program against the target verification matrix. Output must match line-for-line, including spacing.",
      "Your code is executed in a sandboxed server subprocess with a 5-second time limit. Infinite loops and runaway output are killed automatically.",
      "First successful verification awards the full point value of the challenge. Re-solving a pattern never awards bonus points.",
    ],
  },
  {
    icon: "fa-solid fa-ranking-star",
    title: "Leaderboard & Scoring",
    rules: [
      "Scores update in real time across the platform the moment a pattern is verified.",
      "Ranks are ordered by total points, then by number of solves. Ties are broken alphabetically.",
      "The leaderboard reflects every registered operative, including seeded arena legends. Administrators manage the platform and are not ranked.",
    ],
  },
  {
    icon: "fa-solid fa-user-shield",
    title: "Fair Play & Prohibited Actions",
    rules: [
      "Do not attempt to read platform files, the database or other operatives' solutions from inside the judge sandbox.",
      "Do not attack, probe or overload the platform infrastructure (DDoS, brute force, injection).",
      "Sharing solutions during a live event undermines the arena — solve your own patterns.",
      "Automated solvers that call the submission API directly are prohibited.",
    ],
  },
  {
    icon: "fa-solid fa-gavel",
    title: "Administration",
    rules: [
      "Administrators may create, edit, re-point or retire challenges at any time; point adjustments apply to future verifications only.",
      "Administrators can reset scores, revoke accounts and monitor live platform telemetry.",
      "Any rule may be updated during the event — the version rendered here is always authoritative.",
    ],
  },
];

export default function RulesPage() {
  return (
    <main className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-8">
      <div className="space-y-8 pb-8">
      <div className="border-b border-cyan-500/20 pb-4">
        <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-widest">
          <i className="fa-solid fa-scale-balanced" /> Arena Protocol
        </div>
        <h1 className="font-orbitron text-3xl md:text-4xl font-extrabold text-white mt-1">
          RULES OF <span className="text-brand-neon-cyan">ENGAGEMENT</span>
        </h1>
        <p className="font-sans text-sm text-gray-400 mt-2 max-w-3xl">
          Read every section before entering the arena. By registering on TekQbe Hack the Pattern you agree to all rules
          listed below.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {SECTIONS.map((section) => (
          <div key={section.title} className="glass-panel rounded-2xl border border-cyan-500/20 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <i className={`${section.icon} text-brand-neon-cyan`} />
              </div>
              <h2 className="font-orbitron font-bold text-lg text-white">{section.title}</h2>
            </div>
            <ul className="space-y-2.5">
              {section.rules.map((rule) => (
                <li key={rule} className="flex gap-2.5 text-sm text-gray-300 leading-relaxed">
                  <span className="font-mono text-cyan-500 shrink-0">&gt;</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-2xl border border-cyan-500/30 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-center md:text-left">
          <h3 className="font-orbitron font-bold text-white text-lg">Ready to break the pattern?</h3>
          <p className="font-rajdhani text-sm text-cyan-300">Rules acknowledged. The arena awaits your first solve.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/register"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-orbitron font-extrabold text-xs uppercase shadow-neon-cyan hover:shadow-neon-blue transition-all"
          >
            Register
          </Link>
          <Link
            href="/login?next=/challenges"
            className="px-6 py-3 rounded-xl glass-panel border border-cyan-500/50 text-cyan-300 font-orbitron font-bold text-xs uppercase hover:bg-cyan-500/20 transition-all"
          >
            Sign In
          </Link>
        </div>
      </div>
      </div>
    </main>
  );
}
