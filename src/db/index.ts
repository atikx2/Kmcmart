import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Connection string resolution order:
 *  1. DATABASE_URL                     — local dev / any host
 *  2. NETLIFY_DATABASE_URL             — Netlify DB (Neon), pooled connection
 *  3. NETLIFY_DATABASE_URL_UNPOOLED    — Netlify DB direct connection
 * This lets the same code run locally and on Netlify with zero config.
 */
const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required (or NETLIFY_DATABASE_URL when running on Netlify)"
  );
}

const needsSsl =
  /neon\.tech|supabase\.|render\.com|amazonaws\.com/.test(databaseUrl) &&
  !/sslmode=/.test(databaseUrl);

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
