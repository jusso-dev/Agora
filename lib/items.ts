import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { evalDef, evalRun, item, itemVersion, team, teamMember, usageEvent } from "@/db/schema";
import { rankItem } from "@/lib/rank";

export type ItemRow = {
  id: string;
  slug: string;
  title: string;
  type: "skill" | "memory";
  description: string;
  level: "starter" | "intermediate" | "advanced";
  visibility: "org" | "team" | "private";
  teamName: string | null;
  teamSlug: string | null;
  authorName: string;
  authorId: string;
  tags: string[];
  deps: string[];
  currentVersion: string;
  usageCount: number;
  successCount: number;
  scanStatus: "clean" | "flagged" | "unknown";
  evalPassRate: number;
  updatedAt: Date;
  score: number;
};

export type ListFilters = {
  q?: string;
  type?: "skill" | "memory";
  team?: string;
  tag?: string;
  level?: "starter" | "intermediate" | "advanced";
  sort?: "rank" | "new" | "used";
  userId?: string;
  viewerId?: string;
  includePrivate?: boolean;
};

function visibilityClause(viewerId?: string, includePrivate?: boolean) {
  if (includePrivate && viewerId) return undefined;
  const base = or(
    eq(item.visibility, "org"),
    viewerId ? eq(item.authorId, viewerId) : undefined,
    viewerId
      ? inArray(
          item.teamId,
          db.select({ id: teamMember.teamId }).from(teamMember).where(eq(teamMember.userId, viewerId)),
        )
      : undefined,
  );
  return base;
}

