import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

let initPromise: Promise<void> | null = null;

export async function ensureDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable."
    );
  }
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await env.DB.exec(`
          CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS feedback (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, author TEXT NOT NULL, name TEXT NOT NULL, rating INTEGER NOT NULL, category TEXT NOT NULL, message TEXT NOT NULL, status TEXT NOT NULL, response TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, status TEXT NOT NULL, note TEXT NOT NULL, actor TEXT NOT NULL, updated_at TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL, size INTEGER NOT NULL, uploader TEXT NOT NULL, created_at TEXT NOT NULL);
        `);
      } catch (err) {
        console.warn("D1 init error:", err);
      }
    })();
  }
  await initPromise;
  return drizzle(env.DB, { schema });
}

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable."
    );
  }
  if (!initPromise) {
    void ensureDb();
  }
  return drizzle(env.DB, { schema });
}

