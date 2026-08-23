import { randomUUID, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { evalDef, evalRun, item, itemVersion, team, teamMember, usageEvent, user } from "../db/schema";
import { auth } from "../lib/auth";
import { scanContent } from "../lib/scan";

for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);

async function ensureUser(name: string, email: string) {
  const existing = await db.select().from(user).where(eq(user.email, email)).limit(1);
  if (existing[0]) return existing[0];
  await auth.api.signUpEmail({ body: { name, email, password: "password1234" } });
  const rows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  return rows[0];
}

const CONTENT = {
  dealReview: `## When to use
Any enterprise contract review before it goes to legal.

## Inputs
- Contract draft (PDF or text)
- Deal size and segment

## Steps
1. Extract all liability, indemnity, and termination clauses.
2. Compare each against the standard playbook positions below.
3. Flag deviations as red / yellow / green.
4. Draft suggested counter-language for every red flag.

## Playbook anchors
- Liability cap: 12 months of fees, mutual.
- Indemnity: capped, carve-out only for IP infringement and data breach.
- Payment terms: net-30, no acceptance-gated payment.

## Output
A table of clause | position | risk | suggested language, plus a go/no-go summary.

## Improvement notes from usage
- v0.3 added net-30 anchor after repeated agent failures on payment terms.`,
  researchBrief: `You are producing a research brief for a busy executive. Rules:

1. Lead with a 5-bullet TL;DR — no preamble.
2. Every claim gets an inline source link.
3. Mark anything unverified as [unverified].
4. End with "What we still don't know" section.

Never pad. Never summarize the summarizer. Aim for under 600 words.`,
  codeReviewSkill: `## When to use
Before approving any PR over ~50 lines.

## Checklist
1. Read the diff twice: first for intent, second for correctness.
2. Check error paths first — happy paths lie.
3. Any new dependency? Justify it or remove it.
4. Tests: do they assert behavior or just execution?
5. Naming: could a new teammate follow this in 6 months?

## Comment style
Ask questions instead of issuing verdicts ("What happens when X is null?" beats "Handle null").
Praise specific things worth copying, once.`,
  incidentComms: `# Incident communication templates

## First message (< 10 min in)
"We are investigating {symptom}. Impact: {scope}. Next update in 15m."

## Ongoing cadence
Every 15 minutes until mitigated, every hour after. Include: current status, user impact, what changed since last update.

## Resolution
Root cause in one sentence. Fix in one sentence. Follow-up owner named.

Tone rules: no speculation about cause until confirmed; never blame individuals; numbers over adjectives ("~15% of EU users", not "many users").`,
  pricingMemory: `Memory of pricing negotiation patterns at this company (updated by agents after each closed deal):

- Enterprise prospects accept list price 60% of the time; discounting beyond 20% rarely closes faster.
- Security review is the real gate in >70% of stalled deals, not price.
- Multi-year commits trade well against price: 3-year term ≈ 15% discount is our sweet spot.
- Procurement pushes back hardest on auto-renewal clauses, not on rates.

When negotiating: lead with term length flexibility before touching rate card.`,
  onboardingMemory: `Memory: how this company actually works (learned from onboarding threads):

- Deploys freeze Thursday 15:00 UTC to Friday; plan merges around it.
- Design reviews happen in #design-critique, async video preferred over meetings.
- The canonical glossary lives in Notion → Company → Glossary; terms there beat tribal abbreviations.
- Expenses over $500 need manager + finance approval, sequential not parallel.

Use these defaults when answering "how does X work here" questions.`,
  migrationSkill: `## When to use
Zero-downtime migrations of high-write Postgres tables.

## Sequence
1. Add new column nullable (or with default) — never NOT NULL immediately.
2. Backfill in batches of 5k rows with \`pg_sleep(0.05)\` between batches.
3. Deploy code writing to both columns, reading old.
4. Flip reads behind a flag; canary 5% traffic first.
5. Only then set NOT NULL + drop old column in a later deploy.

## Anti-patterns
- Long transactions during backfill (lock storms).
- Index creation without CONCURRENTLY on live tables.`,
  interviewLoop: `## When to use
Running any technical interview loop.

## Structure (60 min)
1. Warm-up (5 min): candidate talks through a past project — calibrate communication.
2. Coding (30 min): one realistic problem from our domain, no algorithm trivia.
3. System chat (20 min): design something they've actually built before.
4. Candidate questions (5 min).

## Scoring
Score 1-4 on: signal density, collaboration, ownership. Write evidence quotes, not adjectives. A "2" with quotes beats a "3" with vibes.

## Anti-patterns
- Brainteasers. Riddles measure riddle exposure, nothing else.
- Talking 40%+ of the time.`,
};

type Outcome = "success" | "partial" | "failure";

type SeedItem = {
  slug: string;
  title: string;
  type: "skill" | "memory";
  description: string;
  level: "starter" | "intermediate" | "advanced";
  tags: string[];
  deps?: string[];
  contentKey: keyof typeof CONTENT;
  authorIdx: number;
  teamSlug?: string;
  visibility?: "org" | "team" | "private";
  versions: { version: string; changelog: string }[];
  uses: Outcome[];
};

