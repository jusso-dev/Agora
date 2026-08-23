import { authenticateRequest } from "@/lib/request-auth";
import { getItemBySlug, getVersionContent } from "@/lib/items";
import { connection } from "next/server";

export async function GET(req: Request, ctx: RouteContext<"/api/items/[slug]">) {
  await connection();
  const identity = await authenticateRequest(req);
  if (!identity.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { slug } = await ctx.params;
  const found = await getItemBySlug(slug, identity.user.id);
  if (!found) return Response.json({ error: "Not found" }, { status: 404 });
  const version = new URL(req.url).searchParams.get("v") ?? undefined;
  const content = await getVersionContent(found.id, version);
  return Response.json({
    ...found,
    content: content?.content ?? "",
    resolvedVersion: content?.version ?? null,
  });
}
