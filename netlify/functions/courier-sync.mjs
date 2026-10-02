/**
 * Scheduled courier sync.
 *
 * Netlify runs this on the cron below and calls the app's own endpoint, which
 * holds all the courier logic. Note the V2 convention (default export plus an
 * exported `config`): the older `schedule()` wrapper from @netlify/functions is
 * a runtime no-op and never registers the cron.
 *
 * Only *published production* deploys run on schedule. On a Deploy Preview use
 * the "Run now" button on the Netlify Functions page, or "Sync now" in the
 * admin panel.
 */

const courierSync = async () => {
  const base = process.env.DEPLOY_PRIME_URL || process.env.URL;
  if (!base) {
    console.error("courier-sync: no site URL in the environment");
    return new Response("missing site url", { status: 500 });
  }

  const headers = { "Content-Type": "application/json" };
  const secret = process.env.CRON_SECRET || process.env.AUTH_SECRET;
  if (secret) headers["x-cron-key"] = secret;

  try {
    /* Netlify kills a scheduled function at 30s; the endpoint budgets 18s for
       courier calls, so give it a little room and still return cleanly. */
    const res = await fetch(`${base}/api/cron/courier-sync`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(25_000),
    });
    const body = await res.text();
    console.log(`courier-sync: ${res.status} ${body.slice(0, 500)}`);
    return new Response(body, { status: res.status });
  } catch (e) {
    console.error("courier-sync failed:", e instanceof Error ? e.message : e);
    return new Response("sync failed", { status: 500 });
  }
};

export default courierSync;

export const config = {
  /* Every 15 minutes. Steadfast caches status for 60s and allows 1000 req/min,
     so this is gentle; raise it only if the parcel volume justifies it. */
  schedule: "*/15 * * * *",
};
