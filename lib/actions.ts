"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { item, itemVersion } from "@/db/schema";
import { auth } from "@/lib/auth";
import { scanContent } from "@/lib/scan";
import { orphanDeps } from "@/lib/items";
import { createHash, randomUUID } from "node:crypto";

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  return session.user;
}

function slugify(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || randomUUID().slice(0, 8);
}

export type FormState = { error?: string };

export async function createItemAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const type = formData.get("type") === "memory" ? "memory" : "skill";
  const description = String(formData.get("description") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const level = String(formData.get("level") ?? "intermediate") as
    | "starter"
    | "intermediate"
    | "advanced";
  const visibility = String(formData.get("visibility") ?? "org") as "org" | "team" | "private";
  const teamIdRaw = String(formData.get("teamId") ?? "");
  const teamId = visibility === "team" && teamIdRaw ? teamIdRaw : null;
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const deps = String(formData.get("deps") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (!title || !description || !content) {
    return { error: "Title, description and content are required." };
  }
  if (visibility === "team" && !teamId) {
    return { error: "Pick a team for team-visible items." };
  }

  let slug = slugify(title);
  const existing = await db.select({ id: item.id }).from(item).where(eq(item.slug, slug)).limit(1);
  if (existing.length) slug = `${slug}-${randomUUID().slice(0, 4)}`;

  const missingDeps = await orphanDeps(deps);
  if (missingDeps.length) {
    return { error: `Unknown dependency slugs: ${missingDeps.join(", ")}` };
  }

  const scan = scanContent(content);

  await db.insert(item).values({
    id: crypto.randomUUID(),
    slug,
    title,
    type,
    description,
    level,
    visibility,
    teamId,
    authorId: user.id,
    tags,
    deps,
    currentVersion: "0.1.0",
    contentHash: createHash("sha256").update(content).digest("hex").slice(0, 16),
    scanStatus: scan.status,
    scanFindings: scan.findings,
  });
  await db.insert(itemVersion).values({
    id: crypto.randomUUID(),
    itemId: (
      await db.select({ id: item.id }).from(item).where(eq(item.slug, slug)).limit(1)
    )[0].id,
    version: "0.1.0",
    changelog: "Initial version",
    content,
    contentHash: createHash("sha256").update(content).digest("hex").slice(0, 16),
    createdBy: user.id,
    scanStatus: scan.status === "flagged" ? "flagged" : "clean",
  });

  revalidatePath("/");
  redirect(`/s/${slug}`);
}

export async function createVersionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();

  const slug = String(formData.get("slug") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  const changelog = String(formData.get("changelog") ?? "").trim();
  const bumpRaw = String(formData.get("bump") ?? "patch");

  const rows = await db.select().from(item).where(eq(item.slug, slug)).limit(1);
  const current = rows[0];
  if (!current) return { error: "Item not found." };
  if (current.authorId !== user.id) {
    return { error: "Only the author can publish new versions." };
  }
  if (!content) return { error: "Content is required." };

  const [major, minor, patch] = current.currentVersion.split(".").map(Number);
  const next =
    bumpRaw === "major"
      ? `${major + 1}.0.0`
      : bumpRaw === "minor"
        ? `${major}.${minor + 1}.0`
        : `${major}.${minor}.${patch + 1}`;

  const scan = scanContent(content);
  const hash = createHash("sha256").update(content).digest("hex").slice(0, 16);

  await db.insert(itemVersion).values({
    id: crypto.randomUUID(),
    itemId: current.id,
    version: next,
    changelog: changelog || "No changelog provided",
    content,
    contentHash: hash,
    createdBy: user.id,
    scanStatus: scan.status === "flagged" ? "flagged" : "clean",
  });
  await db
    .update(item)
    .set({
      currentVersion: next,
      contentHash: hash,
      scanStatus: scan.status,
      scanFindings: scan.findings,
      updatedAt: new Date(),
    })
    .where(eq(item.id, current.id));

  revalidatePath("/");
  revalidatePath(`/s/${slug}`);
  redirect(`/s/${slug}`);
}

export async function logUsageAction(input: {
  slug: string;
  outcome: "success" | "partial" | "failure";
  notes?: string;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { ok: false, error: "Sign in first" };
  const rows = await db.select({ id: item.id }).from(item).where(eq(item.slug, input.slug)).limit(1);
  if (!rows[0]) return { ok: false, error: "Not found" };
  const { recordUsage } = await import("@/lib/items");
  await recordUsage({
    itemId: rows[0].id,
    userId: session.user.id,
    agent: "web-ui",
    outcome: input.outcome,
    notes: input.notes,
  });
  revalidatePath(`/s/${input.slug}`);
  return { ok: true };
}
