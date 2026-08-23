import { authenticateRequest } from "@/lib/request-auth";
import { listItems } from "@/lib/items";
import { connection } from "next/server";

export async function GET(req: Request) {
  await connection();
  const identity = await authenticateRequest(req);
  if (!identity.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const rows = await listItems({
    q: url.searchParams.get("q") ?? undefined,
    type: (url.searchParams.get("type") as "skill" | "memory") ?? undefined,
    team: url.searchParams.get("team") ?? undefined,
    tag: url.searchParams.get("tag") ?? undefined,
    level: (url.searchParams.get("level") as "starter" | "intermediate" | "advanced") ?? undefined,
    sort: (url.searchParams.get("sort") as "rank" | "new" | "used") ?? undefined,
    viewerId: identity.user.id,
  });
  return Response.json({ items: rows });
}
