"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CATEGORIES, LANGUAGES, LANGUAGE_LABELS, type Category, type Challenge, type Difficulty, type Language } from "@/lib/types";
import { toast } from "./toast";

type Tab = "dashboard" | "challenges" | "monitor" | "users";

interface OverviewStats {
  users: number;
  challenges: number;
  totalSolves: number;
  submissions: number;
  passRate: number;
  pointsAwarded: number;
  activeSessions: number;
}

interface OverviewUser {
  id: string;
  username: string;
  email: string;
  role: "admin" | "user";
  score: number;
  solves: number;
  bot: boolean;
  createdAt: string;
  lastSeenAt: string;
}

interface OverviewSubmission {
  id: string;
  username: string;
  challengeTitle: string;
  language: Language;
  status: string;
  points: number;
  durationMs: number;
  createdAt: string;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  solves: number;
  status: string;
  isSelf: boolean;
}

interface Overview {
  stats: OverviewStats;
  runtimes: Record<Language, boolean>;
  users: OverviewUser[];
  submissions: OverviewSubmission[];
  leaderboard: LeaderboardEntry[];
}

const EMPTY_OVERVIEW: Overview = {
  stats: {
    users: 0,
    challenges: 0,
    totalSolves: 0,
    submissions: 0,
    passRate: 0,
    pointsAwarded: 0,
    activeSessions: 0,
  },
  runtimes: { javascript: true, c: false },
  users: [],
  submissions: [],
  leaderboard: [],
};

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "fa-solid fa-gauge-high" },
  { id: "challenges", label: "Challenges", icon: "fa-solid fa-layer-group" },
  { id: "monitor", label: "Live Monitor", icon: "fa-solid fa-tower-broadcast" },
  { id: "users", label: "Users", icon: "fa-solid fa-users-gear" },
];

const DIFF_STYLES: Record<string, string> = {
  Easy: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  Medium: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  Hard: "bg-rose-500/10 border-rose-500/30 text-rose-400",
};

const STATUS_STYLES: Record<string, string> = {
  passed: "text-emerald-400",
  failed: "text-rose-400",
  error: "text-rose-400",
  timeout: "text-amber-400",
  "runtime-unavailable": "text-amber-400",
};

interface ChallengeForm {
  id: string | null;
  title: string;
  category: Category;
  difficulty: Difficulty;
  points: string;
  desc: string;
  sampleOutput: string;
}

const EMPTY_FORM: ChallengeForm = {
  id: null,
  title: "",
  category: "Matrix",
  difficulty: "Easy",
  points: "150",
  desc: "",
  sampleOutput: "",
};

