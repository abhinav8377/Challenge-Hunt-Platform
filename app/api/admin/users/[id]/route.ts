import { NextRequest, NextResponse } from "next/server";
import { mutate } from "@/lib/db";
import { getSessionUserRecord } from "@/lib/auth";
import { broadcast } from "@/lib/events";
import { broadcastLeaderboard } from "@/lib/leaderboard";

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
  const { user: admin, error } = await requireAdmin();
  if (error) return error;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? "");

  if (action === "reset") {
    const result = await mutate((db) => {
      const user = db.users.find((u) => u.id === id);
      if (!user) return null;
      user.score = 0;
      user.solved = [];
      return user.username;
    });
    if (!result) return NextResponse.json({ error: "User not found." }, { status: 404 });
    broadcastLeaderboard();
    broadcast({ type: "users" });
    broadcast({ type: "stats" });
    return NextResponse.json({ ok: true, username: result });
  }

  if (action === "toggle-role") {
    if (id === admin!.id) {
      return NextResponse.json({ error: "You cannot change your own role." }, { status: 400 });
    }
    const result = await mutate((db) => {
      const user = db.users.find((u) => u.id === id);
      if (!user) return null;
      user.role = user.role === "admin" ? "user" : "admin";
      return { username: user.username, role: user.role };
    });
    if (!result) return NextResponse.json({ error: "User not found." }, { status: 404 });
    broadcast({ type: "users" });
    return NextResponse.json({ ok: true, ...result });
  }

  if (action === "unban") {
    const result = await mutate((db) => {
      const user = db.users.find((u) => u.id === id);
      if (!user) return null;
      user.banned = false;
      user.tabViolations = 0;
      user.bannedAt = undefined;
      return user.username;
    });
    if (!result) return NextResponse.json({ error: "User not found." }, { status: 404 });
    broadcast({ type: "users" });
    return NextResponse.json({ ok: true, username: result });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { user: admin, error } = await requireAdmin();
  if (error) return error;

  const { id } = await ctx.params;
  if (id === admin!.id) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  const removed = await mutate((db) => {
    const index = db.users.findIndex((u) => u.id === id);
    if (index === -1) return null;
    const [user] = db.users.splice(index, 1);
    for (const [token, session] of Object.entries(db.sessions)) {
      if (session.userId === id) delete db.sessions[token];
    }
    return user.username;
  });

  if (!removed) return NextResponse.json({ error: "User not found." }, { status: 404 });

  broadcast({ type: "users" });
  broadcastLeaderboard();
  broadcast({ type: "stats" });
  return NextResponse.json({ ok: true });
}
