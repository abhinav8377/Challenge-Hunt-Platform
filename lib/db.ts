import { promises as fs } from "node:fs";
import path from "node:path";
import type { DB } from "./types";
import { seedDB, starterTemplates } from "./seed";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "db.json");

interface Store {
  db?: Promise<DB>;
  queue: Promise<unknown>;
}

const globalStore = globalThis as unknown as { __htpStore?: Store };

function store(): Store {
  if (!globalStore.__htpStore) globalStore.__htpStore = { queue: Promise.resolve() };
  return globalStore.__htpStore;
}

async function load(): Promise<DB> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    const parsed = JSON.parse(raw) as DB;
    if (!parsed.users || !parsed.challenges) throw new Error("corrupt db");
    if (!parsed.sessions) parsed.sessions = {};
    if (!parsed.submissions) parsed.submissions = [];
    const starters = starterTemplates();
    for (const challenge of parsed.challenges) {
      if (!challenge.codeTemplates) challenge.codeTemplates = { ...starters };
      else if (!challenge.codeTemplates.c) challenge.codeTemplates.c = starters.c;
    }
    return parsed;
  } catch {
    const fresh = seedDB();
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(fresh, null, 2), "utf8");
    return fresh;
  }
}

export async function getDB(): Promise<DB> {
  const s = store();
  if (!s.db) s.db = load();
  return s.db;
}

async function persist(db: DB): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

export async function mutate<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const s = store();
  const next = s.queue.then(async () => {
    const db = await getDB();
    const result = await fn(db);
    await persist(db);
    return result;
  });
  s.queue = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

export function toPublicUser(user: DB["users"][number]) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    score: user.score,
    solvedCount: user.solved.length,
    createdAt: user.createdAt,
    lastSeenAt: user.lastSeenAt,
  };
}
