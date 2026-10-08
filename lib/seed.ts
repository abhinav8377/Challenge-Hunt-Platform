import type { Challenge, DB, Language } from "./types";
import { hashPassword } from "./password";

export function starterTemplates(): Record<Language, string> {
  return {
    javascript: `function generatePattern() {\n  // Write your pattern logic here\n  // Tip: build the pattern line by line, then console.log(output)\n}\n\ngeneratePattern();`,
    c: `#include <stdio.h>\n\nint main(void) {\n    // Write your pattern logic here\n    return 0;\n}\n`,
  };
}

const SEED_CHALLENGES: Omit<Challenge, "codeTemplates" | "createdAt">[] = [
  {
    id: "c-triangle",
    title: "Right Triangle Star Matrix",
    category: "Pyramid",
    difficulty: "Easy",
    points: 100,
    desc: "Write code to generate a 5-row right-angled triangle matrix of asterisks. Row i must contain exactly i stars.",
    sampleOutput: "*\n**\n***\n****\n*****",
  },
  {
    id: "c-number-grid",
    title: "Number Square Grid",
    category: "Numerical",
    difficulty: "Medium",
    points: 200,
    desc: "Generate a 4x4 grid where each row contains the numbers 1 to 4 separated by single spaces.",
    sampleOutput: "1 2 3 4\n1 2 3 4\n1 2 3 4\n1 2 3 4",
  },
  {
    id: "c-hollow-box",
    title: "Hollow Boundary Box",
    category: "Matrix",
    difficulty: "Hard",
    points: 350,
    desc: "Construct a 5x5 hollow matrix. Only the outer edge elements contain asterisks, the interior is empty spaces.",
    sampleOutput: "*****\n*   *\n*   *\n*   *\n*****",
  },
  {
    id: "c-inverted-pyramid",
    title: "Inverted Star Pyramid",
    category: "Pyramid",
    difficulty: "Medium",
    points: 150,
    desc: "Print an inverted pyramid of 5 rows using asterisks. Each row is padded with leading spaces so the pyramid stays centered.",
    sampleOutput: "*****\n ****\n  ***\n   **\n    *",
  },
  {
    id: "c-floyds-triangle",
    title: "Floyd's Number Triangle",
    category: "Numerical",
    difficulty: "Medium",
    points: 200,
    desc: "Generate Floyd's triangle with 4 rows. Numbers start at 1 and each row contains one more number than the previous row, separated by single spaces.",
    sampleOutput: "1\n2 3\n4 5 6\n7 8 9 10",
  },
  {
    id: "c-diamond",
    title: "Diamond Star Matrix",
    category: "Matrix",
    difficulty: "Hard",
    points: 300,
    desc: "Print a symmetric diamond of asterisks with 5 rows: an upward pyramid of 3 rows followed by a mirrored downward pyramid of 2 rows.",
    sampleOutput: "  *\n ***\n*****\n ***\n  *",
  },
];

export function seedDB(): DB {
  const now = new Date().toISOString();
  const templates = starterTemplates();

  const adminCreds = hashPassword("admin_abhinav_0001");
  const botCreds = hashPassword("bot_no_login");

  const challenges: Challenge[] = SEED_CHALLENGES.map((c) => ({
    ...c,
    codeTemplates: { ...templates },
    createdAt: now,
  }));

  return {
    users: [
      {
        id: "u-admin",
        username: "admin_abhinav",
        email: "admin_abhinav@tekqbe.io",
        passwordHash: adminCreds.hash,
        salt: adminCreds.salt,
        role: "admin",
        score: 0,
        solved: [],
        createdAt: now,
        lastSeenAt: now,
      },
      {
        id: "u-apex",
        username: "ApexCoder",
        email: "apexcoder@bots.tekqbe.io",
        passwordHash: botCreds.hash,
        salt: botCreds.salt,
        role: "user",
        score: 650,
        solved: ["c-triangle", "c-number-grid", "c-hollow-box"],
        createdAt: now,
        lastSeenAt: now,
        bot: true,
      },
      {
        id: "u-pattern",
        username: "PatternMaster",
        email: "patternmaster@bots.tekqbe.io",
        passwordHash: botCreds.hash,
        salt: botCreds.salt,
        role: "user",
        score: 450,
        solved: ["c-inverted-pyramid", "c-diamond"],
        createdAt: now,
        lastSeenAt: now,
        bot: true,
      },
      {
        id: "u-matrix",
        username: "MatrixHacker",
        email: "matrixhacker@bots.tekqbe.io",
        passwordHash: botCreds.hash,
        salt: botCreds.salt,
        role: "user",
        score: 200,
        solved: ["c-number-grid"],
        createdAt: now,
        lastSeenAt: now,
        bot: true,
      },
    ],
    challenges,
    sessions: {},
    submissions: [],
  };
}
