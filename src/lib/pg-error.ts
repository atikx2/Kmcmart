/**
 * Postgres error inspection.
 *
 * Drizzle wraps driver errors, so the `code` the pg driver set is not on the
 * error you catch — it sits somewhere down the `.cause` chain. Reading
 * `(e as {code?:string}).code` directly looks right and silently never
 * matches, which is exactly how a "this migration has not been run yet"
 * fallback ends up never firing.
 *
 * Four modules had grown their own private copy of this walk. This is the
 * shared one.
 */

/** `undefined_table` — the table does not exist. */
export const PG_UNDEFINED_TABLE = "42P01";
/** `undefined_column` — the table exists but is missing a column. */
export const PG_UNDEFINED_COLUMN = "42703";

/** Walks the cause chain looking for a Postgres SQLSTATE code. */
export function pgErrorCode(e: unknown): string | null {
  let cur: unknown = e;
  for (let i = 0; i < 5 && cur; i++) {
    if (typeof cur === "object") {
      const code = (cur as { code?: unknown }).code;
      if (typeof code === "string" && code !== "") return code;
    }
    cur = (cur as { cause?: unknown }).cause;
  }
  return null;
}

/** True when the failure was a missing table. */
export function isMissingTable(e: unknown): boolean {
  return pgErrorCode(e) === PG_UNDEFINED_TABLE;
}

/**
 * True when the failure was a missing table *or* column — i.e. the schema is
 * behind the code and the owner still has a migration to paste.
 */
export function isMissingSchema(e: unknown): boolean {
  const code = pgErrorCode(e);
  return code === PG_UNDEFINED_TABLE || code === PG_UNDEFINED_COLUMN;
}
