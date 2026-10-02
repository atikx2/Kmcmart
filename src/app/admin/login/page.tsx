import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { BarChart3, ShieldCheck, Truck } from "lucide-react";
import { getSessionAdmin } from "@/lib/admin-auth";
import { getSettings } from "@/lib/data";
import AdminLoginForm from "./AdminLoginForm";

export const metadata: Metadata = { title: "Admin Login" };
export const dynamic = "force-dynamic";

const features = [
  { icon: BarChart3, text: "Real-time sales dashboard & analytics" },
  { icon: Truck, text: "Full order & delivery management" },
  { icon: ShieldCheck, text: "Secure role-based admin access" },
];

export default async function AdminLoginPage() {
  const admin = await getSessionAdmin();
  if (admin) redirect("/admin");

  const settings = await getSettings();

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* left brand panel */}
      <div className="hidden lg:flex relative overflow-hidden grad-bg text-white flex-col justify-between p-12">
        {/* decorative shapes */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-10 right-[-80px] w-96 h-96 rounded-full bg-black/10 blur-3xl" />
        <div className="absolute top-1/3 right-16 w-24 h-24 rounded-[28px] bg-white/10 rotate-12" />
        <div className="absolute bottom-1/4 left-20 w-14 h-14 rounded-2xl bg-white/15 -rotate-12" />

        <div className="relative">
          <Image
            src={settings.logoFooter}
            alt={settings.siteName}
            width={200}
            height={48}
            className="h-12 w-auto"
            priority
          />
        </div>

        <div className="relative max-w-md">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-white/70">
            Admin Control Center
          </p>
          <h1 className="mt-4 font-display text-4xl xl:text-[44px] font-extrabold leading-[1.12] tracking-tight">
            Run your entire store from one place.
          </h1>
          <p className="mt-4 text-[15px] text-white/75 font-semibold leading-relaxed">
            Track orders, manage products, customize the storefront and see your
            profits grow — everything in one beautiful dashboard.
          </p>

          <ul className="mt-8 space-y-3.5">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm font-bold text-white/90">
                <span className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur grid place-items-center shrink-0">
                  <Icon size={16} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs font-semibold text-white/60">
          © {new Date().getFullYear()} {settings.siteName}. All rights reserved.
        </p>
      </div>

      {/* right form panel */}
      <div className="flex items-center justify-center bg-[#fafafc] px-4 py-10 relative overflow-hidden">
        <div className="absolute top-[-120px] right-[-120px] w-72 h-72 rounded-full grad-soft blur-xl lg:hidden" />
        <div className="w-full max-w-[430px] relative animate-fade-up">
          <AdminLoginForm siteName={settings.siteName} logo={settings.logoHeader} />
        </div>
      </div>
    </div>
  );
}
