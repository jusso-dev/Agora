import { headers } from "next/headers";
import { connection } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { apiKey } from "@/db/schema";
import { auth } from "@/lib/auth";
import { generateApiKey } from "@/lib/apikeys";

export async function GET() {
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db
    .select({
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      lastUsedAt: apiKey.lastUsedAt,
      createdAt: apiKey.createdAt,
    })
    .from(apiKey)
    .where(and(eq(apiKey.userId, session.user.id), isNull(apiKey.revokedAt)))
    .orderBy(desc(apiKey.createdAt));
  return Response.json(rows);
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 60) : "unnamed";
  const generated = generateApiKey();
  const inserted = await db
    .insert(apiKey)
    .values({
      id: crypto.randomUUID(),
      name,
      prefix: generated.prefix,
      keyHash: generated.keyHash,
      userId: session.user.id,
    })
    .returning({ id: apiKey.id });
  return Response.json({ id: inserted[0].id, key: generated.raw }, { status: 201 });
}
