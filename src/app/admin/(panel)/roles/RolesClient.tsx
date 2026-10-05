"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  AtSign,
  Check,
  Crown,
  Eye,
  EyeOff,
  Hash,
  KeyRound,
  Loader2,
  Lock,
  MousePointerClick,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLES,
  presetPermissions,
  roleLabel,
  ROLE_CHIP,
  type AdminAccount,
  type PermissionKey,
} from "@/lib/permissions";
import ConfirmModal from "@/components/admin/ConfirmModal";
import Toast, { useToast } from "@/components/admin/Toast";
import { ACTION_BTN, StatChip, Th } from "@/components/admin/table-ui";

type Draft = {
  name: string;
  email: string;
  password: string;
  role: string;
  permissions: PermissionKey[];
};

function samePerms(a: string[], b: string[]) {
  return a.length === b.length && a.every((x) => b.includes(x));
}

function AdminModal({
  mode,
  account,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  account?: AdminAccount;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [v, setV] = useState<Draft>(
    account
      ? {
          name: account.name,
          email: account.email,
          password: "",
          role: account.role,
          permissions: account.permissions as PermissionKey[],
        }
      : { name: "", email: "", password: "", role: "manager", permissions: presetPermissions("manager") }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  const pickRole = (role: string) =>
    setV((p) => ({ ...p, role, permissions: role === "custom" ? p.permissions : presetPermissions(role) }));

  const togglePerm = (key: PermissionKey) =>
    setV((p) => {
      const next = p.permissions.includes(key)
        ? p.permissions.filter((k) => k !== key)
        : [...p.permissions, key];
      /* picking your own mix turns the role into Custom */
      const match = ADMIN_ROLES.find((r) => r.key !== "custom" && samePerms([...r.permissions], next));
      return { ...p, permissions: next, role: match?.key ?? "custom" };
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (v.name.trim().length < 2) return setError("Name must be at least 2 characters");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) return setError("Enter a valid email address");
    if (mode === "create" && v.password.length < 6) return setError("Password must be at least 6 characters");
    if (v.permissions.length === 0) return setError("Give the admin access to at least one page");

    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        name: v.name.trim(),
        email: v.email.trim().toLowerCase(),
        role: v.role,
        permissions: v.permissions,
      };
      if (v.password) payload.password = v.password;

      const res = await fetch(mode === "create" ? "/api/admin/admins" : `/api/admin/admins/${account!.id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save");
      onSaved(mode === "create" ? "Admin added" : "Admin updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      setSaving(false);
    }
  };

  const ownerLocked = account?.isOwner ?? false;

  return (
    <div className="fixed inset-0 z-[130] grid place-items-center px-4 py-6 overflow-y-auto">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" onClick={saving ? undefined : onClose} />
      <form onSubmit={submit} className="relative w-full max-w-[600px] bg-white rounded-3xl shadow-2xl animate-slide-down my-auto">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <span className="grad-bg text-white rounded-xl p-2 shrink-0">
            {mode === "create" ? <UserPlus size={15} strokeWidth={2.4} /> : <ShieldCheck size={15} strokeWidth={2.4} />}
          </span>
          <h2 className="font-display font-extrabold text-base md:text-lg truncate">
            {mode === "create" ? "Add Admin" : `Edit ${account?.name}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="ml-auto w-9 h-9 rounded-full bg-gray-100 grid place-items-center hover:bg-gray-200 transition disabled:opacity-50 shrink-0"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[64vh] overflow-y-auto">
          {ownerLocked && (
            <p className="flex items-start gap-2 text-[11.5px] font-bold text-[var(--g2)] bg-[color-mix(in_srgb,var(--g1)_8%,white)] border border-[color-mix(in_srgb,var(--g1)_25%,white)] rounded-xl px-3.5 py-2.5">
              <Crown size={14} className="shrink-0 mt-[1px]" />
              This is the Super Admin. Name, email and password can change — access always stays full and the account
              can never be removed.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block min-w-0">
              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">Full name</span>
              <span className="relative block">
                <User size={16} strokeWidth={2.3} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--g2)] pointer-events-none z-[1]" />
                <input
                  value={v.name}
                  onChange={(e) => setV((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Rahim Uddin"
                  className="field font-bold"
                />
              </span>
            </label>

            <label className="block min-w-0">
              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">Email</span>
              <span className="relative block">
                <AtSign size={16} strokeWidth={2.3} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--g2)] pointer-events-none z-[1]" />
                <input
                  type="email"
                  value={v.email}
                  onChange={(e) => setV((p) => ({ ...p, email: e.target.value }))}
                  placeholder="admin@kmcbazar.com"
                  className="field font-semibold"
                />
              </span>
            </label>
          </div>

          <label className="block min-w-0">
            <span className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">
              {mode === "create" ? "Password" : "New password"}
            </span>
            <span className="relative block">
              <KeyRound size={16} strokeWidth={2.3} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--g2)] pointer-events-none z-[1]" />
              <input
                type={showPw ? "text" : "password"}
                value={v.password}
                onChange={(e) => setV((p) => ({ ...p, password: e.target.value }))}
                placeholder={mode === "create" ? "At least 6 characters" : "Leave blank to keep the current one"}
                className="field font-semibold pr-12"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </label>

          {!ownerLocked && (
            <>
              <div>
                <span className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-2">Role</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {ADMIN_ROLES.filter((r) => r.key !== "owner").map((r) => {
                    const active = v.role === r.key;
                    return (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => pickRole(r.key)}
                        className={`rounded-2xl border-[1.5px] px-3.5 py-3 text-left transition ${
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
                          <span className="text-[12.5px] font-extrabold text-gray-800">{r.label}</span>
                        </span>
                        <span className="mt-1 block text-[10.5px] font-semibold text-gray-400 leading-snug">{r.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                    Page access
                  </span>
                  <span className="text-[10.5px] font-extrabold text-gray-400">
                    {v.permissions.length}/{ADMIN_PERMISSIONS.length} selected
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ADMIN_PERMISSIONS.map((p) => {
                    const on = v.permissions.includes(p.key);
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => togglePerm(p.key)}
                        className={`flex items-start gap-2.5 rounded-xl border-[1.5px] px-3 py-2.5 text-left transition ${
                          on
                            ? "border-[color-mix(in_srgb,var(--g1)_40%,transparent)] bg-[color-mix(in_srgb,var(--g1)_6%,white)]"
                            : "border-gray-200 bg-[#fbfbfe] hover:border-gray-300"
                        }`}
                      >
                        <span
                          className={`w-[18px] h-[18px] rounded-md grid place-items-center shrink-0 mt-[1px] ${
                            on ? "grad-bg text-white" : "bg-white ring-1 ring-gray-300"
                          }`}
                        >
                          {on && <Check size={11} strokeWidth={3.5} />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[12px] font-extrabold text-gray-800">{p.label}</span>
                          <span className="block text-[10px] font-semibold text-gray-400 leading-snug">{p.hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {error && (
            <p className="flex items-center gap-2 text-[12px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2.5">
              <AlertTriangle size={14} />
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2.5 px-5 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-2xl px-4 py-3 text-[12.5px] font-extrabold text-gray-500 bg-gray-100 hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 grad-bg text-white rounded-2xl py-3 text-[13px] font-extrabold hover:opacity-90 transition disabled:opacity-70"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {saving ? "Saving…" : mode === "create" ? "Create Admin" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function RolesClient({ initial }: { initial: AdminAccount[] }) {
  const router = useRouter();
  const [toast, showToast] = useToast();
  const [items, setItems] = useState<AdminAccount[]>(initial);
  const [loading, setLoading] = useState(false);
  const [rowBusy, setRowBusy] = useState<number | null>(null);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; row?: AdminAccount } | null>(null);
  const [toDelete, setToDelete] = useState<AdminAccount | null>(null);
  const [working, setWorking] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/admins");
      if (!res.ok) throw new Error();
      setItems((await res.json()).items);
    } catch {
      showToast("err", "Could not load admins");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const toggleActive = async (a: AdminAccount) => {
    setRowBusy(a.id);
    try {
      const res = await fetch(`/api/admin/admins/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !a.isActive }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not update");
      setItems((prev) => prev.map((x) => (x.id === a.id ? { ...x, isActive: !a.isActive } : x)));
      showToast("ok", !a.isActive ? `${a.name} can sign in again` : `${a.name} is blocked from signing in`);
      router.refresh();
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "Could not update");
    } finally {
      setRowBusy(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setWorking(true);
    try {
      const res = await fetch(`/api/admin/admins/${toDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      setToDelete(null);
      showToast("ok", "Admin removed");
      await refresh();
      router.refresh();
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "Delete failed");
    } finally {
      setWorking(false);
    }
  };

  const counts = useMemo(
    () => ({
      total: items.length,
      active: items.filter((a) => a.isActive).length,
      staff: items.filter((a) => !a.isOwner).length,
    }),
    [items]
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-3 md:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 sm:mx-0 sm:px-0">
            <StatChip icon={Users} label="admins" value={counts.total} />
            <StatChip icon={ShieldCheck} label="active" value={counts.active} />
            <StatChip icon={Crown} label="super admin" value={1} />
          </div>
          <button
            onClick={() => setModal({ mode: "create" })}
            className="sm:ml-auto shrink-0 flex items-center justify-center gap-2 grad-bg text-white rounded-2xl px-4 py-2.5 text-[12.5px] font-extrabold hover:opacity-90 transition"
          >
            <Plus size={15} strokeWidth={2.6} />
            Add Admin
          </button>
        </div>

        <p className="mt-3 flex items-start gap-2 text-[11.5px] font-bold text-sky-700 bg-sky-50 border border-sky-100 rounded-2xl px-3.5 py-2.5">
          <Lock size={14} className="shrink-0 mt-[1px]" />
          <span>
            A new admin only sees the pages you tick. Hidden pages are blocked on the server too, so typing the URL by
            hand does not get around it. The Super Admin (the very first account) can never be disabled or deleted.
          </span>
        </p>
      </div>

      <div className="relative bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-extrabold text-base md:text-lg flex items-center gap-2.5 min-w-0">
            <span className="grad-bg text-white rounded-xl p-2 shrink-0">
              <ShieldCheck size={15} strokeWidth={2.4} />
            </span>
            <span className="truncate">Admin Accounts</span>
          </h2>
          <span className="shrink-0 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
            {loading && <Loader2 size={13} className="animate-spin text-[var(--g2)]" />}
            {items.length} total
          </span>
        </div>

        <div className="relative">
          <div className="overflow-x-auto overscroll-x-contain [scrollbar-width:thin] [scrollbar-color:#d8d8e2_transparent]">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="text-left bg-gradient-to-r from-[#fff8f3] via-[#fff6f8] to-[#fff4f8] border-y border-gray-100">
                  <Th icon={Hash} label="SL" className="w-[64px]" />
                  <Th icon={User} label="Admin" />
                  <Th icon={ShieldCheck} label="Role" />
                  <Th icon={KeyRound} label="Page access" />
                  <Th icon={Eye} label="Status" />
                  <Th icon={MousePointerClick} label="Action" className="text-right" />
                </tr>
              </thead>
              <tbody>
                {items.map((a, i) => (
                  <tr
                    key={a.id}
                    className={`group border-b border-gray-50 last:border-0 align-top transition-colors ${
                      i % 2 === 1 ? "bg-[#fcfcfd] hover:bg-[#fff7f3]" : "hover:bg-[#fff7f3]"
                    }`}
                  >
                    <td className="px-3 py-4">
                      <span className="inline-grid place-items-center w-7 h-7 rounded-lg bg-[#fafafc] border border-gray-100 text-[11px] font-extrabold text-gray-500">
                        {i + 1}
                      </span>
                    </td>

                    <td className="px-3 py-4">
                      <div className="w-[230px] flex items-start gap-2.5">
                        <span
                          className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${
                            a.isOwner ? "grad-bg text-white" : "bg-[#fafafc] border border-gray-100 text-gray-400"
                          }`}
                        >
                          {a.isOwner ? <Crown size={15} strokeWidth={2.3} /> : <User size={15} strokeWidth={2.3} />}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-extrabold text-gray-800 leading-snug truncate">{a.name}</p>
                          <p className="text-[11px] font-semibold text-gray-400 truncate">{a.email}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {a.isSelf && (
                              <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-[2px] rounded-md bg-gray-100 text-gray-500">
                                You
                              </span>
                            )}
                            <span className="text-[9px] font-bold text-gray-400">added {a.createdAt}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-[4px] rounded-full ring-1 ${
                          ROLE_CHIP[a.role] ?? ROLE_CHIP.custom
                        }`}
                      >
                        {a.isOwner && <Crown size={10} strokeWidth={2.6} />}
                        {roleLabel(a.role)}
                      </span>
                    </td>

                    <td className="px-3 py-4">
                      <div className="w-[260px] flex flex-wrap gap-1">
                        {a.isOwner ? (
                          <span className="text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-[4px] rounded-md bg-[color-mix(in_srgb,var(--g1)_10%,white)] text-[var(--g2)] border border-[color-mix(in_srgb,var(--g1)_22%,white)]">
                            Full access — all pages
                          </span>
                        ) : (
                          <>
                            {a.permissions.slice(0, 5).map((p) => (
                              <span
                                key={p}
                                className="text-[9.5px] font-extrabold px-1.5 py-[3px] rounded-md bg-[#fafafc] text-gray-600 border border-gray-100"
                              >
                                {ADMIN_PERMISSIONS.find((x) => x.key === p)?.label ?? p}
                              </span>
                            ))}
                            {a.permissions.length > 5 && (
                              <span className="text-[9.5px] font-extrabold px-1.5 py-[3px] rounded-md bg-[#fafafc] text-gray-400 border border-gray-100">
                                +{a.permissions.length - 5}
                              </span>
                            )}
                            {a.permissions.length === 0 && (
                              <span className="text-[9.5px] font-extrabold px-1.5 py-[3px] rounded-md bg-rose-50 text-rose-500 border border-rose-100">
                                No access
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-4">
                      {a.isOwner ? (
                        <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-[4px] rounded-full ring-1 bg-emerald-50 text-emerald-600 ring-emerald-100">
                          <Lock size={10} strokeWidth={2.6} />
                          Always on
                        </span>
                      ) : (
                        <button
                          onClick={() => toggleActive(a)}
                          disabled={rowBusy === a.id || a.isSelf}
                          title={
                            a.isSelf
                              ? "You cannot disable your own account"
                              : a.isActive
                                ? "Active — click to block sign-in"
                                : "Blocked — click to allow sign-in"
                          }
                          className={`inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-[4px] rounded-full ring-1 transition disabled:opacity-60 ${
                            a.isActive
                              ? "bg-emerald-50 text-emerald-600 ring-emerald-100 hover:bg-emerald-100"
                              : "bg-gray-100 text-gray-500 ring-gray-200 hover:bg-gray-200"
                          }`}
                        >
                          {rowBusy === a.id ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : a.isActive ? (
                            <Eye size={10} strokeWidth={2.6} />
                          ) : (
                            <EyeOff size={10} strokeWidth={2.6} />
                          )}
                          {a.isActive ? "Active" : "Blocked"}
                        </button>
                      )}
                    </td>

                    <td className="px-3 py-4">
                      <div className="flex justify-end">
                        <div className="inline-grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-[#fafafc] border border-gray-100">
                          <button
                            onClick={() => setModal({ mode: "edit", row: a })}
                            title="Edit admin"
                            className={`${ACTION_BTN} bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white`}
                          >
                            <Pencil size={13} strokeWidth={2.4} />
                          </button>
                          {a.isOwner || a.isSelf ? (
                            <span
                              title={a.isOwner ? "The Super Admin cannot be deleted" : "You cannot delete yourself"}
                              className={`${ACTION_BTN} bg-gray-100 text-gray-300 cursor-not-allowed`}
                            >
                              <Lock size={13} strokeWidth={2.4} />
                            </span>
                          ) : (
                            <button
                              onClick={() => setToDelete(a)}
                              title="Remove admin"
                              className={`${ACTION_BTN} bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white`}
                            >
                              <Trash2 size={13} strokeWidth={2.4} />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <span className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent 2xl:hidden" />
        </div>
      </div>

      {modal && (
        <AdminModal
          key={modal.mode === "edit" ? `edit-${modal.row?.id}` : "create"}
          mode={modal.mode}
          account={modal.row}
          onClose={() => setModal(null)}
          onSaved={async (msg) => {
            setModal(null);
            showToast("ok", msg);
            await refresh();
            router.refresh();
          }}
        />
      )}

      {toDelete && (
        <ConfirmModal
          title={`Remove ${toDelete.name}?`}
          message="They lose access to the admin panel immediately. Orders and products they created stay untouched."
          confirmLabel="Remove admin"
          loading={working}
          onConfirm={confirmDelete}
          onClose={() => setToDelete(null)}
        />
      )}

      <Toast state={toast} />
    </div>
  );
}
