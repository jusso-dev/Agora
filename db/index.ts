import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

const url = process.env.DATABASE_URL?.replace("file:", "") ?? "./agora.db";

const globalForDb = globalThis as unknown as { __agoraDb?: ReturnType<typeof createDb> };

function createDb() {
  const sqlite = new Database(url);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

export const db = globalForDb.__agoraDb ?? (globalForDb.__agoraDb = createDb());
export { schema };
