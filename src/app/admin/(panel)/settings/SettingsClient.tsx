"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlignLeft,
  AtSign,
  Check,
  Columns2,
  Globe,
  Image as ImageIcon,
  Info,
  Languages,
  Loader2,
  MapPin,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Phone,
  RotateCcw,
  Save,
  Settings as SettingsIcon,
  Share2,
  Sparkles,
  Store,
  Type,
} from "lucide-react";
import type { Settings } from "@/db/schema";
import {
  LANGUAGES,
  TEXT_GROUPS,
  TEXT_KEYS,
  UI_TEXT,
  overrideKey,
  type Lang,
  type TextKey,
} from "@/lib/i18n";
import ImageUploader from "@/components/admin/ImageUploader";
import Toast, { useToast } from "@/components/admin/Toast";
import type { IconCmp } from "@/components/admin/table-ui";

type Draft = {
  siteName: string;
  metaTitle: string;
  metaDescription: string;
  slogan: string;
  phone: string;
  email: string;
  address: string;
  facebook: string;
  instagram: string;
  youtube: string;
  whatsapp: string;
  colorFrom: string;
  colorTo: string;
  logoMode: string;
  logoText: string;
  logoHeader: string;
  logoFooter: string;
  favicon: string;
  language: string;
  adminMenuMode: string;
  textOverrides: Record<string, string>;
};

const TABS = [
  { key: "general", label: "General", icon: Store },
  { key: "contact", label: "Contact & Social", icon: Share2 },
  { key: "branding", label: "Logo & Favicon", icon: ImageIcon },
  { key: "appearance", label: "Colours", icon: Palette },
  { key: "language", label: "Language & Text", icon: Languages },
  { key: "panel", label: "Admin Panel", icon: SettingsIcon },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const COLOR_PRESETS = [
  { name: "KMC Orange", from: "#FF7A00", to: "#FF3D77" },
  { name: "Ocean", from: "#0EA5E9", to: "#6366F1" },
  { name: "Forest", from: "#10B981", to: "#0EA5E9" },
  { name: "Royal", from: "#8B5CF6", to: "#EC4899" },
  { name: "Sunset", from: "#F59E0B", to: "#EF4444" },
  { name: "Midnight", from: "#334155", to: "#0F172A" },
];

function Card({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: IconCmp;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] overflow-hidden">
      <div className="flex items-start gap-2.5 px-4 md:px-6 py-4 border-b border-gray-100">
        <span className="grad-bg text-white rounded-xl p-2 shrink-0">
          <Icon size={15} strokeWidth={2.4} />
        </span>
        <div className="min-w-0">
          <h2 className="font-display font-extrabold text-base md:text-lg leading-tight">{title}</h2>
          {hint && <p className="text-[11.5px] font-semibold text-gray-400 mt-0.5">{hint}</p>}
        </div>
      </div>
      <div className="p-4 md:p-6 space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  icon: Icon,
  children,
}: {
  label: string;
  hint?: string;
  icon?: IconCmp;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">{label}</span>
        {hint && <span className="text-[10.5px] font-bold text-gray-400 truncate">{hint}</span>}
      </span>
      <span className="relative block">
        {Icon && (
          <Icon size={16} strokeWidth={2.3} className="absolute left-4 top-[18px] -translate-y-1/2 text-[var(--g2)] pointer-events-none z-[1]" />
        )}
        {children}
      </span>
    </label>
  );
}