export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [overview, setOverview] = useState<Overview>(EMPTY_OVERVIEW);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ChallengeForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/overview", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
        setLoaded(true);
      }
      const challengeRes = await fetch("/api/challenges", { cache: "no-store" });
      if (challengeRes.ok) {
        const challengeData = await challengeRes.json();
        setChallenges(challengeData.challenges ?? []);
      }
    } catch {
      // offline
    }
  }, []);

  useEffect(() => {
    const boot = setTimeout(() => {
      refresh();
    }, 0);
    const source = new EventSource("/api/events");
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (["users", "leaderboard", "submissions", "stats", "challenges"].includes(payload.type)) refresh();
      } catch {
        // ignore malformed frames
      }
    };
    return () => {
      clearTimeout(boot);
      source.close();
    };
  }, [refresh]);

  const statCards = useMemo(
    () => [
      { label: "Operatives", value: overview.stats.users, icon: "fa-solid fa-users" },
      { label: "Challenges", value: overview.stats.challenges, icon: "fa-solid fa-layer-group" },
      { label: "Total Solves", value: overview.stats.totalSolves, icon: "fa-solid fa-check-double" },
      { label: "Submissions", value: overview.stats.submissions, icon: "fa-solid fa-paper-plane" },
      { label: "Pass Rate", value: `${overview.stats.passRate}%`, icon: "fa-solid fa-percent" },
      { label: "Points Awarded", value: overview.stats.pointsAwarded.toLocaleString(), icon: "fa-solid fa-coins" },
      { label: "Active Sessions", value: overview.stats.activeSessions, icon: "fa-solid fa-satellite-dish" },
      { label: "Runtimes Ready", value: Object.values(overview.runtimes).filter(Boolean).length, icon: "fa-solid fa-microchip" },
    ],
    [overview]
  );

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(challenge: Challenge) {
    setForm({
      id: challenge.id,
      title: challenge.title,
      category: challenge.category,
      difficulty: challenge.difficulty,
      points: String(challenge.points),
      desc: challenge.desc,
      sampleOutput: challenge.sampleOutput,
    });
    setFormOpen(true);
  }

  async function saveChallenge(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        category: form.category,
        difficulty: form.difficulty,
        points: Number(form.points),
        desc: form.desc,
        sampleOutput: form.sampleOutput,
      };
      const endpoint = form.id ? `/api/challenges/${form.id}` : "/api/challenges";
      const res = await fetch(endpoint, {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Failed to save challenge", "error");
        return;
      }
      toast(form.id ? "Challenge updated" : "Challenge created");
      setFormOpen(false);
      refresh();
    } catch {
      toast("Network error", "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteChallenge(challenge: Challenge) {
    if (!window.confirm(`Delete "${challenge.title}"? Scores earned from it will be removed.`)) return;
    try {
      const res = await fetch(`/api/challenges/${challenge.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.error ?? "Delete failed", "error");
        return;
      }
      toast("Challenge deleted");
      refresh();
    } catch {
      toast("Network error", "error");
    }
  }

  async function userAction(id: string, action: "reset" | "toggle-role") {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Action failed", "error");
        return;
      }
      toast(action === "reset" ? "Score reset" : "Role updated");
      refresh();
    } catch {
      toast("Network error", "error");
    }
  }

  async function deleteUser(user: OverviewUser) {
    if (!window.confirm(`Delete operative "${user.username}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Delete failed", "error");
        return;
      }
      toast("Operative removed");
      refresh();
    } catch {
      toast("Network error", "error");
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-cyan-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-widest">
            <i className="fa-solid fa-shield-halved" /> Full Administrator Console
          </div>
          <h1 className="font-orbitron text-3xl md:text-4xl font-extrabold text-white mt-1">
            ADMIN <span className="text-brand-neon-cyan">CONTROL PANEL</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-cyan-500/70 hidden sm:inline">
            {loaded ? "// live sync active" : "// connecting..."}
          </span>
          <button
            onClick={refresh}
            className="px-4 py-2 rounded-lg glass-panel border border-cyan-500/40 text-cyan-300 font-rajdhani font-bold text-xs uppercase hover:bg-cyan-500/20"
          >
            <i className="fa-solid fa-rotate mr-1.5" /> Refresh
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-rajdhani font-extrabold text-xs uppercase shadow-neon-cyan hover:shadow-neon-blue"
          >
            <i className="fa-solid fa-plus mr-1.5" /> Add Challenge
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 font-rajdhani font-semibold text-sm">
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${
              tab === item.id ? "bg-cyan-500 text-black" : "glass-panel text-gray-300 hover:text-cyan-300"
            }`}
          >
            <i className={item.icon} />
            {item.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card) => (
              <div key={card.label} className="glass-panel rounded-2xl p-5 border border-cyan-500/20">
                <div className="flex items-center justify-between">
                  <span className="font-rajdhani text-xs uppercase tracking-widest text-cyan-400">{card.label}</span>
                  <i className={`${card.icon} text-brand-neon-cyan text-sm`} />
                </div>
                <div className="font-orbitron font-extrabold text-2xl text-white mt-2">{card.value}</div>
              </div>
            ))}
          </div>

          <div className="glass-panel rounded-2xl border border-cyan-500/20 p-6">
            <h3 className="font-orbitron font-bold text-white mb-4">
              <i className="fa-solid fa-server text-cyan-400 mr-2" />
              JUDGE RUNTIMES
            </h3>
            <div className="flex flex-wrap gap-3">
              {LANGUAGES.map((lang) => (
                <div
                  key={lang}
                  className={`px-4 py-2.5 rounded-xl border font-mono text-xs flex items-center gap-2 ${
                    overview.runtimes[lang]
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  }`}
                >
                  <i className={`fa-solid ${overview.runtimes[lang] ? "fa-circle-check" : "fa-triangle-exclamation"}`} />
                  {LANGUAGE_LABELS[lang]} — {overview.runtimes[lang] ? "executable" : "not installed"}
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-cyan-500/20 overflow-hidden">
            <div className="px-6 py-4 border-b border-cyan-500/20 flex items-center justify-between">
              <h3 className="font-orbitron font-bold text-white">
                <i className="fa-solid fa-wave-square text-cyan-400 mr-2" />
                LIVE SUBMISSION FEED
              </h3>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-cyan-500/10">
              {overview.submissions.length === 0 && (
                <div className="p-6 text-center font-mono text-sm text-gray-500">No submissions yet.</div>
              )}
              {overview.submissions.map((sub) => (
                <div key={sub.id} className="px-6 py-3 flex items-center justify-between gap-4 text-sm">
                  <div className="min-w-0">
                    <span className="font-rajdhani font-bold text-white">{sub.username}</span>
                    <span className="text-gray-500 mx-2">→</span>
                    <span className="font-rajdhani text-gray-300 truncate">{sub.challengeTitle}</span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
                    <span className="text-cyan-500">{LANGUAGE_LABELS[sub.language]?.split(" ")[0] ?? sub.language}</span>
                    <span className={STATUS_STYLES[sub.status] ?? "text-gray-400"}>{sub.status}</span>
                    <span className="text-brand-neon-cyan">{sub.points > 0 ? `+${sub.points}` : "0"} pts</span>
                    <span className="text-gray-600 hidden sm:inline">{new Date(sub.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "challenges" && (
        <div className="glass-panel rounded-2xl border border-cyan-500/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-rajdhani min-w-[720px]">
              <thead className="bg-brand-navy/90 text-cyan-400 text-xs font-orbitron uppercase border-b border-cyan-500/20">
                <tr>
                  <th className="py-3 px-5">Title</th>
                  <th className="py-3 px-5">Category</th>
                  <th className="py-3 px-5">Difficulty</th>
                  <th className="py-3 px-5 text-center">Points</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/10 text-sm text-gray-300">
                {challenges.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center font-mono text-gray-500">
                      No challenges found.
                    </td>
                  </tr>
                )}
                {challenges.map((challenge) => (
                  <tr key={challenge.id} className="hover:bg-cyan-500/5">
                    <td className="py-3 px-5 font-bold text-white">{challenge.title}</td>
                    <td className="py-3 px-5">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs">
                        {challenge.category}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <span className={`px-2 py-0.5 rounded border font-mono text-xs ${DIFF_STYLES[challenge.difficulty]}`}>
                        {challenge.difficulty}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-center font-mono text-brand-neon-cyan">{challenge.points}</td>
                    <td className="py-3 px-5 text-right">
                      <button
                        onClick={() => openEdit(challenge)}
                        className="text-gray-400 hover:text-cyan-300 px-2"
                        title="Edit challenge"
                      >
                        <i className="fa-solid fa-pen-to-square" />
                      </button>
                      <button
                        onClick={() => deleteChallenge(challenge)}
                        className="text-gray-400 hover:text-rose-400 px-2"
                        title="Delete challenge"
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "monitor" && (
        <div className="glass-panel rounded-2xl border border-cyan-500/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-cyan-500/20 flex items-center justify-between">
            <h3 className="font-orbitron font-bold text-white">
              <i className="fa-solid fa-tower-broadcast text-cyan-400 mr-2" />
              REAL-TIME LEADERBOARD MONITOR
            </h3>
            <div className="flex items-center gap-2 font-mono text-xs text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" /> LIVE
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-rajdhani min-w-[640px]">
              <thead className="bg-brand-navy/90 text-cyan-400 text-xs font-orbitron uppercase border-b border-cyan-500/20">
                <tr>
                  <th className="py-3 px-5">Rank</th>
                  <th className="py-3 px-5">Operative</th>
                  <th className="py-3 px-5 text-center">Solves</th>
                  <th className="py-3 px-5 text-center">Status</th>
                  <th className="py-3 px-5 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/10 text-sm text-gray-300">
                {overview.leaderboard.map((row) => (
                  <tr key={row.username} className={`hover:bg-cyan-500/5 ${row.isSelf ? "bg-cyan-500/10" : ""}`}>
                    <td className="py-3 px-5 font-orbitron font-bold text-cyan-400">#{row.rank}</td>
                    <td className="py-3 px-5 font-bold text-white">{row.username}</td>
                    <td className="py-3 px-5 text-center font-mono">{row.solves}</td>
                    <td className="py-3 px-5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-xs border ${
                          row.status === "Online"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-gray-500/10 text-gray-400 border-gray-500/30"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right font-orbitron font-bold text-brand-neon-cyan">
                      {row.score.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="glass-panel rounded-2xl border border-cyan-500/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-rajdhani min-w-[860px]">
              <thead className="bg-brand-navy/90 text-cyan-400 text-xs font-orbitron uppercase border-b border-cyan-500/20">
                <tr>
                  <th className="py-3 px-5">Operative</th>
                  <th className="py-3 px-5">Email</th>
                  <th className="py-3 px-5">Role</th>
                  <th className="py-3 px-5 text-center">Score</th>
                  <th className="py-3 px-5 text-center">Solves</th>
                  <th className="py-3 px-5 text-center">Last Seen</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/10 text-sm text-gray-300">
                {overview.users.map((u) => (
                  <tr key={u.id} className="hover:bg-cyan-500/5">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{u.username}</span>
                        {u.bot && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono text-[10px]">
                            BOT
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-5 font-mono text-xs text-cyan-400">{u.email}</td>
                    <td className="py-3 px-5">
                      <span
                        className={`px-2 py-0.5 rounded border font-mono text-xs ${
                          u.role === "admin"
                            ? "bg-purple-500/10 border-purple-500/40 text-purple-300"
                            : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-center font-mono text-brand-neon-cyan">{u.score}</td>
                    <td className="py-3 px-5 text-center font-mono">{u.solves}</td>
                    <td className="py-3 px-5 text-center font-mono text-xs text-gray-500">
                      {new Date(u.lastSeenAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-5 text-right whitespace-nowrap">
                      <button
                        onClick={() => userAction(u.id, "reset")}
                        className="text-gray-400 hover:text-amber-300 px-1.5"
                        title="Reset score"
                      >
                        <i className="fa-solid fa-arrow-rotate-left" />
                      </button>
                      <button
                        onClick={() => userAction(u.id, "toggle-role")}
                        className="text-gray-400 hover:text-purple-300 px-1.5"
                        title="Toggle admin role"
                      >
                        <i className="fa-solid fa-user-shield" />
                      </button>
                      <button
                        onClick={() => deleteUser(u)}
                        className="text-gray-400 hover:text-rose-400 px-1.5"
                        title="Delete operative"
                      >
                        <i className="fa-solid fa-user-slash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl rounded-2xl border border-cyan-500/40 p-6 space-y-5 relative tech-border max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setFormOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-cyan-400 text-xl"
              aria-label="Close form"
            >
              <i className="fa-solid fa-xmark" />
            </button>
            <div className="text-left flex items-center gap-3 pr-8">
              <div>
                <h3 className="font-orbitron font-extrabold text-xl sm:text-2xl text-white">
                  {form.id ? "EDIT PATTERN CHALLENGE" : "ADD PATTERN CHALLENGE"}
                </h3>
                <p className="font-rajdhani text-sm text-cyan-400">
                  Configure question details &amp; the verification matrix.
                </p>
              </div>
            </div>

            <form onSubmit={saveChallenge} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-xs text-cyan-400 mb-1">Challenge Title</label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Diamond Star Matrix"
                    className="w-full bg-brand-navy border border-cyan-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block font-mono text-xs text-cyan-400 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                    className="w-full bg-brand-navy border border-cyan-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-xs text-cyan-400 mb-1">Points</label>
                  <input
                    type="number"
                    required
                    min={10}
                    max={10000}
                    value={form.points}
                    onChange={(e) => setForm({ ...form, points: e.target.value })}
                    className="w-full bg-brand-navy border border-cyan-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block font-mono text-xs text-cyan-400 mb-1">Difficulty</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value as Difficulty })}
                    className="w-full bg-brand-navy border border-cyan-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-mono text-xs text-cyan-400 mb-1">Problem Description</label>
                <textarea
                  rows={3}
                  required
                  value={form.desc}
                  onChange={(e) => setForm({ ...form, desc: e.target.value })}
                  placeholder="Write code to print pattern..."
                  className="w-full bg-brand-navy border border-cyan-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 font-sans"
                />
              </div>

              <div>
                <label className="block font-mono text-xs text-cyan-400 mb-1">
                  Target Verification Pattern Output (trailing spaces ignored)
                </label>
                <textarea
                  rows={5}
                  required
                  value={form.sampleOutput}
                  onChange={(e) => setForm({ ...form, sampleOutput: e.target.value })}
                  placeholder={"*\n**\n***"}
                  className="w-full bg-brand-navy border border-cyan-500/30 rounded-lg p-3 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-orbitron font-extrabold text-xs uppercase rounded-lg shadow-neon-cyan hover:shadow-neon-blue transition-all disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Challenge"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
