import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { authenticateRequest, type RequestIdentity } from "@/lib/request-auth";
import { getItemBySlug, getVersionContent, listItems, recordUsage } from "@/lib/items";
import { db } from "@/db";
import { evalDef, evalRun, itemVersion } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

function buildServer(identity: RequestIdentity) {
  const server = new McpServer({
    name: "agora",
    version: "0.1.0",
  });

  server.registerTool(
    "search_items",
    {
      title: "Search the library",
      description:
        "Search the organisation's shared library of skills and agent memories. Returns ranked results (best first) with usage success rates so you can pick proven ones instead of rebuilding.",
      inputSchema: {
        query: z.string().optional().describe("Free-text search over title/description/tags"),
        type: z.enum(["skill", "memory"]).optional(),
        tag: z.string().optional(),
        level: z.enum(["starter", "intermediate", "advanced"]).optional(),
        limit: z.number().int().min(1).max(25).optional().default(10),
      },
    },
    async ({ query, type, tag, level, limit }) => {
      const rows = await listItems({ q: query, type, tag, level, sort: "rank", viewerId: identity.user!.id });
      const items = rows.slice(0, limit ?? 10).map((r) => ({
        slug: r.slug,
        title: r.title,
        type: r.type,
        description: r.description,
        version: r.currentVersion,
        level: r.level,
        tags: r.tags,
        rank_score: r.score,
        uses: r.usageCount,
        success_rate: r.usageCount ? Math.round((r.successCount / r.usageCount) * 100) / 100 : null,
      }));
      return {
        content: [{ type: "text" as const, text: JSON.stringify(items, null, 2) }],
      };
    },
  );

  server.registerTool(
    "get_item",
    {
      title: "Get an item",
      description:
        "Fetch full markdown content of a skill or memory by slug, plus metadata (version, deps, author, usage). Use search_items first if you don't know the slug.",
      inputSchema: {
        slug: z.string().describe("Item slug, e.g. deal-review"),
        version: z.string().optional().describe("Specific version; defaults to latest"),
      },
    },
    async ({ slug, version }) => {
      const found = await getItemBySlug(slug, identity.user!.id);
      if (!found) return { content: [{ type: "text" as const, text: `Not found: ${slug}` }], isError: true };
      const content = await getVersionContent(found.id, version);
      if (!content) return { content: [{ type: "text" as const, text: `Version not found: ${version ?? "latest"}` }], isError: true };
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                slug: found.slug,
                title: found.title,
                type: found.type,
                description: found.description,
                version: content.version,
                deps: found.deps,
                tags: found.tags,
                author: found.authorName,
                scanStatus: found.scanStatus,
                content,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    "record_usage",
    {
      title: "Record usage outcome",
      description:
        "Log that you used a skill/memory and how it went. This feeds the improvement loop: success rates update ranking and authors see failure notes. Always call after applying an item's guidance.",
      inputSchema: {
        slug: z.string(),
        outcome: z.enum(["success", "partial", "failure"]),
        notes: z.string().optional().describe("What worked, what failed, suggested improvements"),
        agent: z.string().optional().describe("Your name, e.g. claude-code, codex, cursor"),
      },
    },
    async ({ slug, outcome, notes, agent }) => {
      const found = await getItemBySlug(slug, identity.user!.id);
      if (!found) return { content: [{ type: "text" as const, text: `Not found: ${slug}` }], isError: true };
      await recordUsage({
        itemId: found.id,
        userId: identity.user!.id,
        agent: agent ?? identity.via ?? "unknown",
        outcome,
        notes,
      });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ ok: true, slug, outcome, message: "Logged. Thanks for feeding the loop." }),
          },
        ],
      };
    },
  );

  server.registerTool(
    "submit_eval_run",
    {
      title: "Submit an eval run",
      description:
        "Report a quality score for an item against one of its named evals. Keeps quality measurable instead of vibes-based.",
      inputSchema: {
        slug: z.string(),
        evalName: z.string().optional().describe("Name of the eval; omit for 'ad-hoc'"),
        score: z.number().int().min(0).max(100),
        passed: z.boolean(),
        summary: z.string().optional(),
      },
    },
    async ({ slug, evalName, score, passed, summary }) => {
      const found = await getItemBySlug(slug, identity.user!.id);
      if (!found) return { content: [{ type: "text" as const, text: `Not found: ${slug}` }], isError: true };
      let def =
        (evalName
          ? (await db.select().from(evalDef).where(and(eq(evalDef.itemId, found.id), eq(evalDef.name, evalName))).limit(1))[0]
          : undefined) ??
        (await db.select().from(evalDef).where(eq(evalDef.itemId, found.id)).orderBy(desc(evalDef.createdAt)).limit(1))[0];
      if (!def) {
        const inserted = await db
          .insert(evalDef)
          .values({
            id: crypto.randomUUID(),
            itemId: found.id,
            name: evalName ?? "ad-hoc",
            rubric: summary ?? "Ad-hoc evaluation submitted by an agent",
            minScore: 70,
          })
          .returning();
        def = inserted[0];
      }
      const latest = await db
        .select({ id: itemVersion.id })
        .from(itemVersion)
        .where(eq(itemVersion.itemId, found.id))
        .orderBy(desc(itemVersion.createdAt))
        .limit(1);
      await db.insert(evalRun).values({
        id: crypto.randomUUID(),
        evalDefId: def.id,
        versionId: latest[0]?.id ?? null,
        score,
        passed,
        summary: summary ?? "",
        runner: agentLabel(identity),
      });
      return { content: [{ type: "text" as const, text: JSON.stringify({ ok: true, slug, eval: def.name, score, passed }) }] };
    },
  );

  server.registerTool(
    "list_updates",
    {
      title: "List recent updates",
      description:
        "Recently created/updated skills and memories across the library — use to stay current without human browsing.",
      inputSchema: {
        limit: z.number().int().min(1).max(25).optional().default(10),
      },
    },
    async ({ limit }) => {
      const rows = await listItems({ sort: "new", viewerId: identity.user!.id });
      const items = rows.slice(0, limit ?? 10).map((r) => ({
        slug: r.slug,
        title: r.title,
        type: r.type,
        version: r.currentVersion,
        updated_at: r.updatedAt,
      }));
      return { content: [{ type: "text" as const, text: JSON.stringify(items, null, 2) }] };
    },
  );

  server.registerResource(
    "item-content",
    new ResourceTemplate("item://{slug}", { list: undefined }),
    {
      title: "Skill or memory markdown",
      description: "Raw latest-version markdown for an item",
    },
    async (uri, { slug }) => {
      const found = await getItemBySlug(decodeURIComponent(String(slug)), identity.user!.id);
      if (!found) throw new Error(`Not found: ${uri.href}`);
      const content = await getVersionContent(found.id);
      return {
        contents: [{ uri: uri.href, mimeType: "text/markdown", text: content?.content ?? "" }],
      };
    },
  );

  return server;
}

function agentLabel(identity: RequestIdentity) {
  return identity.via === "apiKey" ? `api-key:${identity.user!.name}` : `user:${identity.user!.name}`;
}

export async function POST(req: Request) {
  const identity = await authenticateRequest(req);
  if (!identity.user) {
    return Response.json(
      { jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized: pass Authorization: Bearer <agora api key>" } },
      { status: 401 },
    );
  }
  const server = buildServer(identity);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(req);
  } finally {
    await transport.close();
    await server.close();
  }
}

export async function GET() {
  return new Response("Method not allowed. POST JSON-RPC to this endpoint.\n", { status: 405 });
}

export async function DELETE() {
  return new Response(null, { status: 405 });
}