export async function listItems(filters: ListFilters): Promise<ItemRow[]> {
  const conditions = [];
  const vis = visibilityClause(filters.viewerId, filters.includePrivate);
  if (vis) conditions.push(vis);
  if (filters.type) conditions.push(eq(item.type, filters.type));
  if (filters.level) conditions.push(eq(item.level, filters.level));
  if (filters.team) conditions.push(eq(team.slug, filters.team));
  if (filters.tag)
    conditions.push(sql`exists (select 1 from json_each(${item.tags}) where json_each.value = ${filters.tag})`);
  if (filters.q) {
    const like = `%${filters.q.toLowerCase()}%`;
    conditions.push(
      or(
        sql`lower(${item.title}) like ${like}`,
        sql`lower(${item.description}) like ${like}`,
        sql`lower(${item.slug}) like ${like}`,
        sql`exists (select 1 from json_each(${item.tags}) where lower(json_each.value) like ${like})`,
      ),
    );
  }

  const rows = await db
    .select({
      id: item.id,
      slug: item.slug,
      title: item.title,
      type: item.type,
      description: item.description,
      level: item.level,
      visibility: item.visibility,
      teamName: team.name,
      teamSlug: team.slug,
      authorName: sql<string>`(select name from user where user.id = ${item.authorId})`,
      authorId: item.authorId,
      tags: item.tags,
      deps: item.deps,
      currentVersion: item.currentVersion,
      usageCount: item.usageCount,
      successCount: item.successCount,
      scanStatus: item.scanStatus,
      updatedAt: item.updatedAt,
      evalPassRate: sql<number>`coalesce((
        select avg(case when er.passed then 1.0 else 0.0 end)
        from eval_run er
        join eval_def ed on ed.id = er.eval_def_id
        where ed.item_id = ${item.id}
        and er.created_at >= (
          select coalesce(max(iv.created_at), 0) from item_version iv where iv.item_id = ${item.id} order by iv.created_at desc limit 1 offset 1
        )
      ), 0.5)`,
    })
    .from(item)
    .leftJoin(team, eq(item.teamId, team.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .limit(200);

  const mapped = rows.map((r) => ({
    ...r,
    evalPassRate: Number(r.evalPassRate),
    score: 0,
  }));
  for (const row of mapped) {
    row.score = rankItem(row, { evalPassRate: row.evalPassRate });
  }

  if (filters.sort === "new") mapped.sort((a, b) => +b.updatedAt - +a.updatedAt);
  else if (filters.sort === "used") mapped.sort((a, b) => b.usageCount - a.usageCount);
  else mapped.sort((a, b) => b.score - a.score);

  return mapped;
}

export async function getItemBySlug(slug: string, viewerId?: string) {
  const rows = await db
    .select({
      item,
      teamName: team.name,
      teamSlug: team.slug,
      authorName: sql<string>`(select name from user where user.id = ${item.authorId})`,
    })
    .from(item)
    .leftJoin(team, eq(item.teamId, team.id))
    .where(eq(item.slug, slug))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const vis = row.item.visibility;
  const allowed =
    vis === "org" ||
    (viewerId && row.item.authorId === viewerId) ||
    (viewerId &&
      row.item.teamId &&
      (
        await db
          .select({ id: teamMember.id })
          .from(teamMember)
          .where(and(eq(teamMember.teamId, row.item.teamId), eq(teamMember.userId, viewerId)))
          .limit(1)
      ).length > 0);
  if (!allowed) return null;

  const [versions, evals, traces] = await Promise.all([
    db
      .select()
      .from(itemVersion)
      .where(eq(itemVersion.itemId, row.item.id))
      .orderBy(desc(itemVersion.createdAt)),
    db.select().from(evalDef).where(eq(evalDef.itemId, row.item.id)),
    db
      .select()
      .from(usageEvent)
      .where(eq(usageEvent.itemId, row.item.id))
      .orderBy(desc(usageEvent.createdAt))
      .limit(20),
  ]);

  const evalDefIds = evals.map((e) => e.id);
  const runs = evalDefIds.length
    ? await db
        .select()
        .from(evalRun)
        .where(inArray(evalRun.evalDefId, evalDefIds))
        .orderBy(desc(evalRun.createdAt))
        .limit(50)
    : [];

  const evalPassRate =
    runs.length > 0 ? runs.filter((r) => r.passed).length / runs.length : 0.5;
  const score = rankItem(row.item, {
    evalPassRate,
  });

  return {
    ...row.item,
    teamName: row.teamName,
    teamSlug: row.teamSlug,
    authorName: row.authorName,
    versions,
    evals,
    evalRuns: runs,
    traces,
    evalPassRate,
    score,
  };
}

export async function getVersionContent(itemId: string, version?: string) {
  if (version) {
    const rows = await db
      .select()
      .from(itemVersion)
      .where(and(eq(itemVersion.itemId, itemId), eq(itemVersion.version, version)))
      .limit(1);
    return rows[0] ?? null;
  }
  const rows = await db
    .select()
    .from(itemVersion)
    .where(eq(itemVersion.itemId, itemId))
    .orderBy(desc(itemVersion.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function listTeams() {
  return db.select().from(team).orderBy(team.name);
}

export async function listTags() {
  const rows = await db.all<{ tag: string }>(
    sql`select distinct je.value as tag from item, json_each(item.tags) je order by tag`,
  );
  return rows.map((r) => r.tag);
}

export async function recordUsage(opts: {
  itemId: string;
  version?: string | null;
  userId?: string | null;
  agent?: string;
  outcome: "success" | "partial" | "failure";
  notes?: string;
}) {
  await db.insert(usageEvent).values({
    id: crypto.randomUUID(),
    itemId: opts.itemId,
    version: opts.version ?? null,
    userId: opts.userId ?? null,
    agent: opts.agent ?? "unknown",
    outcome: opts.outcome,
    notes: opts.notes ?? "",
  });
  const bump =
    opts.outcome === "success"
      ? { usageCount: sql`${item.usageCount} + 1`, successCount: sql`${item.successCount} + 1` }
      : { usageCount: sql`${item.usageCount} + 1` };
  await db.update(item).set(bump).where(eq(item.id, opts.itemId));
}

export async function orphanDeps(deps: string[]) {
  if (!deps.length) return [];
  const rows = await db
    .select({ slug: item.slug })
    .from(item)
    .where(inArray(item.slug, deps));
  const found = new Set(rows.map((r) => r.slug));
  return deps.filter((d) => !found.has(d));
}
