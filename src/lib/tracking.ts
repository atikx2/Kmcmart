/**
 * Marketing tag vocabulary — shared by the admin card and the storefront.
 *
 * Client-safe: no database, no secrets.
 */

export type TrackingProvider = "gtm" | "ga4" | "gads" | "meta" | "verification";

export type TrackingProviderInfo = {
  key: TrackingProvider;
  name: string;
  /** What the owner will recognise it by. */
  hint: string;
  placeholder: string;
  pattern: RegExp;
  /** Shown under the field when the value does not match. */
  error: string;
};

export const TRACKING_PROVIDERS: TrackingProviderInfo[] = [
  {
    key: "gtm",
    name: "Google Tag Manager",
    hint: "One container that can hold every other tag — add this if you are not sure.",
    placeholder: "GTM-XXXXXXX",
    pattern: /^GTM-[A-Z0-9]{4,12}$/i,
    error: "A Tag Manager id looks like GTM-ABC1234",
  },
  {
    key: "ga4",
    name: "Google Analytics 4",
    hint: "Measurement id from Analytics → Admin → Data streams.",
    placeholder: "G-XXXXXXXXXX",
    pattern: /^G-[A-Z0-9]{6,15}$/i,
    error: "A GA4 measurement id looks like G-AB12CD34EF",
  },
  {
    key: "gads",
    name: "Google Ads",
    hint: "Conversion id for remarketing and conversion tracking.",
    placeholder: "AW-123456789",
    pattern: /^AW-\d{6,15}$/i,
    error: "A Google Ads id looks like AW-123456789",
  },
  {
    key: "meta",
    name: "Meta Pixel",
    hint: "Facebook / Instagram ads pixel id — digits only.",
    placeholder: "123456789012345",
    pattern: /^\d{8,20}$/,
    error: "A Meta pixel id is 8 to 20 digits",
  },
  {
    key: "verification",
    name: "Google site verification",
    hint: "The content value from the HTML tag method in Search Console.",
    placeholder: "abc123DEF456…",
    pattern: /^[A-Za-z0-9_-]{20,100}$/,
    error: "Paste only the content value, not the whole meta tag",
  },
];

export function providerInfo(key: string): TrackingProviderInfo | undefined {
  return TRACKING_PROVIDERS.find((p) => p.key === key);
}

export function providerName(key: string): string {
  return providerInfo(key)?.name ?? key;
}

/**
 * Owners paste whatever they copied. Pull the id out of a full snippet so the
 * form accepts `<meta name="google-site-verification" content="abc">` or
 * `GTM-ABC1234` equally.
 */
export function cleanTagId(provider: string, raw: string): string {
  let v = raw.trim();
  if (!v) return "";

  /* A whole meta tag, or a whole script block, was pasted. */
  const content = /content=["']([^"']+)["']/i.exec(v);
  if (content && provider === "verification") return content[1].trim();

  const known =
    provider === "gtm"
      ? /GTM-[A-Z0-9]{4,12}/i
      : provider === "ga4"
        ? /G-[A-Z0-9]{6,15}/i
        : provider === "gads"
          ? /AW-\d{6,15}/i
          : null;
  if (known) {
    const found = known.exec(v);
    if (found) return found[0].toUpperCase();
  }

  if (provider === "meta") {
    const digits = /\d{8,20}/.exec(v);
    if (digits) return digits[0];
  }

  /* Strip quotes and angle brackets people drag along with a copy. */
  v = v.replace(/^[<"'\s]+|[>"'\s]+$/g, "");
  return v;
}

/** null when fine, otherwise the message to show. */
export function tagIdError(provider: string, id: string): string | null {
  const info = providerInfo(provider);
  if (!info) return "Pick what kind of tag this is";
  if (!id.trim()) return "Paste the tag id";
  if (id.length > 120) return "That is too long to be a tag id";
  return info.pattern.test(id.trim()) ? null : info.error;
}

export type TrackingTagPublic = {
  id: number;
  provider: TrackingProvider;
  label: string;
  tagId: string;
  isActive: boolean;
  sortOrder: number;
};

/** Where the owner can confirm the tag is firing. */
export const TRACKING_VERIFY_HINT: Record<TrackingProvider, string> = {
  gtm: "Check with Tag Assistant (tagassistant.google.com) — it should find the container.",
  ga4: "Analytics → Reports → Realtime should show you within a minute of visiting the site.",
  gads: "Google Ads → Tools → Conversions shows the tag as active once it has fired.",
  meta: "Meta Events Manager → Test Events, or the Meta Pixel Helper extension.",
  verification: "Search Console → Settings → Ownership verification.",
};
