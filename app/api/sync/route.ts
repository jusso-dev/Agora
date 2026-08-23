import { and, eq, gt, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { item, teamMember } from "@/db/schema";
import { authenticateRequest } from "@/lib/request-auth";
import { connection } from "next/server";

export async function GET(req: Request) {
  await connection();
  const identity = await authenticateRequest(req);
  const viewerId = identity.user?.id;
  const url = new URL(req.url);
  const since = url.searchParams.get("since");

  const conditions = [eq(item.visibility, "org")];
  if (viewerId) {
    const teamIds = db
      .select({ id: teamMember.teamId })
      .from(teamMember)
      .where(eq(teamMember.userId, viewerId));
    conditions.push(or(eq(item.authorId, viewerId), inArray(item.teamId, teamIds))!);
  }
  if (since) {
    const ts = new Date(since);
    if (!Number.isNaN(ts.getTime())) conditions.push(gt(item.updatedAt, ts));
  }

  const rows = await db
    .select({
      slug: item.slug,
      type: item.type,
      version: item.currentVersion,
      hash: item.contentHash,
      updatedAt: item.updatedAt,
    })
    .from(item)
    .where(and(...conditions))
    .orderBy(item.slug);

  return Response.json(
    {
      generatedAt: new Date().toISOString(),
      items: rows.map((r) => ({
        ...r,
        updatedAt: r.updatedAt.toISOString(),
        rawUrl: `/api/items/${r.slug}/raw`,
      })),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
