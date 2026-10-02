import { ShieldAlert } from "lucide-react";

/**
 * Shown on every admin page while the deployment has no AUTH_SECRET.
 *
 * This is not a nice-to-have. Admin session cookies are signed with
 * HMAC-SHA256, and without AUTH_SECRET the key falls back to a constant that
 * is sitting in this repository in plain sight. Anyone who reads the source
 * can mint a cookie and walk into the panel as the owner.
 *
 * It is deliberately loud and cannot be dismissed: a store that goes live
 * like this is one search away from being taken over, and the warning that
 * used to sit halfway down the API page was far too easy to miss.
 */
export default function SecurityBanner({ authSecretSet }: { authSecretSet: boolean }) {
  if (authSecretSet) return null;

  return (
    <div className="mb-4 rounded-2xl border-[1.5px] border-rose-200 bg-rose-50 p-4 md:p-4.5">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl bg-rose-500 text-white grid place-items-center shrink-0">
          <ShieldAlert size={17} strokeWidth={2.4} />
        </span>
        <div className="min-w-0">
          <h2 className="font-display font-extrabold text-[14px] text-rose-700">
            Set AUTH_SECRET before you take real orders
          </h2>
          <p className="text-[12px] font-semibold text-rose-600/90 mt-1.5 leading-relaxed">
            Admin logins are signed with a fallback key that is public in the source code, so anyone could sign in
            as you. Your saved courier and fraud API keys are encrypted with the same fallback.
          </p>
          <div className="mt-2.5 rounded-xl bg-white/70 border border-rose-100 px-3 py-2.5">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-rose-400 mb-1.5">Fix it</p>
            <p className="text-[11.5px] font-bold text-rose-700 leading-relaxed">
              Netlify → Site configuration → Environment variables → Add{" "}
              <code className="font-mono bg-rose-100 px-1 py-0.5 rounded">AUTH_SECRET</code> with a long random
              value, then redeploy. Everyone is signed out once; sign back in and you are done.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
