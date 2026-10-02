import { desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { fraudConfig, fraudReports, orders, type FraudConfigRow, type FraudReportRow } from "@/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/courier-crypto";
import { maskKey } from "@/lib/courier";
import {
  FRAUD_DEFAULT_BASE,
  FRAUD_PROVIDER,
  fraudBaseError,
  isBdPhone,
  type FraudCheckReport,
  type FraudConfigPublic,
  type FraudCourier,
} from "@/lib/fraud-check";

/* Server-only. Client components import "@/lib/fraud-check". */
export * from "@/lib/fraud-check";

const TIMEOUT_MS = 12_000;

export type FraudError = { error: string; status: number };

/**
 * A report carries its own `error` string, so `"error" in x` cannot tell the
 * two apart — the HTTP status is what makes a failure a failure.
 */
export function isFraudError(x: FraudCheckReport | FraudError): x is FraudError {
  return typeof (x as FraudError).status === "number";
}

function isMissingTable(e: unknown): boolean {
  let cur: unknown = e;
  for (let i = 0; i < 5 && cur; i++) {
    if (typeof cur === "object" && (cur as { code?: string }).code === "42P01") return true;
    cur = (cur as { cause?: unknown }).cause;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* configuration                                                        */
/* ------------------------------------------------------------------ */

export type FraudState = { row: FraudConfigRow | null; ready: boolean };

export async function loadFraudConfig(): Promise<FraudState> {
  try {
    const rows = await db.select().from(fraudConfig).limit(1);
    if (rows[0]) return { row: rows[0], ready: true };
    const [created] = await db.insert(fraudConfig).values({}).returning();
    return { row: created, ready: true };
  } catch (e) {
    if (isMissingTable(e)) return { row: null, ready: false };
    throw e;
  }
}

export function toPublicFraudConfig(row: FraudConfigRow | null): FraudConfigPublic {
  const apiKey = row ? decryptSecret(row.apiKey) : "";
  return {
    provider: row?.provider ?? FRAUD_PROVIDER,
    baseUrl: row?.baseUrl ?? FRAUD_DEFAULT_BASE,
    apiKeyMask: maskKey(apiKey),
    hasKey: Boolean(apiKey),
    isActive: Boolean(row?.isActive),
    autoCheck: row?.autoCheck ?? true,
    cacheHours: row?.cacheHours ?? 24,
    lastCheckedAt: row?.lastCheckedAt ? row.lastCheckedAt.toISOString() : null,
    lastError: row?.lastError ?? "",
  };
}

export async function saveFraudConfig(body: {
  baseUrl?: unknown;
  apiKey?: unknown;
  isActive?: unknown;
  autoCheck?: unknown;
  cacheHours?: unknown;
  clearKey?: unknown;
}): Promise<FraudConfigPublic | FraudError> {
  const { row, ready } = await loadFraudConfig();
  if (!ready || !row) return { error: "Fraud table is missing — run the migration SQL first", status: 503 };

  const patch: Partial<typeof fraudConfig.$inferInsert> = {};

  if (body.baseUrl !== undefined) {
    const raw = String(body.baseUrl);
    const bad = fraudBaseError(raw);
    if (bad) return { error: bad, status: 400 };
    patch.baseUrl = raw.trim();
  }

  if (body.clearKey) {
    patch.apiKey = "";
    patch.isActive = false;
    patch.lastError = "";
  } else if (body.apiKey !== undefined) {
    const v = String(body.apiKey).trim();
    if (v) {
      if (v.length < 8 || v.length > 200) return { error: "API key looks wrong — check it and paste again", status: 400 };
      patch.apiKey = encryptSecret(v);
    }
  }

  if (body.autoCheck !== undefined) patch.autoCheck = Boolean(body.autoCheck);

  if (body.cacheHours !== undefined) {
    const n = Number(body.cacheHours);
    if (!Number.isFinite(n) || n < 0 || n > 720) return { error: "Cache window must be between 0 and 720 hours", status: 400 };
    patch.cacheHours = Math.round(n);
  }

  if (body.isActive !== undefined && !body.clearKey) {
    const next = Boolean(body.isActive);
    if (next) {
      const key = patch.apiKey !== undefined ? decryptSecret(patch.apiKey) : decryptSecret(row.apiKey);
      if (!key) return { error: "Save the API key before turning fraud check on", status: 400 };
    }
    patch.isActive = next;
  }

  if (Object.keys(patch).length === 0) return { error: "Nothing to update", status: 400 };

  const [updated] = await db.update(fraudConfig).set(patch).where(eq(fraudConfig.id, row.id)).returning();
  return toPublicFraudConfig(updated);
}

/* ------------------------------------------------------------------ */
/* HTTP                                                                 */
/* ------------------------------------------------------------------ */

type Credentials = { baseUrl: string; apiKey: string; row: FraudConfigRow };

async function credentials(requireActive = true): Promise<Credentials | FraudError> {
  const { row, ready } = await loadFraudConfig();
  if (!ready || !row) return { error: "Fraud table is missing — run the migration SQL first", status: 503 };
  const apiKey = decryptSecret(row.apiKey);
  if (!apiKey) return { error: "Fraud check is not connected — add the API key on the API page", status: 400 };
  if (requireActive && !row.isActive) return { error: "Fraud check is switched off — turn it on from the API page", status: 400 };
  return { baseUrl: row.baseUrl, apiKey, row };
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Their `couriers` is an object keyed by courier name; we want a sorted array. */
function parseCouriers(raw: unknown): FraudCourier[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const out: FraudCourier[] = [];
  for (const [name, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const c = v as Record<string, unknown>;
    out.push({
      name: String(name).slice(0, 60),
      total: num(c.total),
      delivered: num(c.delivered),
      cancelled: num(c.cancelled),
    });
  }
  out.sort((a, b) => b.total - a.total);
  return out;
}

type FetchOutcome = { ok: true; report: FraudCheckReport } | { ok: false; error: string };

async function fetchReport(creds: Credentials, phone: string): Promise<FetchOutcome> {
  const url = new URL(creds.baseUrl);
  url.searchParams.set("api_key", creds.apiKey);
  url.searchParams.set("phone", phone);

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const text = await res.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }

    if (!res.ok) {
      const msg =
        body && typeof body === "object" && typeof (body as { message?: unknown }).message === "string"
          ? (body as { message: string }).message
          : "";
      if (res.status === 401 || res.status === 403) return { ok: false, error: msg || "Fraud checker rejected the API key" };
      if (res.status === 429) return { ok: false, error: "Fraud checker rate limit reached — try again shortly" };
      return { ok: false, error: msg || `Fraud checker answered ${res.status}` };
    }

    const b = (body ?? {}) as Record<string, unknown>;
    if (b.success === false) {
      const msg = typeof b.message === "string" ? b.message : "Fraud checker could not read this number";
      return { ok: false, error: msg };
    }

    return {
      ok: true,
      report: {
        phone,
        totalParcels: num(b.total_parcels),
        totalDelivered: num(b.total_delivered),
        totalCancelled: num(b.total_cancelled),
        deliveryRate: num(b.delivery_rate),
        riskStatus: typeof b.risk_status === "string" ? b.risk_status.slice(0, 60) : "",
        couriers: parseCouriers(b.couriers),
        checkedAt: new Date().toISOString(),
        error: "",
      },
    };
  } catch (e) {
    const name = (e as { name?: string })?.name;
    if (name === "TimeoutError" || name === "AbortError") return { ok: false, error: "Fraud checker did not answer in time" };
    return { ok: false, error: "Could not reach the fraud checker — check the Base URL" };
  }
}

/* ------------------------------------------------------------------ */
/* reports                                                              */
/* ------------------------------------------------------------------ */

function rowToReport(r: FraudReportRow): FraudCheckReport {
  return {
    phone: r.phone,
    totalParcels: r.totalParcels,
    totalDelivered: r.totalDelivered,
    totalCancelled: r.totalCancelled,
    deliveryRate: r.deliveryRate,
    riskStatus: r.riskStatus,
    couriers: r.couriers ?? [],
    checkedAt: r.checkedAt ? r.checkedAt.toISOString() : null,
    error: r.error,
  };
}

async function upsertReport(report: FraudCheckReport, error: string) {
  await db
    .insert(fraudReports)
    .values({
      phone: report.phone,
      totalParcels: report.totalParcels,
      totalDelivered: report.totalDelivered,
      totalCancelled: report.totalCancelled,
      deliveryRate: report.deliveryRate,
      riskStatus: report.riskStatus,
      couriers: report.couriers,
      checkedAt: new Date(),
      error,
    })
    .onConflictDoUpdate({
      target: fraudReports.phone,
      set: {
        totalParcels: report.totalParcels,
        totalDelivered: report.totalDelivered,
        totalCancelled: report.totalCancelled,
        deliveryRate: report.deliveryRate,
        riskStatus: report.riskStatus,
        couriers: report.couriers,
        checkedAt: new Date(),
        error,
      },
    });
}

/** Cached reports for a batch of phone numbers — one query for a whole page. */
export async function getFraudReports(phones: string[]): Promise<Map<string, FraudCheckReport>> {
  const map = new Map<string, FraudCheckReport>();
  const unique = [...new Set(phones.filter(Boolean))];
  if (unique.length === 0) return map;
  try {
    const rows = await db.select().from(fraudReports).where(inArray(fraudReports.phone, unique));
    for (const r of rows) map.set(r.phone, rowToReport(r));
  } catch (e) {
    /* Before the migration runs the panel must still render. */
    if (!isMissingTable(e)) throw e;
  }
  return map;
}

export async function getFraudReport(phone: string): Promise<FraudCheckReport | null> {
  const map = await getFraudReports([phone]);
  return map.get(phone.trim()) ?? null;
}

export type CheckOptions = { force?: boolean };

/**
 * Returns the stored report, refreshing it from the provider when it is
 * missing or older than the configured cache window.
 */
export async function checkPhone(
  phoneRaw: string,
  opts: CheckOptions = {}
): Promise<FraudCheckReport | FraudError> {
  const phone = phoneRaw.trim();
  if (!isBdPhone(phone)) return { error: "Not a valid 11-digit BD mobile number", status: 400 };

  const creds = await credentials();
  if ("error" in creds) {
    const cached = await getFraudReport(phone);
    if (cached) return cached;
    return creds;
  }

  if (!opts.force) {
    const cached = await getFraudReport(phone);
    const ageMs = cached?.checkedAt ? Date.now() - new Date(cached.checkedAt).getTime() : Infinity;
    if (cached && !cached.error && ageMs < creds.row.cacheHours * 3_600_000) return cached;
  }

  const outcome = await fetchReport(creds, phone);
  const now = new Date();

  if (!outcome.ok) {
    await db.update(fraudConfig).set({ lastCheckedAt: now, lastError: outcome.error }).where(eq(fraudConfig.id, creds.row.id));
    const cached = await getFraudReport(phone);
    if (cached) return cached;
    return { error: outcome.error, status: 502 };
  }

  await upsertReport(outcome.report, "");
  await db.update(fraudConfig).set({ lastCheckedAt: now, lastError: "" }).where(eq(fraudConfig.id, creds.row.id));
  return outcome.report;
}

/** Connection test for the API page — uses a throwaway number, never stored. */
export async function testFraud(samplePhone: string): Promise<{ ok: boolean; message: string; report?: FraudCheckReport } | FraudError> {
  const phone = samplePhone.trim();
  if (!isBdPhone(phone)) return { error: "Enter a valid 11-digit number to test with", status: 400 };

  const creds = await credentials(false);
  if ("error" in creds) return creds;

  const outcome = await fetchReport(creds, phone);
  const now = new Date();
  if (!outcome.ok) {
    await db.update(fraudConfig).set({ lastCheckedAt: now, lastError: outcome.error }).where(eq(fraudConfig.id, creds.row.id));
    return { ok: false, message: outcome.error };
  }
  await upsertReport(outcome.report, "");
  await db.update(fraudConfig).set({ lastCheckedAt: now, lastError: "" }).where(eq(fraudConfig.id, creds.row.id));
  return { ok: true, message: "Connected", report: outcome.report };
}

/** True when a newly placed order should be checked without being asked. */
export async function autoCheckEnabled(): Promise<boolean> {
  try {
    const { row } = await loadFraudConfig();
    return Boolean(row?.isActive && row.autoCheck && decryptSecret(row.apiKey));
  } catch {
    return false;
  }
}

/**
 * Backstop for the scheduled job: recent orders whose phone has never been
 * checked, or whose report failed. Keeps working even if the post-response
 * hook on the checkout route never fires.
 */
export async function fillMissingFraudReports(limit = 15): Promise<{ checked: number; failed: number }> {
  if (!(await autoCheckEnabled())) return { checked: 0, failed: 0 };

  const rows = await db
    .select({ phone: orders.phone })
    .from(orders)
    .leftJoin(fraudReports, eq(fraudReports.phone, orders.phone))
    .where(
      or(
        isNull(fraudReports.id),
        sql`${fraudReports.error} <> ''`,
        lt(fraudReports.checkedAt, sql`now() - interval '30 days'`)
      )
    )
    .orderBy(desc(orders.createdAt))
    .limit(limit);

  const phones = [...new Set(rows.map((r) => r.phone))].filter(isBdPhone);
  let checked = 0;
  let failed = 0;
  for (const phone of phones) {
    const r = await checkPhone(phone, { force: true });
    if (isFraudError(r)) failed++;
    else checked++;
  }
  return { checked, failed };
}

/** Counts for the API page header. */
export async function fraudSummary(): Promise<{ reports: number; risky: number }> {
  try {
    const [all] = await db.select({ n: sql<number>`count(*)::int` }).from(fraudReports);
    const [risky] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(fraudReports)
      .where(sql`lower(${fraudReports.riskStatus}) like '%high%'`);
    return { reports: all?.n ?? 0, risky: risky?.n ?? 0 };
  } catch (e) {
    if (isMissingTable(e)) return { reports: 0, risky: 0 };
    throw e;
  }
}
