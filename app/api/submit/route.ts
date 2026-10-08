import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDB, mutate } from "@/lib/db";
import { getSessionUserRecord } from "@/lib/auth";
import { judgeCode } from "@/lib/judge";
import { broadcast } from "@/lib/events";
import { broadcastLeaderboard } from "@/lib/leaderboard";
import { LANGUAGES, type Language, type Submission } from "@/lib/types";

const MAX_CODE_LENGTH = 50000;

export async function POST(req: NextRequest) {
  const user = await getSessionUserRecord();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const challengeId = String(body.challengeId ?? "");
  const language = String(body.language ?? "") as Language;
  const code = String(body.code ?? "");

  if (!LANGUAGES.includes(language)) {
    return NextResponse.json({ error: "Unsupported language." }, { status: 400 });
  }
  if (!code.trim()) return NextResponse.json({ error: "Solution code is empty." }, { status: 400 });
  if (code.length > MAX_CODE_LENGTH) {
    return NextResponse.json({ error: `Solution exceeds ${MAX_CODE_LENGTH} characters.` }, { status: 400 });
  }

  const db = await getDB();
  const challenge = db.challenges.find((c) => c.id === challengeId);
  if (!challenge) return NextResponse.json({ error: "Challenge not found." }, { status: 404 });

  const result = await judgeCode(language, code, challenge.sampleOutput);

  let earned = 0;
  const submission: Submission = {
    id: `s-${randomUUID()}`,
    userId: user.id,
    username: user.username,
    challengeId: challenge.id,
    challengeTitle: challenge.title,
    language,
    status: result.status,
    points: 0,
    durationMs: result.durationMs,
    createdAt: new Date().toISOString(),
  };

  const finalSolved = await mutate((d) => {
    const fresh = d.users.find((u) => u.id === user.id);
    if (!fresh) return [] as string[];

    const alreadySolved = fresh.solved.includes(challenge.id);
    if (result.status === "passed" && !alreadySolved) {
      fresh.solved.push(challenge.id);
      fresh.score += challenge.points;
      fresh.lastSeenAt = new Date().toISOString();
      earned = challenge.points;
      submission.points = challenge.points;
    }

    d.submissions.unshift(submission);
    if (d.submissions.length > 300) d.submissions.length = 300;
    return [...fresh.solved];
  });

  if (result.status === "passed") broadcastLeaderboard();
  broadcast({ type: "submissions" });
  broadcast({ type: "stats" });

  return NextResponse.json({
    result,
    earned,
    alreadySolved: result.status === "passed" && earned === 0,
    solved: finalSolved,
  });
}
