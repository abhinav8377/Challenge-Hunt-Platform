import { NextRequest, NextResponse } from "next/server";
import { mutate } from "@/lib/db";
import { getSessionUserRecord } from "@/lib/auth";
import { starterTemplates } from "@/lib/seed";
import { broadcast } from "@/lib/events";
import { validateChallengeInput } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string }> };

async function requireAdmin() {
  const user = await getSessionUserRecord();
  if (!user) return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  if (user.role !== "admin") {
    return { error: NextResponse.json({ error: "Administrator access required." }, { status: 403 }) };
  }
  return { user };
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const parsed = validateChallengeInput(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const updated = await mutate((db) => {
    const index = db.challenges.findIndex((c) => c.id === id);
    if (index === -1) return null;
    const existing = db.challenges[index];
    db.challenges[index] = {
      ...existing,
      title: parsed.value.title,
      category: parsed.value.category,
      difficulty: parsed.value.difficulty,
      points: parsed.value.points,
      desc: parsed.value.desc,
      sampleOutput: parsed.value.sampleOutput,
      codeTemplates: {
        ...starterTemplates(),
        ...existing.codeTemplates,
        ...(parsed.value.codeTemplates ?? {}),
      },
    };
    return db.challenges[index];
  });

  if (!updated) return NextResponse.json({ error: "Challenge not found." }, { status: 404 });

  broadcast({ type: "challenges" });
  broadcast({ type: "stats" });
  return NextResponse.json({ challenge: updated });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await ctx.params;

  const removed = await mutate((db) => {
    const index = db.challenges.findIndex((c) => c.id === id);
    if (index === -1) return null;
    const [challenge] = db.challenges.splice(index, 1);
    for (const user of db.users) {
      if (user.solved.includes(id)) {
        user.solved = user.solved.filter((s) => s !== id);
        user.score = Math.max(0, user.score - challenge.points);
      }
    }
    db.submissions = db.submissions.filter((s) => s.challengeId !== id);
    return challenge;
  });

  if (!removed) return NextResponse.json({ error: "Challenge not found." }, { status: 404 });

  broadcast({ type: "challenges" });
  broadcast({ type: "leaderboard" });
  broadcast({ type: "submissions" });
  broadcast({ type: "stats" });
  return NextResponse.json({ ok: true });
}
