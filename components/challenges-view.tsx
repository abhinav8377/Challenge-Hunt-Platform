"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CATEGORIES,
  LANGUAGES,
  LANGUAGE_LABELS,
  type Challenge,
  type JudgeResult,
  type Language,
  type PublicUser,
} from "@/lib/types";
import { toast } from "./toast";

interface ChallengesViewProps {
  user: PublicUser;
  initialChallenges: Challenge[];
  initialSolved: string[];
}

type ConsoleKind = "info" | "ok" | "fail" | "warn" | "plain";
interface ConsoleLine {
  id: number;
  kind: ConsoleKind;
  text: string;
}

const CONSOLE_STYLES: Record<ConsoleKind, string> = {
  info: "text-cyan-400",
  ok: "text-emerald-400 font-bold",
  fail: "text-rose-400 font-bold",
  warn: "text-amber-400 font-bold",
  plain: "text-gray-300",
};

const DIFF_STYLES: Record<string, string> = {
  Easy: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  Medium: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  Hard: "bg-rose-500/10 border-rose-500/30 text-rose-400",
};

let lineSeq = 0;

export default function ChallengesView({ user, initialChallenges, initialSolved }: ChallengesViewProps) {
  const [challenges, setChallenges] = useState<Challenge[]>(initialChallenges);
  const [solved, setSolved] = useState<string[]>(initialSolved);
  const [filter, setFilter] = useState<"all" | (typeof CATEGORIES)[number]>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>("javascript");
  const [codeMap, setCodeMap] = useState<Record<string, string>>({});
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  const [running, setRunning] = useState(false);
  const [runtimes, setRuntimes] = useState<Record<Language, boolean> | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);

  const active = useMemo(() => challenges.find((c) => c.id === activeId) ?? null, [challenges, activeId]);
  const filtered = useMemo(
    () => (filter === "all" ? challenges : challenges.filter((c) => c.category === filter)),
    [challenges, filter]
  );

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/challenges", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setChallenges(data.challenges ?? []);
      setSolved(data.solved ?? []);
      if (data.runtimes) setRuntimes(data.runtimes);
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
        if (payload.type === "challenges") refresh();
      } catch {
        // ignore malformed frames
      }
    };
    return () => {
      clearTimeout(boot);
      source.close();
    };
  }, [refresh]);

  useEffect(() => {
    if (!activeId) return;
    document.body.classList.add("htp-overlay-open");
    window.dispatchEvent(new Event("htp-overlay-open"));
    return () => {
      document.body.classList.remove("htp-overlay-open");
      window.dispatchEvent(new Event("htp-overlay-close"));
    };
  }, [activeId]);

  if (activeId && !active) setActiveId(null);

  const pushLine = useCallback((kind: ConsoleKind, text: string) => {
    setConsoleLines((prev) => [...prev, { id: ++lineSeq, kind, text }]);
  }, []);

  useEffect(() => {
    if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
  }, [consoleLines]);

  const editorKey = active ? `${active.id}:${language}` : "";
  const code = codeMap[editorKey] ?? active?.codeTemplates[language] ?? "";

  function setCode(value: string) {
    if (!editorKey) return;
    setCodeMap((prev) => ({ ...prev, [editorKey]: value }));
  }

  function resetCode() {
    if (!active) return;
    setCodeMap((prev) => ({ ...prev, [editorKey]: active.codeTemplates[language] ?? "" }));
    toast("Editor reset to starter template", "info");
  }

  function handleEditorKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = code.slice(0, start) + "  " + code.slice(end);
      setCode(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
  }

  function syncScroll() {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }

  function openChallenge(id: string) {
    document.body.classList.add("htp-overlay-open");
    window.dispatchEvent(new Event("htp-overlay-open"));
    setActiveId(id);
    setConsoleLines([{ id: ++lineSeq, kind: "info", text: '[System] Write your solution algorithm and click "Run & Verify".' }]);
  }

  async function runCode() {
    if (!active || running) return;
    setRunning(true);
    setConsoleLines([{ id: ++lineSeq, kind: "info", text: "[TekQbe Engine] Running pattern matrix check..." }]);

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: active.id, language, code }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        pushLine("fail", "[Auth] Session expired. Sign in again to submit.");
        toast("Session expired", "error");
        setRunning(false);
        return;
      }
      if (!res.ok) {
        pushLine("fail", `[Engine] ${data.error ?? "Submission failed."}`);
        setRunning(false);
        return;
      }

      const result: JudgeResult = data.result;
      const runtimeLabel = result.runtime !== "none" ? result.runtime : "unavailable";

      if (result.status === "passed") {
        pushLine("ok", `[✓] TEST PASSED! ${result.message}`);
        pushLine("plain", `[engine] runtime=${runtimeLabel} · ${result.durationMs}ms`);
        pushLine("plain", result.output || "(empty output)");
        if (data.earned > 0) {
          pushLine("ok", `[Score] +${data.earned} PTS awarded to ${user.username}`);
          toast(`Passed! +${data.earned} PTS added`);
          setSolved(data.solved);
        } else {
          pushLine("info", "[Score] Already solved — no additional points awarded.");
          toast("Pattern verified — already solved", "info");
          setSolved(data.solved);
        }
      } else if (result.status === "failed") {
        pushLine("fail", `[X] TEST FAILED! ${result.message}`);
        pushLine("plain", "--- your output ---");
        pushLine("plain", result.output || "(empty output)");
        pushLine("plain", "--- expected pattern ---");
        pushLine("plain", result.expected);
        toast("Output mismatch — try again", "error");
      } else if (result.status === "timeout") {
        pushLine("warn", `[Timeout] ${result.message}`);
        toast("Execution timed out", "error");
      } else if (result.status === "runtime-unavailable") {
        pushLine("warn", `[Runtime] ${result.message}`);
        toast("Server runtime unavailable for this language", "error");
      } else {
        pushLine("fail", `[Runtime Error] ${result.message}`);
        if (result.stderr) pushLine("plain", result.stderr.trim().slice(0, 2000));
        toast("Runtime error", "error");
      }
    } catch {
      pushLine("fail", "[Network] Could not reach the verification engine.");
      toast("Network error", "error");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-cyan-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-widest">
            <i className="fa-solid fa-layer-group" /> Active Quests · {solved.length}/{challenges.length} solved
          </div>
          <h1 className="font-orbitron text-3xl md:text-4xl font-extrabold text-white mt-1">
            PATTERN <span className="text-brand-neon-cyan">CHALLENGES</span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-rajdhani font-semibold text-sm">
          {(["all", ...CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-1.5 rounded-lg font-bold transition-all ${
                filter === cat ? "bg-cyan-500 text-black" : "glass-panel text-gray-300 hover:text-cyan-300"
              }`}
            >
              {cat === "all" ? "All" : cat}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl border border-cyan-500/20 p-12 text-center font-mono text-sm text-gray-500">
          No challenges in this category yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((challenge) => {
            const isSolved = solved.includes(challenge.id);
            return (
              <div
                key={challenge.id}
                role={isSolved ? undefined : "button"}
                tabIndex={isSolved ? undefined : 0}
                aria-disabled={isSolved}
                onClick={isSolved ? undefined : () => openChallenge(challenge.id)}
                onKeyDown={
                  isSolved
                    ? undefined
                    : (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openChallenge(challenge.id);
                        }
                      }
                }
                className={`rounded-2xl p-6 border relative flex flex-col justify-between group ${
                  isSolved
                    ? "bg-brand-navy/40 border-emerald-500/15 cursor-not-allowed"
                    : "glass-panel glass-panel-hover border-cyan-500/20 cursor-pointer"
                }`}
              >
                {isSolved && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 rounded-2xl bg-black/55 backdrop-blur-[2px] pointer-events-none"
                  />
                )}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs">
                      {challenge.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded border font-mono text-xs ${DIFF_STYLES[challenge.difficulty]}`}
                      >
                        {challenge.difficulty}
                      </span>
                      {isSolved && (
                        <span className="text-emerald-400 text-xs font-mono">
                          <i className="fa-solid fa-circle-check" /> Solved
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3
                      className={`font-orbitron font-bold text-xl text-white transition-colors ${
                        isSolved ? "" : "group-hover:text-brand-neon-cyan"
                      }`}
                    >
                      {challenge.title}
                    </h3>
                    <p className="font-sans text-xs text-gray-400 mt-2 line-clamp-2">{challenge.desc}</p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-cyan-500/10 space-y-3">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-cyan-400 font-bold text-lg">
                      {challenge.points} <span className="text-xs font-normal text-gray-400">PTS</span>
                    </span>
                    <span className="text-gray-500">
                      {new Date(challenge.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </div>

                  {isSolved ? (
                    <button
                      type="button"
                      disabled
                      aria-label={`${challenge.title} is solved`}
                      className="relative z-10 w-full py-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-rajdhani font-bold text-sm uppercase cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <i className="fa-solid fa-circle-check" aria-hidden="true" />
                      Solved
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openChallenge(challenge.id);
                      }}
                      className="relative z-10 w-full py-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 font-rajdhani font-bold text-sm uppercase hover:bg-cyan-500 hover:text-black transition-all"
                    >
                      Open Code Editor
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-50 bg-brand-deep/60 backdrop-blur-xl backdrop-saturate-75 flex items-center justify-center p-2 sm:p-4 animate-[fadeIn_0.25s_ease-out]">
          <div className="glass-panel w-full max-w-6xl h-[92vh] rounded-2xl border border-cyan-500/40 flex flex-col overflow-hidden relative tech-border animate-[slideUp_0.35s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="px-4 sm:px-6 py-4 border-b border-cyan-500/20 flex items-center justify-between bg-brand-navy/80 gap-3">
              <div className="flex items-center gap-3 flex-wrap min-w-0">
                <span className="px-2.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-mono shrink-0">
                  {active.category}
                </span>
                <h3 className="font-orbitron font-extrabold text-lg sm:text-xl text-white truncate">{active.title}</h3>
                <span className="px-2.5 py-0.5 rounded bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-mono shrink-0">
                  {active.points} PTS
                </span>
                {solved.includes(active.id) && (
                  <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono shrink-0">
                    Solved
                  </span>
                )}
              </div>
              <button
                onClick={() => setActiveId(null)}
                className="text-gray-400 hover:text-cyan-400 text-xl px-2 shrink-0"
                aria-label="Close editor"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
              <div className="lg:col-span-5 p-5 sm:p-6 overflow-y-auto border-b lg:border-b-0 lg:border-r border-cyan-500/20 space-y-6 bg-brand-deep/50">
                <div>
                  <h4 className="font-orbitron font-bold text-sm text-cyan-400 uppercase tracking-wider mb-2">
                    {"// Problem Statement"}
                  </h4>
                  <p className="font-sans text-sm text-gray-300 leading-relaxed">{active.desc}</p>
                </div>

                <div>
                  <h4 className="font-orbitron font-bold text-sm text-cyan-400 uppercase tracking-wider mb-2">
                    {"// Target Matrix Pattern"}
                  </h4>
                  <pre className="bg-black/90 border border-cyan-500/30 p-4 rounded-lg font-mono text-xs text-cyan-300 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                    {active.sampleOutput}
                  </pre>
                </div>

                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => (
                    <span
                      key={lang}
                      className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                        runtimes?.[lang] === false
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      }`}
                      title={runtimes?.[lang] === false ? "No server runtime installed for this language" : "Runtime ready"}
                    >
                      {LANGUAGE_LABELS[lang]} · {runtimes === null ? "detecting" : runtimes[lang] ? "ready" : "no runtime"}
                    </span>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-7 flex flex-col h-full bg-brand-navy/60 min-h-0">
                <div className="px-4 py-2 border-b border-cyan-500/20 flex items-center justify-between bg-black/40 gap-3">
                  <div className="flex items-center gap-3">
                    <label className="font-mono text-xs text-gray-400">Language:</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as Language)}
                      className="bg-brand-navy border border-cyan-500/30 text-cyan-300 font-mono text-xs rounded px-2.5 py-1 focus:outline-none"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang} value={lang}>
                          {LANGUAGE_LABELS[lang]}
                          {runtimes?.[lang] === false ? " (no runtime)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button onClick={resetCode} className="text-xs text-gray-400 hover:text-cyan-300 font-mono">
                    <i className="fa-solid fa-rotate-left mr-1" /> Reset Code
                  </button>
                </div>

                <div className="flex-1 relative font-mono text-xs flex min-h-0">
                  <div
                    ref={gutterRef}
                    className="w-10 bg-black/40 py-3 text-right pr-2 select-none border-r border-cyan-500/10 text-gray-600 overflow-hidden font-mono text-xs leading-relaxed"
                  >
                    {code.split("\n").map((_, index) => (
                      <div key={index}>{index + 1}</div>
                    ))}
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={handleEditorKeyDown}
                    onScroll={syncScroll}
                    spellCheck={false}
                    className="w-full h-full bg-black/80 text-cyan-200 p-3 focus:outline-none font-mono text-xs leading-relaxed resize-none selection:bg-cyan-500 selection:text-black"
                  />
                </div>

                <div className="border-t border-cyan-500/20 bg-black/90 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs text-cyan-400 uppercase">{"// TekQbe Verification Engine"}</span>
                    <button
                      onClick={runCode}
                      disabled={running}
                      className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-orbitron font-extrabold text-xs uppercase rounded hover:shadow-neon-cyan transition-all flex items-center gap-2 disabled:opacity-60"
                    >
                      <i className={`fa-solid ${running ? "fa-spinner fa-spin" : "fa-play"}`} />
                      {running ? "Running..." : "Run & Verify"}
                    </button>
                  </div>

                  <div
                    ref={consoleRef}
                    className="h-40 bg-brand-deep/90 border border-cyan-500/30 rounded p-3 font-mono text-xs overflow-y-auto space-y-1"
                  >
                    {consoleLines.map((line) => (
                      <div key={line.id} className={`${CONSOLE_STYLES[line.kind]} whitespace-pre-wrap break-all`}>
                        {line.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
