import { authenticateRequest } from "@/lib/request-auth";
import { getItemBySlug, getVersionContent } from "@/lib/items";
import { connection } from "next/server";

function frontmatter(meta: Record<string, string | string[] | undefined>) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) lines.push(`${key}: [${value.map((v) => JSON.stringify(v)).join(", ")}]`);
    else lines.push(`${key}: ${JSON.stringify(String(value))}`);
  }
  lines.push("---", "");
  return lines.join("\n");
}

export async function GET(req: Request, ctx: RouteContext<"/api/items/[slug]/raw">) {
  await connection();
  const identity = await authenticateRequest(req);
  const viewerId = identity.user?.id;
  const { slug } = await ctx.params;
  const found = await getItemBySlug(slug, viewerId);
  if (!found || found.visibility === "private") {
    return new Response("Not found\n", { status: 404 });
  }
  const version = new URL(req.url).searchParams.get("v") ?? undefined;
  const content = await getVersionContent(found.id, version);
  if (!content) return new Response("Not found\n", { status: 404 });

  const body =
    frontmatter({
      name: found.slug,
      description: found.description,
      version: content.version,
      type: found.type,
      level: found.level,
      tags: found.tags,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/s/${found.slug}`,
    }) + content.content;

  return new Response(body, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "no-store",
      "x-agora-version": content.version,
      "x-agora-hash": content.contentHash,
    },
  });
}
