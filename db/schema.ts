import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const ts = (name: string) => integer(name, { mode: "timestamp_ms" });
const bool = (name: string) => integer(name, { mode: "boolean" });

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: bool("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: ts("created_at").notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: ts("updated_at").notNull().default(sql`(unixepoch() * 1000)`),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: ts("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: ts("created_at").notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: ts("updated_at").notNull().default(sql`(unixepoch() * 1000)`),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  issuer: text("issuer"),
  accountId: text("account_id"),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: ts("access_token_expires_at"),
  refreshTokenExpiresAt: ts("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: ts("created_at").notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: ts("updated_at").notNull().default(sql`(unixepoch() * 1000)`),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: ts("expires_at").notNull(),
  createdAt: ts("created_at").notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: ts("updated_at").notNull().default(sql`(unixepoch() * 1000)`),
});

export const apiKey = sqliteTable(
  "api_key",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    prefix: text("prefix").notNull(),
    keyHash: text("key_hash").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lastUsedAt: ts("last_used_at"),
    revokedAt: ts("revoked_at"),
    createdAt: ts("created_at").notNull().default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("api_key_user_idx").on(t.userId)],
);

export const team = sqliteTable("team", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: ts("created_at").notNull().default(sql`(unixepoch() * 1000)`),
});

export const teamMember = sqliteTable(
  "team_member",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "member"] }).notNull().default("member"),
    createdAt: ts("created_at").notNull().default(sql`(unixepoch() * 1000)`),
  },
  (t) => [uniqueIndex("team_member_unique").on(t.teamId, t.userId)],
);

export const item = sqliteTable(
  "item",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    type: text("type", { enum: ["skill", "memory"] }).notNull(),
    description: text("description").notNull(),
    level: text("level", { enum: ["starter", "intermediate", "advanced"] })
      .notNull()
      .default("intermediate"),
    visibility: text("visibility", { enum: ["org", "team", "private"] })
      .notNull()
      .default("org"),
    teamId: text("team_id").references(() => team.id, { onDelete: "set null" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
    deps: text("deps", { mode: "json" }).$type<string[]>().notNull().default([]),
    currentVersion: text("current_version").notNull().default("0.1.0"),
    contentHash: text("content_hash").notNull().default(""),
    usageCount: integer("usage_count").notNull().default(0),
    successCount: integer("success_count").notNull().default(0),
    scanStatus: text("scan_status", { enum: ["clean", "flagged", "unknown"] })
      .notNull()
      .default("unknown"),
    scanFindings: text("scan_findings", { mode: "json" })
      .$type<{ rule: string; line: number; excerpt: string }[]>()
      .notNull()
      .default([]),
    createdAt: ts("created_at").notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: ts("updated_at").notNull().default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("item_type_idx").on(t.type), index("item_visibility_idx").on(t.visibility)],
);

export const itemVersion = sqliteTable(
  "item_version",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id")
      .notNull()
      .references(() => item.id, { onDelete: "cascade" }),
    version: text("version").notNull(),
    changelog: text("changelog").notNull().default(""),
    content: text("content").notNull(),
    contentHash: text("content_hash").notNull(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    scanStatus: text("scan_status", { enum: ["clean", "flagged"] }).notNull().default("clean"),
    createdAt: ts("created_at").notNull().default(sql`(unixepoch() * 1000)`),
  },
  (t) => [uniqueIndex("item_version_unique").on(t.itemId, t.version)],
);

export const usageEvent = sqliteTable(
  "usage_event",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id")
      .notNull()
      .references(() => item.id, { onDelete: "cascade" }),
    version: text("version"),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    agent: text("agent").notNull().default("unknown"),
    outcome: text("outcome", { enum: ["success", "partial", "failure"] }).notNull(),
    notes: text("notes").notNull().default(""),
    createdAt: ts("created_at").notNull().default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("usage_event_item_idx").on(t.itemId)],
);

export const evalDef = sqliteTable("eval_def", {
  id: text("id").primaryKey(),
  itemId: text("item_id")
    .notNull()
    .references(() => item.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  rubric: text("rubric").notNull(),
  minScore: integer("min_score").notNull().default(70),
  createdAt: ts("created_at").notNull().default(sql`(unixepoch() * 1000)`),
});

export const evalRun = sqliteTable(
  "eval_run",
  {
    id: text("id").primaryKey(),
    evalDefId: text("eval_def_id")
      .notNull()
      .references(() => evalDef.id, { onDelete: "cascade" }),
    versionId: text("version_id").references(() => itemVersion.id, { onDelete: "set null" }),
    score: integer("score").notNull(),
    passed: bool("passed").notNull(),
    summary: text("summary").notNull().default(""),
    runner: text("runner").notNull().default("manual"),
    createdAt: ts("created_at").notNull().default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("eval_run_def_idx").on(t.evalDefId)],
);

export type User = typeof user.$inferSelect;
export type Item = typeof item.$inferSelect;
export type ItemVersion = typeof itemVersion.$inferSelect;
export type Team = typeof team.$inferSelect;
