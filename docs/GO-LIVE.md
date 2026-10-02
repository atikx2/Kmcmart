# Go-live checklist & domain migration

Everything here is done from your **phone**, in the Netlify and Neon web
dashboards. No terminal needed.

---

# PART 1 — After you merge the pull request

Do these in order. Steps 1 and 2 are the important ones.

## Step 1 — Run the SQL (do this first)

**Run the SQL before the new code goes live, not after.** Adding these columns
does not disturb the version that is running right now — it ignores them. But
the new code cannot write an order without them, so if the deploy lands first,
customers cannot check out until you finish this step.

Open **Neon → your project → SQL Editor**, paste **one file**, press **Run**:

> ### `docs/sql/RUN-ALL-PENDING.sql`

That single file contains everything outstanding, already in the right order.
It is safe to run twice — every statement is `IF NOT EXISTS`, nothing is
dropped, and nothing you have saved is overwritten. You should see **Success**
with no rows returned.

To copy it on your phone: GitHub → the repo → `docs` → `sql` →
`RUN-ALL-PENDING.sql` → tap the **copy raw file** icon at the top right.

<details>
<summary>What it contains, and why not the individual files</summary>

It is the same content as `012`, `013`, `010` and parts 1–2 of `011`:

| Piece | What it adds |
|---|---|
| `012` | Site Settings columns — without these Settings cannot save |
| `013` | Courier auto-sync columns — **without these checkout breaks** |
| `010` | Fraud checker tables |
| `011` p1–2 | Marketing tags table + 7 speed indexes |

The individual files are still there, but **do not run them in numeric
order**: `011` builds an index on a column that `013` adds, so `010 → 011`
fails with `column "courier_checked_at" does not exist` and Neon rolls the
whole script back. The combined file fixes the ordering.

</details>

### One optional extra

`011` has a **Part 3** at the bottom that shrinks old orders (it removes the
duplicated image data from order rows — names, prices and quantities are
untouched). It is optional and it rewrites existing rows, so make a Neon
branch first if you want a safety net. After it finishes, run this **on its
own**, not with anything else:

```sql
VACUUM FULL orders;
```

(It cannot run together with other statements — Postgres does not allow it.)

## Step 2 — Set AUTH_SECRET (security — do not skip)

Right now, if this variable is missing, your admin login is signed with a
fallback key that is **visible in the public source code**. Anyone who finds
it can log into your admin panel as you.

While it is missing you will see a red warning at the top of every admin page.

1. Netlify → **Site configuration → Environment variables → Add a variable**
2. Key: `AUTH_SECRET`
3. Value: a long random string — 40+ characters, letters and numbers mixed.
   Mash the keyboard if you like; you never have to remember it.
4. Scope: **All scopes / all deploy contexts**
5. **Deploys → Trigger deploy → Deploy site**

After it redeploys, everyone is signed out once. Sign in again and the red
warning is gone.

> Your saved courier and fraud API keys were encrypted with the old fallback
> key. The code tries both keys, so they keep working after you set this.
> Nothing to re-enter.

## Step 3 — Check these env vars exist

Same screen as above.

| Variable | Needed? | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Your Neon connection string |
| `AUTH_SECRET` | **yes** | Step 2 |
| `CRON_SECRET` | optional | Protects the auto-sync endpoint. If unset it falls back to `AUTH_SECRET` |

Anything named `SETUP_SECRET` can be **deleted** — that route no longer exists.

## Step 4 — Rotate your Neon password

The old setup route was public for a while before it was removed. To be safe:
Neon → **Roles** → your role → **Reset password** → copy the new connection
string → update `DATABASE_URL` in Netlify → redeploy.

## Step 5 — Walk through the site once

On your phone, on the **live** site:

- Place a real test order end to end. It should land in Admin → Orders.
- Open that order, change the status, print a label.
- Admin → Site Settings → **Branding** → upload a new logo. The **Replace
  image** button should be tappable (this was the bug that was just fixed).
- Admin → API → press **Test** on the courier connection.
- Admin → Products → add a product, check it shows on the storefront.
- Delete your test order when you are done.

## Step 6 — Turn on the things that only work in production

