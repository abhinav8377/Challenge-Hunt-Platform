import { NextRequest, NextResponse } from "next/server";
import { challengesCol, usersCol } from "@/lib/db";
import { getSessionUserRecord } from "@/lib/auth";
import { firstDiffLine, normalizeOutput } from "@/lib/judge";

type Ctx = { params: Promise<{ id: string }> };

const MAX_PATTERN_LENGTH = 20000;

export async function POST(req: NextRequest, ctx: Ctx) {
  const user = await getSessionUserRecord();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const pattern = String(body?.pattern ?? "");

  if (!pattern.trim()) return NextResponse.json({ error: "Type the pattern before verifying." }, { status: 400 });
  if (pattern.length > MAX_PATTERN_LENGTH) {
    return NextResponse.json({ error: `Pattern exceeds ${MAX_PATTERN_LENGTH} characters.` }, { status: 400 });
  }

  const challenge = await (await challengesCol()).findOne(
    { id },
    { projection: { _id: 0, sampleOutput: 1 } }
  );
  if (!challenge) return NextResponse.json({ error: "Challenge not found." }, { status: 404 });

  const users = await usersCol();
  const fresh = await users.findOne({ id: user.id }, { projection: { _id: 0, solved: 1, patterns: 1 } });
  if (!fresh) return NextResponse.json({ error: "Account not found." }, { status: 401 });

  const alreadyVerified = (fresh.patterns ?? []).includes(id) || fresh.solved.includes(id);
  const matches = normalizeOutput(pattern) === normalizeOutput(challenge.sampleOutput);

  if (matches) {
    if (!alreadyVerified) await users.updateOne({ id: user.id }, { $addToSet: { patterns: id } });
    return NextResponse.json({ verified: true });
  }

  if (alreadyVerified) return NextResponse.json({ verified: true });

  const line = firstDiffLine(pattern, challenge.sampleOutput);
  return NextResponse.json({
    verified: false,
    error: `Pattern mismatch at line ${line}. Reread the problem statement and adjust your pattern.`,
  });
}
