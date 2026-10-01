"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  Images,
  KeyRound,
  LayoutDashboard,
  List,
  Loader2,
  LogOut,
  Mail,
  Menu as MenuIcon,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Shapes,
  ShieldCheck,
  ShoppingCart,
  Store,
  Users,
  X,
} from "lucide-react";

type NavItem = {
  href?: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  soon?: boolean;
  badge?: number;
};

type NavEntry = { section: string } | NavItem;

function isItem(e: NavEntry): e is NavItem {
  return "label" in e;
}

const NAV: NavEntry[] = [
  { section: "Main" },
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { section: "Manage" },
  { label: "Orders", icon: ShoppingCart, soon: true },
  { label: "Products", icon: Package, soon: true },
  { label: "Categories", icon: Shapes, soon: true },
  { label: "Banners", icon: Images, soon: true },
  { label: "Menus", icon: List, soon: true },
  { section: "System" },
  { label: "Customers", icon: Users, soon: true },
  { label: "Roles", icon: ShieldCheck, soon: true },
  { label: "Site Settings", icon: Settings, soon: true },
];

/* ---------------- profile modals ---------------- */

function ProfileModal({
  mode,
  onClose,
  onDone,
}: {
  mode: "email" | "password";
  onClose: () => void;
  onDone: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setOk("");
    if (mode === "password" && newPassword !== confirm) {
      setError("New passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "email"
            ? { mode, email: email.trim(), currentPassword }
            : { mode, currentPassword, newPassword }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setOk(mode === "email" ? "Email updated successfully" : "Password updated successfully");
      setTimeout(() => {
        onDone();
        onClose();
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" onClick={onClose} />
      <div className="relative w-full max-w-[420px] bg-white rounded-3xl shadow-2xl p-6 md:p-7 animate-slide-down">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-extrabold text-lg flex items-center gap-2.5">
            <span className="grad-bg text-white rounded-xl p-2">
              {mode === "email" ? <Mail size={15} /> : <KeyRound size={15} />}
            </span>
            {mode === "email" ? "Change Email" : "Change Password"}
          </h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 grid place-items-center hover:bg-gray-200" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "email" && (
            <label className="block">
              <span className="block text-[12.5px] font-extrabold text-gray-700 mb-1.5">New Email</span>
              <span className="relative block">
                <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  className="field"
                  placeholder="new-admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </span>
            </label>
          )}

          <label className="block">
            <span className="block text-[12.5px] font-extrabold text-gray-700 mb-1.5">
              {mode === "email" ? "Current Password" : "Current Password"}
            </span>
            <span className="relative block">
              <KeyRound size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                className="field"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </span>
          </label>

          {mode === "password" && (
            <>
              <label className="block">
                <span className="block text-[12.5px] font-extrabold text-gray-700 mb-1.5">New Password</span>
                <span className="relative block">
                  <KeyRound size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    className="field"
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </span>
              </label>
              <label className="block">
                <span className="block text-[12.5px] font-extrabold text-gray-700 mb-1.5">Confirm New Password</span>
                <span className="relative block">
                  <KeyRound size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    className="field"
                    placeholder="Repeat new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </span>
              </label>
            </>
          )}

          {error && <p className="text-sm font-bold text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</p>}
          {ok && <p className="text-sm font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">{ok}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full grad-bg text-white rounded-2xl py-3 text-sm font-extrabold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition disabled:opacity-70"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ---------------- shell ---------------- */

export default function AdminShell({
  email,
  pendingOrders,
  logo,
  siteName,
  children,
}: {
  email: string;
  pendingOrders: number;
  logo: string;
  siteName: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [modal, setModal] = useState<"email" | "password" | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  /* persist collapse state */
  useEffect(() => {
    try {
      if (localStorage.getItem("kmc_admin_nav") === "1") setCollapsed(true);
    } catch { /* ignore */ }
  }, []);
  const toggleCollapse = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem("kmc_admin_nav", c ? "0" : "1");
      } catch { /* ignore */ }
      return !c;
    });
  };

  /* close profile dropdown on outside click */
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  useEffect(() => {
    setMobileNav(false);
    setProfileOpen(false);
  }, [pathname]);

  const logout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  const title =
    pathname === "/admin" ? "Dashboard" : "Admin Panel";

  const navContent = (isCollapsed: boolean) => (
    <nav className="flex-1 overflow-y-auto no-scrollbar py-3">
      {NAV.map((entry, idx) => {
        if (!isItem(entry)) {
          return isCollapsed ? (
            <div key={idx} className="mx-4 my-3 border-t border-gray-100" />
          ) : (
            <p key={idx} className="px-5 pt-4 pb-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-gray-300">
              {entry.section}
            </p>
          );
        }
        const Icon = entry.icon;
        const active = entry.href ? pathname === entry.href : false;
        const badge = entry.label === "Orders" ? pendingOrders : entry.badge;

        const inner = (
          <>
            <Icon size={18} className={active ? "text-white" : "text-gray-400 group-hover:text-[var(--g2)]"} />
            {!isCollapsed && <span className="flex-1 truncate">{entry.label}</span>}
            {!isCollapsed && entry.soon && (
              <span className="text-[8.5px] font-extrabold tracking-wider bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-md">SOON</span>
            )}
            {!isCollapsed && !entry.soon && badge !== undefined && badge > 0 && (
              <span className="text-[10px] font-extrabold bg-red-500 text-white min-w-[20px] h-5 px-1 rounded-full grid place-items-center">
                {badge}
              </span>
            )}
            {isCollapsed && badge !== undefined && badge > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            )}
          </>
        );

        const cls = `relative group flex items-center gap-3 rounded-2xl mx-3 px-3.5 py-3 text-[13px] font-extrabold transition-all ${
          active ? "grad-bg text-white shadow-[0_8px_22px_rgba(255,61,119,0.35)]" : "text-gray-600 hover:bg-gray-50"
        } ${isCollapsed ? "justify-center px-0" : ""}`;

        return entry.soon ? (
          <span key={entry.label} title={entry.label} className={`${cls} cursor-not-allowed opacity-70`}>
            {inner}
          </span>
        ) : (
          <Link key={entry.label} href={entry.href!} title={entry.label} className={cls}>
            {inner}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f5f5f8] flex">
      {/* desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-gray-100 sticky top-0 h-screen shrink-0 transition-[width] duration-300 ease-out z-50 ${
          collapsed ? "w-[84px]" : "w-[256px]"
        }`}
      >
        <div className={`flex items-center h-[72px] border-b border-gray-100 ${collapsed ? "justify-center" : "px-5"}`}>
          {collapsed ? (
            <span className="w-11 h-11 rounded-2xl grad-bg grid place-items-center text-white font-display font-extrabold text-xl">K</span>
          ) : (
            <Image src={logo} alt={siteName} width={160} height={38} className="h-9 w-auto" priority />
          )}
        </div>

        {navContent(collapsed)}

        <div className="border-t border-gray-100 p-3">
          <button
            onClick={toggleCollapse}
            className={`w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[13px] font-extrabold text-gray-500 hover:bg-gray-50 transition ${
              collapsed ? "justify-center px-0" : ""
            }`}
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            {!collapsed && <span>Collapse Menu</span>}
          </button>
        </div>
      </aside>

      {/* mobile drawer */}
      <div className={`fixed inset-0 z-[110] lg:hidden ${mobileNav ? "" : "pointer-events-none"}`}>
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${
            mobileNav ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileNav(false)}
        />
        <aside
          className={`absolute left-0 top-0 h-full w-[268px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ${
            mobileNav ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between h-[72px] px-5 border-b border-gray-100">
            <Image src={logo} alt={siteName} width={150} height={36} className="h-8 w-auto" />
            <button onClick={() => setMobileNav(false)} className="w-9 h-9 rounded-full bg-gray-100 grid place-items-center" aria-label="Close menu">
              <X size={16} />
            </button>
          </div>
          {navContent(false)}
        </aside>
      </div>

      {/* main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* header */}
        <header className="sticky top-0 z-40 h-[72px] bg-white/90 backdrop-blur-md border-b border-gray-100 flex items-center gap-3 px-4 md:px-6">
          <button
            onClick={() => setMobileNav(true)}
            className="lg:hidden w-10 h-10 grid place-items-center rounded-2xl hover:bg-gray-100"
            aria-label="Open menu"
          >
            <MenuIcon size={20} />
          </button>
          <h1 className="font-display font-extrabold text-lg md:text-xl tracking-tight">{title}</h1>

          <div className="ml-auto flex items-center gap-2.5">
            <Link
              href="/"
              className="hidden sm:flex items-center gap-2 text-[12.5px] font-extrabold text-gray-600 border-[1.5px] border-gray-200 hover:border-[var(--g1)] rounded-full px-4 py-2.5 transition"
            >
              <Store size={15} className="text-[var(--g2)]" />
              View Store
            </Link>

            {/* profile */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2.5 rounded-full border-[1.5px] border-gray-200 hover:border-[var(--g1)] pl-1.5 pr-3 py-1.5 transition"
              >
                <span className="w-8.5 h-8.5 w-9 h-9 rounded-full grad-bg text-white grid place-items-center font-display font-extrabold text-sm">
                  {email.charAt(0).toUpperCase()}
                </span>
                <span className="hidden md:block max-w-[170px] truncate text-[12.5px] font-extrabold text-gray-700">
                  {email}
                </span>
                <ChevronDown size={15} className={`text-gray-400 transition-transform ${profileOpen ? "rotate-180" : ""}`} />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] w-[264px] bg-white rounded-2xl border border-gray-100 shadow-[0_20px_60px_rgba(17,18,28,0.16)] overflow-hidden animate-slide-down">
                  <div className="px-4 py-3.5 border-b border-gray-100">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">Signed in as</p>
                    <p className="text-[13px] font-extrabold text-gray-800 truncate mt-0.5">{email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setModal("email");
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition"
                  >
                    <span className="grad-soft rounded-lg p-2 text-[var(--g2)]">
                      <Mail size={14} />
                    </span>
                    Change Email
                  </button>
                  <button
                    onClick={() => {
                      setModal("password");
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition"
                  >
                    <span className="grad-soft rounded-lg p-2 text-[var(--g2)]">
                      <KeyRound size={14} />
                    </span>
                    Change Password
                  </button>
                  <div className="border-t border-gray-100" />
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-bold text-red-500 hover:bg-red-50 transition"
                  >
                    <span className="bg-red-50 rounded-lg p-2 text-red-500">
                      <LogOut size={14} />
                    </span>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 min-w-0">{children}</main>
      </div>

      {modal && <ProfileModal mode={modal} onClose={() => setModal(null)} onDone={() => router.refresh()} />}
    </div>
  );
}