const SEED_ITEMS: SeedItem[] = [
  {
    slug: "deal-review",
    title: "Enterprise Deal Review",
    type: "skill",
    description: "Reviews contracts against the sales playbook, flags risky clauses, drafts counters.",
    level: "intermediate",
    tags: ["sales", "contracts", "review"],
    contentKey: "dealReview",
    authorIdx: 0,
    teamSlug: "sales",
    versions: [
      { version: "0.1.0", changelog: "Initial playbook extraction" },
      { version: "0.2.0", changelog: "Added risk taxonomy (red/yellow/green)" },
      { version: "0.3.0", changelog: "Net-30 payment anchor after agent feedback loop" },
    ],
    uses: [
      ...Array(14).fill("success"),
      ..."partialpartial".split(""),
      ..."fail".split(""),
    ].map((c) => (c === "s" ? "success" : c === "p" ? "partial" : "failure") as "success" | "partial" | "failure"),
  },
  {
    slug: "research-brief",
    title: "Executive Research Brief",
    type: "skill",
    description: "Produces tight, sourced briefs executives actually read. Under 600 words.",
    level: "starter",
    tags: ["research", "writing", "newbies"],
    contentKey: "researchBrief",
    authorIdx: 1,
    versions: [{ version: "0.1.0", changelog: "Initial version" }],
    uses: [...Array(9).fill("success"), ..."ppf".split("")].map((c) =>
      (c === "s" ? "success" : c === "p" ? "partial" : "failure") as "success" | "partial" | "failure",
    ),
  },
  {
    slug: "pr-review",
    title: "PR Review Discipline",
    type: "skill",
    description: "Structured code review checklist that catches error-path bugs and naming rot.",
    level: "advanced",
    tags: ["engineering", "code-review"],
    contentKey: "codeReviewSkill",
    authorIdx: 2,
    teamSlug: "engineering",
    versions: [
      { version: "0.1.0", changelog: "Checklist draft" },
      { version: "0.1.1", changelog: "Comment style section added" },
    ],
    uses: [...Array(11).fill("success"), ..."pf".split("")].map((c) =>
      (c === "s" ? "success" : c === "p" ? "partial" : "failure") as "success" | "partial" | "failure",
    ),
  },
  {
    slug: "incident-comms",
    title: "Incident Comms Templates",
    type: "skill",
    description: "Status page and customer comms templates with tone rules for incidents.",
    level: "starter",
    tags: ["engineering", "communication", "oncall"],
    deps: [],
    contentKey: "incidentComms",
    authorIdx: 2,
    teamSlug: "engineering",
    versions: [{ version: "0.1.0", changelog: "Initial templates" }],
    uses: [...Array(7).fill("success"), ..."fp".split("")].map((c) =>
      (c === "s" ? "success" : c === "p" ? "partial" : "failure") as "success" | "partial" | "failure",
    ),
  },
  {
    slug: "pricing-negotiation-memory",
    title: "Pricing Negotiation Patterns",
    type: "memory",
    description: "Accumulated memory of what actually works in our pricing negotiations.",
    level: "intermediate",
    tags: ["sales", "pricing", "memory-bank"],
    contentKey: "pricingMemory",
    authorIdx: 0,
    teamSlug: "sales",
    versions: [{ version: "0.1.0", changelog: "Seeded from closed-won retros" }],
    uses: [...Array(8).fill("success"), ..."pf".split("")].map((c) =>
      (c === "s" ? "success" : c === "p" ? "partial" : "failure") as "success" | "partial" | "failure",
    ),
  },
  {
    slug: "company-culture-memory",
    title: "How This Company Actually Works",
    type: "memory",
    description: "Unofficial operating memory: deploy freezes, review norms, glossary pointers.",
    level: "starter",
    tags: ["onboarding", "culture", "newbies"],
    contentKey: "onboardingMemory",
    authorIdx: 1,
    visibility: "org",
    versions: [{ version: "0.1.0", changelog: "Seeded from onboarding threads" }],
    uses: [...Array(6).fill("success"), "partial"].map(() => "success" as const).slice(0, 7),
  },
  {
    slug: "zero-downtime-migration",
    title: "Zero-Downtime Postgres Migrations",
    type: "skill",
    description: "Battle-tested expand/contract sequence for migrating hot tables safely.",
    level: "advanced",
    tags: ["engineering", "database", "postgres"],
    deps: ["pr-review"],
    contentKey: "migrationSkill",
    authorIdx: 2,
    teamSlug: "engineering",
    visibility: "team",
    versions: [{ version: "0.1.0", changelog: "Initial runbook" }],
    uses: [...Array(5).fill("success"), "partial"].map(() => "success" as const),
  },
  {
    slug: "interview-loop",
    title: "Technical Interview Loop",
    type: "skill",
    description: "60-minute loop structure with evidence-based scoring rubric.",
    level: "intermediate",
    tags: ["hiring", "interviewing"],
    contentKey: "interviewLoop",
    authorIdx: 1,
    visibility: "private",
    versions: [{ version: "0.1.0", changelog: "Draft — private while hiring bar is calibrated" }],
    uses: [],
  },
];

