import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * Uses DATABASE_URL (local .env) and falls back to the Netlify DB (Neon)
 * variables so `drizzle-kit push` works against production too:
 *   DATABASE_URL="<prod url>" npx drizzle-kit push --force
 */
const url =
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED ||
  process.env.NETLIFY_DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
