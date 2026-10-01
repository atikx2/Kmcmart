import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

function resolveDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.NETLIFY_DATABASE_URL ||
    process.env.NETLIFY_DATABASE_URL_UNPOOLED ||
    undefined
  );
}

type Db = NodePgDatabase<Record<string, never>>;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsPostgresqlDb?: Db;
};

function initDb(): Db {
  if (globalForDb.__arenaNextJsPostgresqlDb) {
    return globalForDb.__arenaNextJsPostgresqlDb;
  }

  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required (or NETLIFY_DATABASE_URL when running on Netlify)"
    );
  }

  const needsSsl =
    /neon\.tech|supabase\.|render\.com|amazonaws\.com|azure\.com/.test(
      databaseUrl
    ) && !/sslmode=/.test(databaseUrl);

  const pool =
    globalForDb.__arenaNextJsPostgresqlPool ??
    new Pool({
      connectionString: databaseUrl,
      ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    });

  const instance = drizzle(pool);
  globalForDb.__arenaNextJsPostgresqlPool = pool;
  globalForDb.__arenaNextJsPostgresqlDb = instance;
  return instance;
}

export function getPool(): Pool {
  initDb();
  return globalForDb.__arenaNextJsPostgresqlPool as Pool;
}

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const real = initDb() as unknown as Record<string | symbol, unknown>;
    const value = Reflect.get(real, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
  has(_target, prop) {
    return Reflect.has(initDb() as object, prop);
  },
});
