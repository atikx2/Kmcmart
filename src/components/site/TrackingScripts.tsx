import Script from "next/script";
import type { TrackingTagPublic } from "@/lib/tracking";

type MetaPixelPublic = { pixelId: string; isActive: boolean };

/**
 * Renders the marketing tags the owner added on the API page.
 *
 * Two deliberate choices:
 *
 * 1. Everything loads with `afterInteractive`, so analytics never delays the
 *    page the shopper is waiting for. Tag scripts are the most common reason
 *    an otherwise quick storefront feels slow.
 * 2. The snippets are built here from the stored id. Nothing the admin types
 *    is injected as code, so a stolen admin password cannot put arbitrary
 *    JavaScript on the storefront.
 */
export default function TrackingScripts({ tags, metaPixels = [] }: { tags: TrackingTagPublic[]; metaPixels?: MetaPixelPublic[] }) {
  if (tags.length === 0) return null;

  const ids = (provider: string) =>
    tags.filter((t) => t.provider === provider).map((t) => t.tagId);

  const gtm = ids("gtm");
  const gtag = [...ids("ga4"), ...ids("gads")];
  const meta = [...ids("meta"), ...metaPixels.filter((p) => p.isActive).map((p) => p.pixelId)].filter((id, i, all) => all.indexOf(id) === i);

  return (
    <>
      {/* Google Tag Manager — one loader per container. */}
      {gtm.map((id) => (
        <Script key={id} id={`gtm-${id}`} strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${id}');`}
        </Script>
      ))}

      {/* GA4 and Google Ads share one gtag.js; each id is configured on top. */}
      {gtag.length > 0 && (
        <>
          <Script
            id="gtag-src"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${gtag[0]}`}
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());
${gtag.map((id) => `gtag('config','${id}');`).join("\n")}`}
          </Script>
        </>
      )}

      {/* Meta Pixel — fbq is initialised once and then told about each id. */}
      {meta.length > 0 && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
${meta.map((id) => `fbq('init','${id}');`).join("\n")}
fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}

/**
 * The <noscript> half of Tag Manager. It has to sit at the top of <body>,
 * which is why it is separate from the loader above.
 */
export function TrackingNoScript({ tags }: { tags: TrackingTagPublic[] }) {
  const gtm = tags.filter((t) => t.provider === "gtm");
  if (gtm.length === 0) return null;
  return (
    <>
      {gtm.map((t) => (
        <noscript key={t.id}>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${t.tagId}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
      ))}
    </>
  );
}

/** Search Console ownership, rendered into <head> by generateMetadata. */
export function verificationTokens(tags: TrackingTagPublic[]): string[] {
  return tags.filter((t) => t.provider === "verification").map((t) => t.tagId);
}
