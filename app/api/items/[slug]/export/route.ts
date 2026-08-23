import { zipSync, strToU8 } from "fflate";
import { authenticateRequest } from "@/lib/request-auth";
import { getItemBySlug, getVersionContent } from "@/lib/items";

export async function GET(req: Request, ctx: RouteContext<"/api/items/[slug]/export">) {
  const identity = await authenticateRequest(req);
  const viewerId = identity.user?.id;
  const { slug } = await ctx.params;
  const found = await getItemBySlug(slug, viewerId);
  if (!found || found.visibility !== "org") {
    return new Response("Not found", { status: 404 });
  }
  const version = new URL(req.url).searchParams.get("v") ?? undefined;
  const content = await getVersionContent(found.id, version);
  if (!content) return new Response("Not found", { status: 404 });

  const filename = found.type === "skill" ? "SKILL.md" : "MEMORY.md";
  const meta = {
    slug: found.slug,
    title: found.title,
    type: found.type,
    description: found.description,
    level: found.level,
    tags: found.tags,
    deps: found.deps,
    version: content.version,
    author: found.authorName,
    team: found.teamName,
    source: `${process.env.NEXT_PUBLIC_APP_URL}/s/${found.slug}`,
    exportedAt: new Date().toISOString(),
  };

  const zip = zipSync({
    [`${found.slug}/${filename}`]: strToU8(content.content),
    [`${found.slug}/agora.json`]: strToU8(JSON.stringify(meta, null, 2)),
  });

  return new Response(new Uint8Array(zip), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${found.slug}-${content.version}.zip"`,
    },
  });
}
