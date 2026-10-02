import { and, eq, inArray, isNotNull, isNull, notInArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { courierConfig, orders, type CourierConfigRow } from "@/db/schema";
import { authSecretIsSet, decryptSecret, encryptSecret } from "@/lib/courier-crypto";
import {
  COURIER_BULK_MAX,
  COURIER_DEFAULT_BASE,
  COURIER_STATUS,
  COURIER_TO_ORDER_STATUS,
  COURIER_LIMITS,
  COURIER_PROVIDER,
  courierBaseError,
  courierInvoice,
  courierSafeText,
  isBdPhone,
  maskKey,
  normalizeBase,
  type CourierConfigPublic,
  type CourierFraudReport,
  type CourierSyncSummary,
  type CourierSendResult,
} from "@/lib/courier";

/* Server-only. Client components import "@/lib/courier". */
export * from "@/lib/courier";
export { authSecretIsSet };

/** Courier calls go over the public internet — never let one hang a request. */
const TIMEOUT_MS = 20_000;

/* ------------------------------------------------------------------ */
/* configuration row                                                    */
/* ------------------------------------------------------------------ */

function isMissingTable(e: unknown): boolean {
  let cur: unknown = e;
  for (let i = 0; i < 5 && cur; i++) {
    if (typeof cur === "object" && (cur as { code?: string }).code === "42P01") return true;
    cur = (cur as { cause?: unknown }).cause;
  }
  return false;
}

export type CourierState = { row: CourierConfigRow | null; ready: boolean };

/** Reads the single config row, creating it the first time. */
export async function loadCourierConfig(): Promise<CourierState> {
  try {
    const rows = await db.select().from(courierConfig).limit(1);
    if (rows[0]) return { row: rows[0], ready: true };
    const [created] = await db.insert(courierConfig).values({}).returning();
    return { row: created, ready: true };
  } catch (e) {
    /* Table not created yet — the panel shows a "run the SQL" notice instead
       of a 500, exactly like the order statuses do. */
    if (isMissingTable(e)) return { row: null, ready: false };
    throw e;
  }
}

export function toPublicConfig(row: CourierConfigRow | null): CourierConfigPublic {
  const apiKey = row ? decryptSecret(row.apiKey) : "";
  const secretKey = row ? decryptSecret(row.secretKey) : "";
  return {
    provider: row?.provider ?? COURIER_PROVIDER,
    baseUrl: row?.baseUrl ?? COURIER_DEFAULT_BASE,
    apiKeyMask: maskKey(apiKey),
    secretKeyMask: maskKey(secretKey),
    hasKeys: Boolean(apiKey && secretKey),
    isActive: Boolean(row?.isActive),
    sentStatusKey: row?.sentStatusKey ?? "confirmed",
    lastBalance: row?.lastBalance ?? null,
    lastCheckedAt: row?.lastCheckedAt ? row.lastCheckedAt.toISOString() : null,
    lastError: row?.lastError ?? "",
    autoSync: row?.autoSync ?? true,
    lastSyncAt: row?.lastSyncAt ? row.lastSyncAt.toISOString() : null,
    lastSyncCount: row?.lastSyncCount ?? null,
    lastSyncError: row?.lastSyncError ?? "",
  };
}

export type CourierError = { error: string; status: number };

export async function saveCourierConfig(body: {
  baseUrl?: unknown;
  apiKey?: unknown;
  secretKey?: unknown;
  isActive?: unknown;
  sentStatusKey?: unknown;
  autoSync?: unknown;
  clearKeys?: unknown;
}): Promise<CourierConfigPublic | CourierError> {
  const { row, ready } = await loadCourierConfig();
  if (!ready || !row) return { error: "Courier table is missing — run the migration SQL first", status: 503 };

  const patch: Partial<typeof courierConfig.$inferInsert> = {};

  if (body.baseUrl !== undefined) {
    const raw = String(body.baseUrl);
    const bad = courierBaseError(raw);
    if (bad) return { error: bad, status: 400 };
    patch.baseUrl = normalizeBase(raw);
  }

  if (body.clearKeys) {
    patch.apiKey = "";
    patch.secretKey = "";
    patch.isActive = false;
    patch.lastBalance = null;
    patch.lastError = "";
  } else {
    /* An empty string means "leave what is already saved" — the browser only
       ever receives a mask, so it cannot echo the real key back. */
    if (body.apiKey !== undefined) {
      const v = String(body.apiKey).trim();
      if (v) {
        if (v.length < 8 || v.length > 200) return { error: "API key looks wrong — check it and paste again", status: 400 };
        patch.apiKey = encryptSecret(v);
      }
    }
    if (body.secretKey !== undefined) {
      const v = String(body.secretKey).trim();
      if (v) {
        if (v.length < 8 || v.length > 200) return { error: "Secret key looks wrong — check it and paste again", status: 400 };
        patch.secretKey = encryptSecret(v);
      }
    }
  }

  if (body.autoSync !== undefined) patch.autoSync = Boolean(body.autoSync);

  if (body.sentStatusKey !== undefined) {
    const v = String(body.sentStatusKey).trim();
    if (!v) return { error: "Pick the status an order moves to after it is sent", status: 400 };
    patch.sentStatusKey = v;
  }

  if (body.isActive !== undefined && !body.clearKeys) {
    const next = Boolean(body.isActive);
    if (next) {
      const apiKey = patch.apiKey !== undefined ? decryptSecret(patch.apiKey) : decryptSecret(row.apiKey);
      const secretKey = patch.secretKey !== undefined ? decryptSecret(patch.secretKey) : decryptSecret(row.secretKey);
      if (!apiKey || !secretKey) return { error: "Save both keys before turning the courier on", status: 400 };
    }
    patch.isActive = next;
  }

  if (Object.keys(patch).length === 0) return { error: "Nothing to update", status: 400 };

  const [updated] = await db.update(courierConfig).set(patch).where(eq(courierConfig.id, row.id)).returning();
  return toPublicConfig(updated);
}

/* ------------------------------------------------------------------ */
/* HTTP                                                                 */
/* ------------------------------------------------------------------ */

type Credentials = { baseUrl: string; apiKey: string; secretKey: string; row: CourierConfigRow };

async function credentials(requireActive = true): Promise<Credentials | CourierError> {
  const { row, ready } = await loadCourierConfig();
  if (!ready || !row) return { error: "Courier table is missing — run the migration SQL first", status: 503 };
  const apiKey = decryptSecret(row.apiKey);
  const secretKey = decryptSecret(row.secretKey);
  if (!apiKey || !secretKey) {
    return { error: "Courier is not connected yet — add the API key and secret on the API page", status: 400 };
  }
  if (requireActive && !row.isActive) {
    return { error: "Courier is switched off — turn it on from the API page", status: 400 };
  }
  return { baseUrl: normalizeBase(row.baseUrl), apiKey, secretKey, row };
}

type CourierResponse = { ok: boolean; status: number; body: unknown; error?: string };

async function call(
  creds: Credentials,
  path: string,
  init?: { method?: "GET" | "POST"; json?: unknown }
): Promise<CourierResponse> {
  const url = `${creds.baseUrl}${path}`;
  try {
    const res = await fetch(url, {
      method: init?.method ?? "GET",
      headers: {
        "Api-Key": creds.apiKey,
        "Secret-Key": creds.secretKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: init?.json === undefined ? undefined : JSON.stringify(init.json),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const text = await res.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    if (res.ok) return { ok: true, status: res.status, body };
    return { ok: false, status: res.status, body, error: httpMessage(res.status, body) };
  } catch (e) {
    const name = (e as { name?: string })?.name;
    if (name === "TimeoutError" || name === "AbortError") {
      return { ok: false, status: 504, body: null, error: "The courier did not answer in 20 seconds — try again" };
    }
    return {
      ok: false,
      status: 502,
      body: null,
      error: "Could not reach the courier — check the Base URL and your connection",
    };
  }
}

/**
 * A 4xx from `create_order` puts the useful sentence in `errors`, not in
 * `message` — `message` is only ever "Please fix the given errors".
 */
function fieldError(body: unknown): string {
  if (typeof body !== "object" || body === null) return "";
  const errors = (body as { errors?: unknown }).errors;
  if (typeof errors !== "object" || errors === null) return "";
  for (const [field, val] of Object.entries(errors as Record<string, unknown>)) {
    const first = Array.isArray(val) ? val[0] : val;
    if (typeof first !== "string" || !first) continue;
    if (field === "invoice" && /already/i.test(first)) {
      return "This order is already booked at the courier under this invoice";
    }
    const label = field.replace(/_/g, " ");
    return `${label.charAt(0).toUpperCase()}${label.slice(1)}: ${first}`;
  }
  return "";
}

function httpMessage(status: number, body: unknown): string {
  const fromBody =
    fieldError(body) ||
    (typeof body === "object" && body !== null && typeof (body as { message?: unknown }).message === "string"
      ? (body as { message: string }).message
      : "");
  switch (status) {
    case 401:
      return "Courier rejected the keys (401) — check the API key and secret";
    case 403:
      return fromBody || "Courier account is inactive or needs KYC (403)";
    case 422:
      return fromBody || "Courier rejected a field (422)";
    case 429:
      return "Too many courier requests (429) — wait a minute and try again";
    case 500:
      return "The courier had an internal error (500) — safe to retry, duplicate invoices are refused";
    default:
      return fromBody || `Courier answered ${status}`;
  }
}

async function noteCheck(rowId: number, patch: { lastBalance?: number | null; lastError?: string }) {
  await db
    .update(courierConfig)
    .set({ ...patch, lastCheckedAt: new Date() })
    .where(eq(courierConfig.id, rowId));
}

/* ------------------------------------------------------------------ */
/* connection + balance                                                 */
/* ------------------------------------------------------------------ */

export type CourierTestResult = {
  reachable: boolean;
  authenticated: boolean;
  balance: number | null;
  message: string;
};

/**
 * `/ping` proves the address and the network, `/get_balance` proves the keys —
 * the docs are explicit that ping alone says nothing about credentials.
 */
export async function testCourier(): Promise<CourierTestResult | CourierError> {
  const creds = await credentials(false);
  if ("error" in creds) return creds;

  const ping = await call(creds, "/ping");
  if (!ping.ok) {
    await noteCheck(creds.row.id, { lastError: ping.error ?? "Ping failed" });
    return { reachable: false, authenticated: false, balance: null, message: ping.error ?? "Ping failed" };
  }

  const bal = await call(creds, "/get_balance");
  if (!bal.ok) {
    await noteCheck(creds.row.id, { lastError: bal.error ?? "Balance check failed" });
    return { reachable: true, authenticated: false, balance: null, message: bal.error ?? "Balance check failed" };
  }

  const balance = readBalance(bal.body);
  await noteCheck(creds.row.id, { lastBalance: balance, lastError: "" });
  return { reachable: true, authenticated: true, balance, message: "Connected" };
}

function readBalance(body: unknown): number | null {
  if (typeof body !== "object" || body === null) return null;
  const raw = (body as { current_balance?: unknown }).current_balance;
  const n = Number(raw);
  /* Money is whole taka everywhere in this panel. Floor rather than round so
     the figure never promises more than the courier actually owes. */
  return Number.isFinite(n) ? Math.floor(n) : null;
}

export async function getCourierBalance(): Promise<{ balance: number | null; checkedAt: string } | CourierError> {
  const creds = await credentials();
  if ("error" in creds) return creds;

  const res = await call(creds, "/get_balance");
  if (!res.ok) {
    await noteCheck(creds.row.id, { lastError: res.error ?? "Balance check failed" });
    return { error: res.error ?? "Balance check failed", status: 502 };
  }
  const balance = readBalance(res.body);
  await noteCheck(creds.row.id, { lastBalance: balance, lastError: "" });
  return { balance, checkedAt: new Date().toISOString() };
}

/* ------------------------------------------------------------------ */
/* booking                                                              */
/* ------------------------------------------------------------------ */

type Bookable = {
  id: number;
  code: string;
  customerName: string;
  phone: string;
  address: string;
  total: number;
  deliveryAreaName: string;
  status: string;
  courierConsignmentId: string | null;
};

function payloadFor(o: Bookable) {
  return {
    invoice: courierInvoice(o.code),
    recipient_name: courierSafeText(o.customerName, COURIER_LIMITS.recipientName),
    recipient_phone: o.phone.trim().slice(0, COURIER_LIMITS.recipientPhone),
    recipient_address: courierSafeText(o.address, COURIER_LIMITS.recipientAddress),
    cod_amount: Math.max(0, Math.min(1_000_000, Math.round(o.total))),
    note: courierSafeText(`Area: ${o.deliveryAreaName}`, COURIER_LIMITS.note),
  };
}

/** Fields that stop a parcel before we spend a courier request on it. */
function localReject(o: Bookable): string | null {
  if (o.courierConsignmentId) return "Already sent to the courier";
  if (o.status === "delivered") return "Order is already delivered";
  if (o.status === "cancelled") return "Order is cancelled";
  if (!isBdPhone(o.phone)) return "Phone number is not a valid 11-digit BD mobile";
  if (courierSafeText(o.customerName, COURIER_LIMITS.recipientName).length < 2) return "Customer name is missing";
  if (courierSafeText(o.address, COURIER_LIMITS.recipientAddress).length < 5) return "Address is too short";
  return null;
}

async function markSent(
  orderId: number,
  sentStatusKey: string,
  data: { consignmentId: string; trackingCode: string; trackingLink: string; courierStatus: string }
) {
  await db
    .update(orders)
    .set({
      courierConsignmentId: data.consignmentId,
      courierTrackingCode: data.trackingCode || null,
      courierTrackingLink: data.trackingLink || null,
      courierStatus: data.courierStatus || "in_review",
      courierSentAt: new Date(),
      status: sentStatusKey,
    })
    .where(eq(orders.id, orderId));
}

function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

/**
 * Books one or many orders. A single order uses `/create_order` so the caller
 * gets the real validation message; several use the extended bulk endpoint,
 * whose failures are sentences rather than codes.
 */
export async function sendOrdersToCourier(ids: number[]): Promise<{ results: CourierSendResult[] } | CourierError> {
  const unique = [...new Set(ids.filter((n) => Number.isInteger(n) && n > 0))];
  if (unique.length === 0) return { error: "Select at least one order", status: 400 };
  if (unique.length > COURIER_BULK_MAX) {
    return { error: `Send at most ${COURIER_BULK_MAX} orders at a time`, status: 400 };
  }

  const creds = await credentials();
  if ("error" in creds) return creds;

  const rows: Bookable[] = await db
    .select({
      id: orders.id,
      code: orders.code,
      customerName: orders.customerName,
      phone: orders.phone,
      address: orders.address,
      total: orders.total,
      deliveryAreaName: orders.deliveryAreaName,
      status: orders.status,
      courierConsignmentId: orders.courierConsignmentId,
    })
    .from(orders)
    .where(inArray(orders.id, unique));

  const byId = new Map(rows.map((r) => [r.id, r]));
  const results: CourierSendResult[] = [];
  const queue: Bookable[] = [];

  for (const id of unique) {
    const o = byId.get(id);
    if (!o) {
      results.push({ orderId: id, code: String(id), ok: false, error: "Order not found" });
      continue;
    }
    const bad = localReject(o);
    if (bad) {
      results.push({ orderId: o.id, code: o.code, ok: false, error: bad });
      continue;
    }
    queue.push(o);
  }

  if (queue.length === 0) return { results };

  const sentStatus = creds.row.sentStatusKey || "confirmed";

  if (queue.length === 1) {
    const o = queue[0];
    const res = await call(creds, "/create_order", { method: "POST", json: payloadFor(o) });
    if (!res.ok) {
      results.push({ orderId: o.id, code: o.code, ok: false, error: res.error ?? "Courier refused the parcel" });
      return { results };
    }
    const c = (res.body as { consignment?: Record<string, unknown> })?.consignment;
    if (!c) {
      results.push({ orderId: o.id, code: o.code, ok: false, error: "Courier replied without a consignment" });
      return { results };
    }
    const consignmentId = str(c.consignment_id);
    await markSent(o.id, sentStatus, {
      consignmentId,
      trackingCode: str(c.tracking_code),
      trackingLink: str(c.tracking_link),
      courierStatus: str(c.status) || "in_review",
    });
    results.push({
      orderId: o.id,
      code: o.code,
      ok: true,
      consignmentId,
      trackingCode: str(c.tracking_code),
      trackingLink: str(c.tracking_link),
    });
    return { results };
  }

  const res = await call(creds, "/create_order/bulk-order/extended", {
    method: "POST",
    json: { data: queue.map(payloadFor) },
  });
  if (!res.ok) {
    for (const o of queue) {
      results.push({ orderId: o.id, code: o.code, ok: false, error: res.error ?? "Courier refused the batch" });
    }
    return { results };
  }

  const entries = Array.isArray((res.body as { data?: unknown })?.data)
    ? ((res.body as { data: Record<string, unknown>[] }).data ?? [])
    : [];
  const byInvoice = new Map<string, Record<string, unknown>>();
  entries.forEach((e, i) => {
    const inv = str(e.invoice) || courierInvoice(queue[i]?.code ?? "");
    if (inv) byInvoice.set(inv, e);
  });

  for (const o of queue) {
    const e = byInvoice.get(courierInvoice(o.code));
    if (!e) {
      results.push({ orderId: o.id, code: o.code, ok: false, error: "Courier did not answer for this order" });
      continue;
    }
    const consignmentId = str(e.consignment_id);
    const failed = !consignmentId || str(e.status) === "error" || e.error;
    if (failed) {
      results.push({ orderId: o.id, code: o.code, ok: false, error: bulkError(e.error) });
      continue;
    }
    await markSent(o.id, sentStatus, {
      consignmentId,
      trackingCode: str(e.tracking_code),
      trackingLink: str(e.tracking_link),
      courierStatus: "in_review",
    });
    results.push({
      orderId: o.id,
      code: o.code,
      ok: true,
      consignmentId,
      trackingCode: str(e.tracking_code),
      trackingLink: str(e.tracking_link),
    });
  }

  return { results };
}

const BULK_CODE_TEXT: Record<string, string> = {
  THIS_INVOICE_ALREADY_EXISTS: "Already booked at the courier with this invoice",
  INVOICE_IS_REQUIRED: "Invoice is missing",
  INVOICE_MUST_BE_ALPHA_NUM_DASH_UNDERSCORE: "Invoice has an unsupported character",
  INVOICE_LENGTH_SHOULD_BE_LESS_THAN_100_CHARS: "Invoice is too long",
  RECEIVER_NAME_IS_REQUIRED: "Customer name is missing",
  RECEIVER_NAME_LENGTH_SHOULD_BE_LESS_THAN_100_CHARS: "Customer name is too long",
  RECEIVER_PHONE_IS_REQUIRED: "Phone number is missing",
  RECEIVER_PHONE_LENGTH_SHOULD_BE_LESS_THAN_40_CHARS: "Phone number is too long",
  RECEIVER_ADDRESS_IS_REQUIRED: "Address is missing",
  RECEIVER_ADDRESS_LENGTH_SHOULD_BE_LESS_THAN_500_CHARS: "Address is too long",
  RECEIVER_NOTE_LENGTH_SHOULD_BE_LESS_THAN_500_CHARS: "Note is too long",
  COD_AMOUNT_ERROR: "COD amount is missing",
  ERROR: "COD amount is not a number",
};

/** The two bulk endpoints disagree: one sends codes, the other sentences. */
function bulkError(raw: unknown): string {
  let list: unknown = raw;
  if (typeof raw === "string") {
    try {
      list = JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  if (Array.isArray(list)) {
    const parts = list.map((x) => BULK_CODE_TEXT[String(x)] ?? String(x));
    if (parts.length > 0) return parts.join(", ");
  }
  return "Courier refused this order";
}

/* ------------------------------------------------------------------ */
/* status refresh                                                       */
/* ------------------------------------------------------------------ */

export type CourierSyncRow = { orderId: number; code: string; courierStatus: string | null; error?: string };

/**
 * Pulls the current delivery status for already-sent orders.
 * `status_with_return_status_by_cid` is the only one that reports a parcel
 * actually being back with us, which is what stock reconciliation needs.
 */
export async function refreshCourierStatuses(ids: number[]): Promise<{ rows: CourierSyncRow[] } | CourierError> {
  const unique = [...new Set(ids.filter((n) => Number.isInteger(n) && n > 0))].slice(0, 50);
  if (unique.length === 0) return { error: "Select at least one order", status: 400 };

  const creds = await credentials();
  if ("error" in creds) return creds;

  const rows = await db
    .select({ id: orders.id, code: orders.code, cid: orders.courierConsignmentId })
    .from(orders)
    .where(inArray(orders.id, unique));

  const out: CourierSyncRow[] = [];
  for (const r of rows) {
    if (!r.cid) {
      out.push({ orderId: r.id, code: r.code, courierStatus: null, error: "Not sent to the courier yet" });
      continue;
    }
    const res = await call(creds, `/status_with_return_status_by_cid/${encodeURIComponent(r.cid)}`);
    if (!res.ok) {
      out.push({ orderId: r.id, code: r.code, courierStatus: null, error: res.error ?? "Status check failed" });
      continue;
    }
    const status = str((res.body as { delivery_status?: unknown })?.delivery_status);
    if (!status) {
      out.push({ orderId: r.id, code: r.code, courierStatus: null, error: "Courier sent no status" });
      continue;
    }
    await db.update(orders).set({ courierStatus: status }).where(eq(orders.id, r.id));
    out.push({ orderId: r.id, code: r.code, courierStatus: status });
  }
  return { rows: out };
}

/* ------------------------------------------------------------------ */
/* fraud check                                                          */
/* ------------------------------------------------------------------ */

/**
 * Steadfast's phone history. Scoring is retired on their side: `score` and
 * `level` always answer null now, so we read the ratios and the volume band.
 */
export async function courierFraudCheck(phone: string): Promise<CourierFraudReport | CourierError> {
  const p = phone.trim();
  if (!isBdPhone(p)) return { error: "Not a valid 11-digit BD mobile number", status: 400 };

  const creds = await credentials();
  if ("error" in creds) return creds;

  const res = await call(creds, `/fraud_check/score/${encodeURIComponent(p)}`);
  if (!res.ok) return { error: res.error ?? "Fraud check failed", status: 502 };

  const b = (res.body ?? {}) as Record<string, unknown>;
  const ratio = (v: unknown): number | null => {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n) : null;
  };

  const cats = b.fraud_categories;
  const fraudCategories: { code: string; count: number }[] = [];
  if (cats && typeof cats === "object" && !Array.isArray(cats)) {
    for (const [code, count] of Object.entries(cats as Record<string, unknown>)) {
      fraudCategories.push({ code, count: Number(count) || 0 });
    }
    fraudCategories.sort((a, z) => z.count - a.count);
  }

  const band = str(b.volume_band);
  return {
    phone: p,
    deliveryRatio: ratio(b.delivery_ratio),
    cancellationRatio: ratio(b.cancellation_ratio),
    volumeBand: (["none", "low", "medium", "high", "very_high"].includes(band)
      ? band
      : null) as CourierFraudReport["volumeBand"],
    totalReports: Number(b.total_reports) || 0,
    fraudCategories,
    doubtfulReports: Boolean(b.doubtful_reports),
  };
}

/* ------------------------------------------------------------------ */
/* panel summary                                                        */
/* ------------------------------------------------------------------ */

export type CourierSummary = { sent: number; notSent: number };

/** Counts for the API page header. */
export async function courierSummary(): Promise<CourierSummary> {
  const [sent] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(sql`${orders.courierConsignmentId} is not null`);
  const [notSent] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(isNull(orders.courierConsignmentId), sql`${orders.status} not in ('delivered','cancelled')`));
  return { sent: sent?.n ?? 0, notSent: notSent?.n ?? 0 };
}

/* ------------------------------------------------------------------ */
/* scheduled sync                                                       */
/* ------------------------------------------------------------------ */

/** Courier statuses that will never change again — stop asking about them. */
const SETTLED_KEYS = Object.keys(COURIER_STATUS).filter((k) => COURIER_STATUS[k].final);

/**
 * Booked parcels whose courier status is not yet final.
 * `notInArray` rather than a raw `<> all(...)`: inside an `sql` template an
 * array is expanded into one placeholder per element, which Postgres then
 * rejects as "ALL (array) requires array on right side". NULL needs the
 * explicit arm because `NOT IN` is NULL for a NULL column.
 */
function stillMovingWhere() {
  return and(
    isNotNull(orders.courierConsignmentId),
    or(isNull(orders.courierStatus), notInArray(orders.courierStatus, SETTLED_KEYS))
  );
}

/** Their status cache is 60s; syncing faster than this only burns rate limit. */
const SYNC_MIN_GAP_MS = 60_000;
/** Netlify caps a scheduled function at 30s — leave room to write results. */
const SYNC_BUDGET_MS = 18_000;
const SYNC_CONCURRENCY = 4;

export type SyncOptions = { limit?: number; force?: boolean };

/**
 * Asks the courier about parcels that are still moving, oldest-checked first,
 * and moves our own order status when the courier reaches a settled outcome.
 *
 * Deliberately bounded: a batch limit, a wall-clock budget and a minimum gap
 * between runs, so a cron that fires too eagerly cannot trip the 429.
 */
export async function syncCourierStatuses(
  opts: SyncOptions = {}
): Promise<CourierSyncSummary | CourierError> {
  const limit = Math.min(Math.max(opts.limit ?? 40, 1), 200);
  const creds = await credentials();
  if ("error" in creds) return creds;

  if (!opts.force) {
    const last = creds.row.lastSyncAt?.getTime() ?? 0;
    const since = Date.now() - last;
    if (since < SYNC_MIN_GAP_MS) {
      return {
        checked: 0,
        statusChanged: 0,
        ordersMoved: 0,
        failed: 0,
        remaining: 0,
        skipped: `Synced ${Math.round(since / 1000)}s ago — the courier caches status for 60s`,
      };
    }
  }

  /* Everything booked whose courier status is not yet a final one. Null first
     so a parcel that has never been checked jumps the queue. */
  const pendingWhere = stillMovingWhere();

  const queue = await db
    .select({ id: orders.id, code: orders.code, cid: orders.courierConsignmentId, status: orders.status })
    .from(orders)
    .where(pendingWhere)
    .orderBy(sql`${orders.courierCheckedAt} asc nulls first`, orders.id)
    .limit(limit);

  const [{ n: outstanding } = { n: 0 }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(pendingWhere);

  const started = Date.now();
  let checked = 0;
  let statusChanged = 0;
  let ordersMoved = 0;
  let failed = 0;
  let lastError = "";

  const work = [...queue];
  const runner = async () => {
    for (;;) {
      if (Date.now() - started > SYNC_BUDGET_MS) return;
      const o = work.shift();
      if (!o || !o.cid) return;

      const res = await call(creds, `/status_with_return_status_by_cid/${encodeURIComponent(o.cid)}`);
      const now = new Date();
      if (!res.ok) {
        failed++;
        lastError = res.error ?? "Status check failed";
        /* Still stamp it so one unreachable parcel cannot block the queue. */
        await db.update(orders).set({ courierCheckedAt: now }).where(eq(orders.id, o.id));
        continue;
      }

      checked++;
      const next = str((res.body as { delivery_status?: unknown })?.delivery_status);
      const patch: Partial<typeof orders.$inferInsert> = { courierCheckedAt: now };
      if (next) {
        patch.courierStatus = next;
        statusChanged++;
        /* Only a confirmed outcome is allowed to move the merchant's own
           status — "approval pending" is the rider's word, not the courier's. */
        const mapped = COURIER_TO_ORDER_STATUS[next];
        if (mapped && mapped !== o.status) {
          patch.status = mapped;
          ordersMoved++;
        }
      }
      await db.update(orders).set(patch).where(eq(orders.id, o.id));
    }
  };

  await Promise.all(Array.from({ length: Math.min(SYNC_CONCURRENCY, queue.length) }, runner));

  await db
    .update(courierConfig)
    .set({ lastSyncAt: new Date(), lastSyncCount: checked, lastSyncError: failed > 0 ? lastError : "" })
    .where(eq(courierConfig.id, creds.row.id));

  return {
    checked,
    statusChanged,
    ordersMoved,
    failed,
    remaining: Math.max(0, outstanding - checked - failed),
  };
}

/** Whether the scheduled sync should do anything at all right now. */
export async function autoSyncEnabled(): Promise<boolean> {
  const { row } = await loadCourierConfig();
  return Boolean(row?.isActive && row.autoSync && decryptSecret(row.apiKey) && decryptSecret(row.secretKey));
}

/** How many booked parcels are still waiting on a settled courier status. */
export async function courierPendingCount(): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(orders).where(stillMovingWhere());
  return row?.n ?? 0;
}
