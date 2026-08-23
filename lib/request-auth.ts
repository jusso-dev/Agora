import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { verifyApiKey } from "@/lib/apikeys";

export type RequestIdentity = {
  user: { id: string; name: string; email: string } | null;
  via: "session" | "apiKey" | null;
};

export async function authenticateRequest(req: Request): Promise<RequestIdentity> {
  const authorization = req.headers.get("authorization");
  if (authorization?.startsWith("Bearer agora_")) {
    const record = await verifyApiKey(authorization.slice(7));
    if (record) {
      const rows = await db
        .select({ id: user.id, name: user.name, email: user.email })
        .from(user)
        .where(eq(user.id, record.userId))
        .limit(1);
      if (rows[0]) return { user: rows[0], via: "apiKey" };
    }
    return { user: null, via: null };
  }
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user) {
      return {
        user: { id: session.user.id, name: session.user.name, email: session.user.email },
        via: "session",
      };
    }
  } catch {}
  return { user: null, via: null };
}
