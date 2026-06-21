import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

import { env } from "~/env";
import * as schema from "./schema";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
  initialized: boolean | undefined;
};

export const conn = globalForDb.conn ?? postgres(env.DATABASE_URL);
if (env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });

// Lazily verify/enable pgvector extension once
if (!globalForDb.initialized) {
  globalForDb.initialized = true;
  db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`)
    .then(() => {
      console.info("[DB] pgvector extension checked/enabled successfully.");
    })
    .catch((err) => {
      console.error("[DB] Failed to ensure pgvector extension:", err);
    });
}

