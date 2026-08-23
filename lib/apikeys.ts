import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { apiKey } from "@/db/schema";

export function generateApiKey() {
  const raw = `agora_${randomBytes(24).toString("hex")}`;
  const prefix = raw.slice(0, 11);
  const keyHash = createHash("sha256").update(raw).digest("hex");
  return { raw, prefix, keyHash };
}

export function hashApiKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export async function verifyApiKey(raw: string) {
  const rows = await db
    .select()
    .from(apiKey)
    .where(eq(apiKey.keyHash, hashApiKey(raw)))
    .limit(1);
  const record = rows[0];
  if (!record || record.revokedAt) return null;
  await db.update(apiKey).set({ lastUsedAt: new Date() }).where(eq(apiKey.id, record.id));
  return record;
}