const EVALS: Record<string, { name: string; rubric: string; minScore: number }[]> = {
  "deal-review": [
    {
      name: "red-flag-recall",
      rubric: "Given a test contract with 6 planted risky clauses, flags at least 5 with correct risk tier.",
      minScore: 80,
    },
    {
      name: "counter-draft-quality",
      rubric: "Counter-language passes legal review without substantive edits on 4/5 samples.",
      minScore: 70,
    },
  ],
  "research-brief": [
    {
      name: "source-integrity",
      rubric: "All claims carry working source links; zero fabricated citations across 10 briefs.",
      minScore: 90,
    },
  ],
  "pr-review": [
    {
      name: "bug-catch-rate",
      rubric: "Catches seeded bugs in 8 historical diffs (target: 6/8) without false-positive noise.",
      minScore: 75,
    },
  ],
};

async function main() {
  console.log("Seeding…");

  const people = await Promise.all([
    ensureUser("Ava Chen", "ava@agora.dev"),
    ensureUser("Noah Okafor", "noah@agora.dev"),
    ensureUser("Mia Lindqvist", "mia@agora.dev"),
  ]);

  const teamRows = await db
    .insert(team)
    .values([
      { id: randomUUID(), name: "Sales", slug: "sales" },
      { id: randomUUID(), name: "Engineering", slug: "engineering" },
    ])
    .returning();

  await db.insert(teamMember).values([
    { id: randomUUID(), teamId: teamRows[0].id, userId: people[0].id, role: "owner" },
    { id: randomUUID(), teamId: teamRows[0].id, userId: people[1].id, role: "member" },
    { id: randomUUID(), teamId: teamRows[1].id, userId: people[2].id, role: "owner" },
  ]);

  const agents = ["claude-code", "codex", "cursor"];
  let clock = Date.now() - 1000 * 60 * 60 * 24 * 40;

  for (const seed of SEED_ITEMS) {
    const author = people[seed.authorIdx];
    const teamId = seed.teamSlug ? teamRows.find((t) => t.slug === seed.teamSlug)?.id ?? null : null;
    const itemId = randomUUID();
    const finalContent = CONTENT[seed.contentKey];
    const lastVersion = seed.versions[seed.versions.length - 1];

    await db.insert(item).values({
      id: itemId,
      slug: seed.slug,
      title: seed.title,
      type: seed.type,
      description: seed.description,
      level: seed.level,
      visibility: seed.visibility ?? "org",
      teamId,
      authorId: author.id,
      tags: seed.tags,
      deps: seed.deps ?? [],
      currentVersion: lastVersion.version,
      contentHash: hash(finalContent),
      scanStatus: "clean",
      createdAt: new Date(clock),
      updatedAt: new Date(clock),
    });

    for (const v of seed.versions) {
      const scan = scanContent(CONTENT[seed.contentKey]);
      await db.insert(itemVersion).values({
        id: randomUUID(),
        itemId,
        version: v.version,
        changelog: v.changelog,
        content: CONTENT[seed.contentKey],
        contentHash: hash(CONTENT[seed.contentKey]),
        createdBy: author.id,
        scanStatus: scan.status === "flagged" ? "flagged" : "clean",
        createdAt: new Date(clock),
      });
      clock += 1000 * 60 * 60 * 24 * 6;
      await db.update(item).set({ updatedAt: new Date(clock) }).where(eq(item.id, itemId));
    }

    for (const outcome of seed.uses) {
      const version = seed.versions[Math.floor(Math.random() * seed.versions.length)].version;
      await db.insert(usageEvent).values({
        id: randomUUID(),
        itemId,
        version,
        userId: null,
        agent: agents[Math.floor(Math.random() * agents.length)],
        outcome,
        notes:
          outcome === "failure"
            ? "Missed edge case — see suggestion for next revision."
            : outcome === "partial"
              ? "Worked but needed manual touch-up."
              : "",
        createdAt: new Date(clock - Math.random() * 1000 * 60 * 60 * 72),
      });
    }

    await db
      .update(item)
      .set({
        usageCount: seed.uses.length,
        successCount: seed.uses.filter((u) => u === "success").length,
      })
      .where(eq(item.id, itemId));

    for (const e of EVALS[seed.slug] ?? []) {
      const defId = randomUUID();
      await db.insert(evalDef).values({ id: defId, itemId, name: e.name, rubric: e.rubric, minScore: e.minScore });
      const scores = [88, 76, 92];
      for (let i = 0; i < scores.length; i++) {
        await db.insert(evalRun).values({
          id: randomUUID(),
          evalDefId: defId,
          versionId: null,
          score: scores[i],
          passed: scores[i] >= e.minScore,
          summary: `Automated harness run ${i + 1}`,
          runner: "ci-harness",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * (scores.length - i)),
        });
      }
    }
    console.log(`  ✓ ${seed.slug}`);
  }

  console.log("Seed complete. Login: ava@agora.dev / password1234");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
