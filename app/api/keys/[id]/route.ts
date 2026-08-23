import { headers } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { apiKey } from "@/db/schema";
import { auth } from "@/lib/auth";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/keys/[id]">) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await db
    .update(apiKey)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKey.id, id), eq(apiKey.userId, session.user.id), isNull(apiKey.revokedAt)));
  return Response.json({ ok: true });
}