export default function SettingsClient({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [toast, showToast] = useToast();
  const [tab, setTab] = useState<TabKey>("general");
  const [saving, setSaving] = useState(false);
  const [editLang, setEditLang] = useState<Lang>(
    initial.language === "bn" ? "bn" : "en"
  );
  const [textGroup, setTextGroup] = useState<string>(TEXT_GROUPS[0]);

  const [v, setV] = useState<Draft>({
    siteName: initial.siteName,
    metaTitle: initial.metaTitle,
    metaDescription: initial.metaDescription,
    slogan: initial.slogan,
    phone: initial.phone,
    email: initial.email,
    address: initial.address,
    facebook: initial.facebook,
    instagram: initial.instagram,
    youtube: initial.youtube,
    whatsapp: initial.whatsapp,
    colorFrom: initial.colorFrom,
    colorTo: initial.colorTo,
    logoMode: initial.logoMode,
    logoText: initial.logoText,
    logoHeader: initial.logoHeader,
    logoFooter: initial.logoFooter,
    favicon: initial.favicon,
    language: initial.language,
    adminMenuMode: initial.adminMenuMode,
    textOverrides: { ...(initial.textOverrides ?? {}) },
  });

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setV((p) => ({ ...p, [key]: value }));

  const textValue = (key: TextKey): string =>
    v.textOverrides[overrideKey(editLang, key)] ?? UI_TEXT[key][editLang];

  const setTextValue = (key: TextKey, value: string) =>
    setV((p) => {
      const next = { ...p.textOverrides };
      const k = overrideKey(editLang, key);
      if (value.trim() === "" || value === UI_TEXT[key][editLang]) delete next[k];
      else next[k] = value;
      return { ...p, textOverrides: next };
    });

  const customCount = useMemo(() => Object.keys(v.textOverrides).length, [v.textOverrides]);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save");
      showToast("ok", "Settings saved — storefront updated");
      router.refresh();
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const groupKeys = TEXT_KEYS.filter((k) => UI_TEXT[k].group === textGroup);

  return (
    <div className="space-y-4 pb-24">
      {/* tabs */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-2">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`shrink-0 flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-[12.5px] font-extrabold transition ${
                  active ? "grad-bg text-white shadow-[0_8px_20px_rgba(255,61,119,0.3)]" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                <Icon size={14} strokeWidth={2.5} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------- general ---------------- */}
      {tab === "general" && (
        <Card icon={Store} title="Website Identity" hint="Name, browser tab title and the line under your footer logo">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Website name" icon={Store}>
              <input value={v.siteName} onChange={(e) => set("siteName", e.target.value)} className="field font-bold" />
            </Field>
            <Field label="Browser tab title" hint="empty = auto" icon={Type}>
              <input
                value={v.metaTitle}
                onChange={(e) => set("metaTitle", e.target.value)}
                placeholder={`${v.siteName} — Best Online Shopping in Bangladesh`}
                className="field font-semibold"
              />
            </Field>
          </div>

          <Field label="Slogan / tagline" icon={Sparkles}>
            <input value={v.slogan} onChange={(e) => set("slogan", e.target.value)} className="field font-semibold" />
          </Field>

          <Field label="Meta description" hint="shown by Google — empty uses the slogan" icon={AlignLeft}>
            <textarea
              value={v.metaDescription}
              onChange={(e) => set("metaDescription", e.target.value)}
              rows={3}
              placeholder={v.slogan}
              className="field min-h-[86px] resize-none font-semibold !pl-11"
            />
          </Field>

          <div className="rounded-2xl border border-gray-100 bg-[#fafafc] p-4">
            <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-gray-400 mb-2">Google preview</p>
            <p className="text-[15px] text-[#1a0dab] font-semibold truncate">
              {v.metaTitle.trim() || `${v.siteName} — Best Online Shopping in Bangladesh`}
            </p>
            <p className="text-[11.5px] text-emerald-700 font-bold">kmcbazar.com</p>
            <p className="text-[12px] text-gray-500 font-medium line-clamp-2 mt-0.5">
              {v.metaDescription.trim() || v.slogan}
            </p>
          </div>
        </Card>
      )}

      {/* ---------------- contact ---------------- */}
      {tab === "contact" && (
        <>
          <Card icon={Phone} title="Contact Info" hint="Shown in the footer, mobile menu and on the checkout page">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Hotline / phone" icon={Phone}>
                <input value={v.phone} onChange={(e) => set("phone", e.target.value)} className="field font-bold" />
              </Field>
              <Field label="Email" icon={AtSign}>
                <input value={v.email} onChange={(e) => set("email", e.target.value)} className="field font-semibold" />
              </Field>
            </div>
            <Field label="Address" icon={MapPin}>
              <input value={v.address} onChange={(e) => set("address", e.target.value)} className="field font-semibold" />
            </Field>
          </Card>

          <Card icon={Share2} title="Social Links" hint="Leave a field empty to hide nothing — the icon just links to #">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(
                [
                  ["facebook", "Facebook"],
                  ["instagram", "Instagram"],
                  ["youtube", "YouTube"],
                  ["whatsapp", "WhatsApp"],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label} icon={Globe}>
                  <input
                    value={v[key]}
                    onChange={(e) => set(key, e.target.value)}
                    placeholder="https://…"
                    className="field font-semibold"
                  />
                </Field>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* ---------------- branding ---------------- */}
      {tab === "branding" && (
        <>
          <Card icon={Type} title="Logo Style" hint="Use an uploaded image, or just your name written in the brand gradient">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(
                [
                  ["image", "Image logo", "Upload a PNG/SVG for header and footer"],
                  ["text", "Text logo", "Site name in the gradient — no file needed"],
                ] as const
              ).map(([mode, label, hint]) => {
                const active = v.logoMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => set("logoMode", mode)}
                    className={`rounded-2xl border-[1.5px] px-4 py-3.5 text-left transition ${
                      active
                        ? "border-[color-mix(in_srgb,var(--g1)_45%,transparent)] bg-[color-mix(in_srgb,var(--g1)_7%,white)]"
                        : "border-gray-200 bg-[#fbfbfe] hover:border-gray-300"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`w-4 h-4 rounded-full grid place-items-center shrink-0 ${
                          active ? "grad-bg text-white" : "bg-white ring-1 ring-gray-300"
                        }`}
                      >
                        {active && <Check size={10} strokeWidth={3.5} />}
                      </span>
                      <span className="text-[13px] font-extrabold text-gray-800">{label}</span>
                    </span>
                    <span className="mt-1 block text-[10.5px] font-semibold text-gray-400 leading-snug">{hint}</span>
                  </button>
                );
              })}
            </div>

            {v.logoMode === "text" && (
              <>
                <Field label="Logo text" hint="empty = website name" icon={Type}>
                  <input
                    value={v.logoText}
                    onChange={(e) => set("logoText", e.target.value)}
                    placeholder={v.siteName}
                    className="field font-bold"
                  />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-gray-100 bg-white p-5 grid place-items-center">
                    <span
                      className="font-display text-[26px] font-extrabold tracking-tight"
                      style={{
                        backgroundImage: `linear-gradient(120deg, ${v.colorFrom}, ${v.colorTo})`,
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        color: "transparent",
                      }}
                    >
                      {v.logoText.trim() || v.siteName}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-black p-5 grid place-items-center">
                    <span className="font-display text-[26px] font-extrabold tracking-tight text-white">
                      {v.logoText.trim() || v.siteName}
                    </span>
                  </div>
                </div>
              </>
            )}
          </Card>

          {v.logoMode === "image" && (
            <Card icon={ImageIcon} title="Logo Files" hint="Header logo sits on white, footer logo on black">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-2">Header logo</p>
                  <ImageUploader
                    images={v.logoHeader ? [v.logoHeader] : []}
                    onChange={(next) => set("logoHeader", next[0] ?? "")}
                    max={1}
                    label="Upload header logo"
                    columns="grid-cols-1"
                    tile="aspect-[4/1]"
                    maxEdge={600}
                    maxBytes={260_000}
                    hint="Wide transparent PNG or SVG works best"
                  />
                </div>
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-2">Footer logo (dark background)</p>
                  <div className="rounded-2xl bg-black p-3">
                    <ImageUploader
                      images={v.logoFooter ? [v.logoFooter] : []}
                      onChange={(next) => set("logoFooter", next[0] ?? "")}
                      max={1}
                      label="Upload footer logo"
                      columns="grid-cols-1"
                      tile="aspect-[4/1]"
                      maxEdge={600}
                      maxBytes={260_000}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Card icon={Globe} title="Favicon" hint="The small icon in the browser tab — square image, 64×64 is plenty">
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <div className="w-full sm:w-[220px] shrink-0">
                <ImageUploader
                  images={v.favicon ? [v.favicon] : []}
                  onChange={(next) => set("favicon", next[0] ?? "")}
                  max={1}
                  label="Upload favicon"
                  columns="grid-cols-1"
                  tile="aspect-square"
                  maxEdge={128}
                  maxBytes={60_000}
                />
              </div>
              <div className="flex-1 min-w-0 rounded-2xl border border-gray-100 bg-[#fafafc] p-4">
                <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-gray-400 mb-2.5">Tab preview</p>
                <div className="inline-flex items-center gap-2 bg-white rounded-t-xl border border-gray-200 border-b-0 px-3 py-2 max-w-full">
                  {v.favicon ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={v.favicon} alt="" className="w-4 h-4 rounded-sm object-cover shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-sm bg-gray-200 shrink-0" />
                  )}
                  <span className="text-[12px] font-bold text-gray-600 truncate max-w-[220px]">
                    {v.metaTitle.trim() || v.siteName}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* ---------------- appearance ---------------- */}
      {tab === "appearance" && (
        <Card icon={Palette} title="Brand Colours" hint="Applies site-wide instantly — titles, buttons, ribbons, badges">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(
              [
                ["colorFrom", "Gradient start"],
                ["colorTo", "Gradient end"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">{label}</p>
                <div className="flex items-center gap-2.5 rounded-2xl border-[1.5px] border-gray-200 bg-[#fbfbfe] p-2">
                  <input
                    type="color"
                    value={v[key]}
                    onChange={(e) => set(key, e.target.value)}
                    className="w-12 h-12 rounded-xl border-0 bg-transparent cursor-pointer shrink-0 p-0"
                    aria-label={label}
                  />
                  <input
                    value={v[key]}
                    onChange={(e) => set(key, e.target.value)}
                    className="flex-1 min-w-0 bg-transparent text-[14px] font-extrabold uppercase tracking-wide outline-none"
                  />
                </div>
              </div>
            ))}
          </div>

          <div
            className="rounded-3xl p-6 md:p-8 text-white"
            style={{ backgroundImage: `linear-gradient(120deg, ${v.colorFrom}, ${v.colorTo})` }}
          >
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] opacity-80">Live preview</p>
            <p className="font-display text-2xl md:text-3xl font-extrabold mt-1">{v.siteName}</p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <span className="bg-white text-[13px] font-extrabold px-5 py-2.5 rounded-full" style={{ color: v.colorTo }}>
                {UI_TEXT.buyNow[v.language === "bn" ? "bn" : "en"]}
              </span>
              <span className="bg-white/20 backdrop-blur text-[13px] font-extrabold px-5 py-2.5 rounded-full">
                -20% {UI_TEXT.off[v.language === "bn" ? "bn" : "en"]}
              </span>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-2">Quick presets</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {COLOR_PRESETS.map((p) => {
                const active = v.colorFrom.toLowerCase() === p.from.toLowerCase() && v.colorTo.toLowerCase() === p.to.toLowerCase();
                return (
                  <button
                    key={p.name}
                    onClick={() => setV((prev) => ({ ...prev, colorFrom: p.from, colorTo: p.to }))}
                    className={`rounded-2xl border-[1.5px] p-2 text-left transition ${
                      active ? "border-[color-mix(in_srgb,var(--g1)_50%,transparent)]" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span
                      className="block h-8 rounded-xl"
                      style={{ backgroundImage: `linear-gradient(120deg, ${p.from}, ${p.to})` }}
                    />
                    <span className="mt-1.5 block text-[11px] font-extrabold text-gray-600">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* ---------------- language & text ---------------- */}
      {tab === "language" && (
        <>
          <Card icon={Languages} title="Storefront Language" hint="Switches every button and title on the public website">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {LANGUAGES.map((l) => {
                const active = v.language === l.key;
                return (
                  <button
                    key={l.key}
                    onClick={() => {
                      set("language", l.key);
                      setEditLang(l.key);
                    }}
                    className={`rounded-2xl border-[1.5px] px-4 py-4 text-left transition ${
                      active
                        ? "border-[color-mix(in_srgb,var(--g1)_45%,transparent)] bg-[color-mix(in_srgb,var(--g1)_7%,white)]"
                        : "border-gray-200 bg-[#fbfbfe] hover:border-gray-300"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className={`w-5 h-5 rounded-full grid place-items-center shrink-0 ${
                          active ? "grad-bg text-white" : "bg-white ring-1 ring-gray-300"
                        }`}
                      >
                        {active && <Check size={11} strokeWidth={3.5} />}
                      </span>
                      <span className="font-display text-[17px] font-extrabold text-gray-800">{l.native}</span>
                    </span>
                    <span className="mt-1.5 block text-[11px] font-semibold text-gray-400">
                      {l.key === "bn"
                        ? "Buy Now → অর্ডার করুন, Checkout → চেকআউট …"
                        : "Buy Now, Checkout, Add to Cart …"}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="flex items-start gap-2 text-[11.5px] font-bold text-sky-700 bg-sky-50 border border-sky-100 rounded-2xl px-3.5 py-2.5">
              <Info size={14} className="shrink-0 mt-[1px]" />
              Product names, category names and menu labels are your own content — they are not translated. Only the
              fixed interface text below changes.
            </p>
          </Card>

          <Card
            icon={Type}
            title="Button & Title Text"
            hint="Change any word on the storefront. Empty field = the default for that language."
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex gap-1.5 rounded-2xl bg-[#fafafc] border border-gray-100 p-1">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.key}
                    onClick={() => setEditLang(l.key)}
                    className={`rounded-xl px-3.5 py-2 text-[12px] font-extrabold transition ${
                      editLang === l.key ? "grad-bg text-white" : "text-gray-500 hover:bg-white"
                    }`}
                  >
                    {l.native}
                  </button>
                ))}
              </div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                {customCount} custom {customCount === 1 ? "word" : "words"}
              </span>
              {customCount > 0 && (
                <button
                  onClick={() => set("textOverrides", {})}
                  className="sm:ml-auto inline-flex items-center gap-1.5 text-[11.5px] font-extrabold text-gray-500 hover:text-rose-500 transition"
                >
                  <RotateCcw size={13} />
                  Reset all to default
                </button>
              )}
            </div>

            <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
              {TEXT_GROUPS.map((g) => (
                <button
                  key={g}
                  onClick={() => setTextGroup(g)}
                  className={`shrink-0 rounded-full px-3.5 py-2 text-[11.5px] font-extrabold transition ${
                    textGroup === g ? "grad-bg text-white" : "bg-[#fafafc] border border-gray-100 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {groupKeys.map((key) => {
                const custom = v.textOverrides[overrideKey(editLang, key)] !== undefined;
                return (
                  <label key={key} className="block min-w-0">
                    <span className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 truncate">
                        {UI_TEXT[key].label}
                      </span>
                      {custom && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setTextValue(key, "");
                          }}
                          className="text-[9.5px] font-extrabold uppercase tracking-wider text-[var(--g2)] shrink-0"
                        >
                          reset
                        </button>
                      )}
                    </span>
                    <input
                      value={textValue(key)}
                      onChange={(e) => setTextValue(key, e.target.value)}
                      placeholder={UI_TEXT[key][editLang]}
                      className={`field font-semibold ${custom ? "!border-[color-mix(in_srgb,var(--g1)_45%,transparent)]" : ""}`}
                    />
                  </label>
                );
              })}
            </div>
          </Card>
        </>
      )}

      {/* ---------------- admin panel ---------------- */}
      {tab === "panel" && (
        <Card icon={Columns2} title="Sidebar Menu Behaviour" hint="How the admin menu opens on every page load">
          <div className="space-y-2.5">
            {(
              [
                ["expanded", "Always expanded", "Icons with labels — the full 256px sidebar", PanelLeftOpen],
                ["collapsed", "Always collapsed", "Narrow icon rail, more room for tables", PanelLeftClose],
                ["remember", "Remember my last choice", "Keeps whatever you picked last time (default)", RotateCcw],
              ] as const
            ).map(([mode, label, hint, Icon]) => {
              const active = v.adminMenuMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => set("adminMenuMode", mode)}
                  className={`w-full flex items-start gap-3 rounded-2xl border-[1.5px] px-4 py-3.5 text-left transition ${
                    active
                      ? "border-[color-mix(in_srgb,var(--g1)_45%,transparent)] bg-[color-mix(in_srgb,var(--g1)_7%,white)]"
                      : "border-gray-200 bg-[#fbfbfe] hover:border-gray-300"
                  }`}
                >
                  <span
                    className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${
                      active ? "grad-bg text-white" : "bg-white border border-gray-200 text-gray-400"
                    }`}
                  >
                    <Icon size={15} strokeWidth={2.3} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-extrabold text-gray-800">{label}</span>
                    <span className="block text-[11px] font-semibold text-gray-400 leading-snug">{hint}</span>
                  </span>
                  {active && (
                    <span className="ml-auto shrink-0 grad-bg text-white w-5 h-5 rounded-full grid place-items-center">
                      <Check size={11} strokeWidth={3.5} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="flex items-start gap-2 text-[11.5px] font-bold text-gray-500 bg-[#fafafc] border border-gray-100 rounded-2xl px-3.5 py-2.5">
            <Info size={14} className="shrink-0 mt-[1px]" />
            Applies to the desktop sidebar and the mobile icon rail. Reload the panel once after saving to see it.
          </p>
        </Card>
      )}

      {/* sticky save */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-auto z-[45] px-3 pb-3 pt-2 bg-gradient-to-t from-[#f5f5f8] via-[#f5f5f8] to-transparent pointer-events-none">
        <div className="max-w-[1400px] mx-auto flex justify-end pointer-events-auto">
          <button
            onClick={save}
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 grad-bg text-white rounded-2xl px-7 py-3.5 text-[13.5px] font-extrabold shadow-[0_12px_32px_rgba(255,61,119,0.32)] hover:opacity-90 active:scale-[0.99] transition disabled:opacity-70"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} strokeWidth={2.4} />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      <Toast state={toast} />
    </div>
  );
}