These do **not** run on the deploy preview, only on the live site:

- **Courier auto-sync** — Netlify → **Functions** → `courier-sync` should have
  a **Scheduled** badge. Press **Run now** once to confirm it works.
- **Marketing tags** — Admin → API → Tracking. Paste your GTM / GA4 / Meta
  Pixel id. Check it with the Meta Pixel Helper or GA4 realtime.

---

# PART 2 — Moving to your own domain

Example: moving from `kmcmartbd.netlify.app` to `kmcmartbd.com`.

Nothing in the code has your domain hard-coded, so this is all dashboard work.
**Your site stays online the whole time** — the `.netlify.app` address keeps
working, and the new domain starts working alongside it.

## Step 1 — Add the domain in Netlify

Netlify → **Domain management → Add a domain** → type `kmcmartbd.com` →
**Verify** → **Add domain**.

Netlify will then show you the DNS records you need. Keep that screen open.

## Step 2 — Point the DNS

You have two options. **Option A is easier** and is what Netlify recommends.

### Option A — let Netlify run your DNS

1. Netlify shows you 4 nameservers like `dns1.p01.nsone.net`.
2. Go to where you **bought** the domain (GoDaddy, Namecheap, Exonhost, …),
   find **Nameservers**, choose **Custom**, and paste all 4.
3. Save.

### Option B — keep your current DNS provider

At your domain provider, add:

| Type | Name | Value |
|---|---|---|
| `A` | `@` | `75.2.60.5` |
| `CNAME` | `www` | `<your-site>.netlify.app` |

(Use the exact values Netlify shows you — they can differ.)

> Do **not** use an `A` record for `www`, and do not point `@` at a CNAME.
> If your provider supports `ALIAS` or `ANAME` for the root, that works too.

## Step 3 — Wait for DNS

Usually 10 minutes to a few hours; it can take up to 24. Netlify's domain
screen shows a green check when it sees the change. You do not need to do
anything while waiting.

## Step 4 — HTTPS

Once DNS is verified: Netlify → **Domain management → HTTPS → Verify DNS
configuration**, then **Provision certificate**. Free, automatic, renews
itself. Give it a few minutes.

**Do not skip this.** Until the certificate is live, browsers will show
"Not secure" on your new domain.

## Step 5 — Pick the primary domain

Netlify → Domain management → the three dots next to the domain you want →
**Set as primary domain**. Netlify automatically redirects the others to it.

Decide **with www** or **without** and stick with it:

- `kmcmartbd.com` (no www) — shorter, more common for shops
- `www.kmcmartbd.com` — slightly more flexible for DNS later

Either is fine. Changing it later is allowed but it resets your Google ranking
for a little while, so choose once.

## Step 6 — After the domain is live

- **Site Settings** → check the logo and site name still look right.
- **Google Search Console** → add the new domain as a new property and verify
  it (Admin → API → Tracking has a verification field for this).
- **Facebook / Meta** → re-verify the new domain in Business Manager, or your
  pixel will keep attributing to the old one.
- **Google Analytics** → GA4 does not care about the domain change, but update
  the property name so you are not confused later.
- Update the link in your **Facebook page**, printed materials, SMS templates.
- Keep the old `.netlify.app` address working — it redirects, so old links and
  anything printed on a parcel still reach the site.

## What you do *not* have to do

- No code change, no redeploy.
- No database change — Neon is separate from the domain.
- No re-entering courier or fraud API keys.
- No customer data migration. Orders, products and customers are untouched.

---

## If something looks wrong

| Symptom | Cause | Fix |
|---|---|---|
| Orange box on Site Settings | SQL not run yet | Part 1, Step 1, file `012` |
| Red banner on every admin page | `AUTH_SECRET` missing | Part 1, Step 2 |
| "Not secure" on the new domain | Certificate not provisioned | Part 2, Step 4 |
| New domain shows nothing | DNS still propagating | Wait; check Netlify's domain screen |
| Courier status not updating | Scheduled function only runs on the live site | Netlify → Functions → `courier-sync` → Run now |
| Logo upload button greyed out | Old deploy | Fixed — make sure the latest deploy is live |
