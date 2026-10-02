"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Eye,
  Hash,
  Inbox,
  Loader2,
  MapPin,
  MousePointerClick,
  Package,
  Phone,
  Repeat,
  RotateCcw,
  Search,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";
import { taka } from "@/lib/format";
import { FRAUD_BAR, FRAUD_TEXT } from "@/lib/order-status";
import type { AdminCustomerList } from "@/lib/admin-customers";
import { ACTION_BTN, StatChip, Th } from "@/components/admin/table-ui";

export default function CustomersClient({ initial }: { initial: AdminCustomerList }) {
  const [data, setData] = useState<AdminCustomerList>(initial);
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const firstRender = useRef(true);

  /* live search — fires 300ms after typing stops */
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(input.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [input]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams({
        q,
        offset: String(page * initial.limit),
        limit: String(initial.limit),
      });
      const res = await fetch(`/api/admin/customers?${sp.toString()}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      /* keep the previous page on screen */
    } finally {
      setLoading(false);
    }
  }, [q, page, initial.limit]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    refresh();
  }, [refresh]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));
  const from = data.total === 0 ? 0 : page * data.limit + 1;
  const to = Math.min(data.total, page * data.limit + data.items.length);

  return (
    <div className="space-y-4">
      {/* summary + live search */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] p-3 md:p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 lg:mx-0 lg:px-0">
            <StatChip icon={Users} label="customers" value={data.summary.customers} />
            <StatChip icon={BadgeCheck} label="registered" value={data.summary.registered} />
            <StatChip icon={Repeat} label="repeat" value={data.summary.repeat} />
            <StatChip icon={CircleDollarSign} label="revenue" value={taka(data.summary.revenue)} />
          </div>

          <span className="lg:ml-auto relative min-w-0 lg:w-[300px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search name, phone or address…"
              className="w-full rounded-2xl border-[1.5px] border-gray-200 bg-[#fbfbfe] pl-10 pr-9 py-2.5 text-[12.5px] font-bold outline-none focus:border-[var(--g1)] focus:bg-white transition"
            />
            {loading ? (
              <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-[var(--g2)]" />
            ) : (
              input && (
                <button
                  onClick={() => setInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )
            )}
          </span>
        </div>
      </div>

      {/* list */}
      <div className="relative bg-white rounded-3xl border border-gray-100 shadow-[0_4px_18px_rgba(17,18,28,0.05)] overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-extrabold text-base md:text-lg flex items-center gap-2.5 min-w-0">
            <span className="grad-bg text-white rounded-xl p-2 shrink-0">
              <Users size={15} strokeWidth={2.4} />
            </span>
            <span className="truncate">{q ? "Search results" : "All Customers"}</span>
          </h2>
          <span className="shrink-0 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
            {loading && <Loader2 size={13} className="animate-spin text-[var(--g2)]" />}
            {data.total} total
          </span>
        </div>

        {data.items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto w-20 h-20 rounded-full grad-soft grid place-items-center mb-4">
              <Inbox size={30} className="text-gray-400" />
            </span>
            <p className="font-display font-extrabold text-gray-700">
              {q ? "No customer matched your search" : "No customers yet"}
            </p>
            <p className="text-[13px] font-semibold text-gray-400 mt-1.5 max-w-[360px] mx-auto">
              {q ? "Try a different name, phone number or address." : "Everyone who places an order shows up here."}
            </p>
            {q && (
              <button
                onClick={() => setInput("")}
                className="mt-5 inline-flex items-center gap-2 grad-bg text-white text-[12.5px] font-extrabold px-5 py-2.5 rounded-full hover:opacity-90 transition"
              >
                <RotateCcw size={14} />
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="relative">
              <div className="overflow-x-auto overscroll-x-contain [scrollbar-width:thin] [scrollbar-color:#d8d8e2_transparent]">
                <table className="w-full min-w-[1000px] text-sm">
                  <thead>
                    <tr className="text-left bg-gradient-to-r from-[#fff8f3] via-[#fff6f8] to-[#fff4f8] border-y border-gray-100">
                      <Th icon={Hash} label="SL" className="w-[64px]" />
                      <Th icon={User} label="Customer" />
                      <Th icon={Phone} label="Phone" />
                      <Th icon={MapPin} label="Address" />
                      <Th icon={Package} label="Orders" />
                      <Th icon={CircleDollarSign} label="Spent" />
                      <Th icon={ShieldCheck} label="Trust" />
                      <Th icon={MousePointerClick} label="Action" className="text-right" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((c, i) => (
                      <tr
                        key={c.phone}
                        className={`group border-b border-gray-50 last:border-0 align-top transition-colors ${
                          i % 2 === 1 ? "bg-[#fcfcfd] hover:bg-[#fff7f3]" : "hover:bg-[#fff7f3]"
                        }`}
                      >
                        <td className="px-3 py-4">
                          <span className="inline-grid place-items-center w-7 h-7 rounded-lg bg-[#fafafc] border border-gray-100 text-[11px] font-extrabold text-gray-500">
                            {page * data.limit + i + 1}
                          </span>
                        </td>

                        {/* name */}
                        <td className="px-3 py-4">
                          <div className="w-[190px]">
                            <Link
                              href={`/admin/customers/${encodeURIComponent(c.phone)}`}
                              className="block text-[13px] font-extrabold text-gray-800 hover:grad-text leading-snug line-clamp-2"
                              title={c.name}
                            >
                              {c.name}
                            </Link>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              {c.hasAccount ? (
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-[3px] rounded-full ring-1 bg-emerald-50 text-emerald-600 ring-emerald-100">
                                  <BadgeCheck size={10} strokeWidth={2.6} />
                                  Account
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-[3px] rounded-full ring-1 bg-gray-100 text-gray-500 ring-gray-200">
                                  Guest
                                </span>
                              )}
                              <span className="text-[9.5px] font-bold text-gray-400">since {c.firstOrderAt}</span>
                            </div>
                          </div>
                        </td>

                        {/* phone */}
                        <td className="px-3 py-4">
                          <a
                            href={`tel:${c.phone}`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#fafafc] border border-gray-100 px-2.5 py-1.5 text-[12px] font-extrabold text-gray-700 hover:border-[var(--g1)] hover:text-[var(--g2)] transition whitespace-nowrap"
                          >
                            <Phone size={12} strokeWidth={2.5} className="text-[var(--g2)]" />
                            {c.phone}
                          </a>
                        </td>

                        {/* address */}
                        <td className="px-3 py-4">
                          <p className="w-[230px] text-[12px] font-semibold text-gray-500 leading-snug line-clamp-2" title={c.address}>
                            {c.address}
                          </p>
                        </td>

                        {/* orders */}
                        <td className="px-3 py-4">
                          <div className="w-[150px]">
                            <span className="font-display text-[15px] font-extrabold text-gray-800 leading-none">
                              {c.orderCount}
                            </span>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {c.delivered > 0 && (
                                <span className="text-[9.5px] font-extrabold px-1.5 py-[3px] rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100">
                                  {c.delivered} done
                                </span>
                              )}
                              {c.pending > 0 && (
                                <span className="text-[9.5px] font-extrabold px-1.5 py-[3px] rounded-md bg-amber-50 text-amber-600 border border-amber-100">
                                  {c.pending} open
                                </span>
                              )}
                              {c.cancelled > 0 && (
                                <span className="text-[9.5px] font-extrabold px-1.5 py-[3px] rounded-md bg-rose-50 text-rose-500 border border-rose-100">
                                  {c.cancelled} cancel
                                </span>
                              )}
                            </div>
                            <p className="mt-1.5 text-[9.5px] font-bold text-gray-400">last {c.lastOrderAt}</p>
                          </div>
                        </td>

                        {/* spent */}
                        <td className="px-3 py-4">
                          <span className="font-display font-extrabold text-[15.5px] grad-text leading-none whitespace-nowrap">
                            {taka(c.spent)}
                          </span>
                          <p className="mt-1.5 text-[9.5px] font-extrabold text-gray-400">delivered only</p>
                        </td>

                        {/* trust */}
                        <td className="px-3 py-4">
                          <div className="w-[116px]">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className={`text-[9.5px] font-extrabold uppercase tracking-wider ${FRAUD_TEXT[c.fraud.tone]}`}>
                                {c.fraud.label}
                              </span>
                              <span className={`font-display text-[13px] font-extrabold leading-none ${FRAUD_TEXT[c.fraud.tone]}`}>
                                {c.fraud.percent === null ? "—" : `${c.fraud.percent}%`}
                              </span>
                            </div>
                            <div className="relative mt-2 h-[8px] rounded-full bg-gray-100 shadow-[inset_0_1px_2px_rgba(17,18,28,0.09)] overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-[width] duration-500 ${FRAUD_BAR[c.fraud.tone]}`}
                                style={{ width: `${c.fraud.percent ?? 0}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* action */}
                        <td className="px-3 py-4">
                          <div className="flex justify-end">
                            <div className="inline-grid grid-cols-1 gap-1.5 p-1.5 rounded-2xl bg-[#fafafc] border border-gray-100">
                              <Link
                                href={`/admin/customers/${encodeURIComponent(c.phone)}`}
                                title="View full history"
                                className={`${ACTION_BTN} bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white`}
                              >
                                <Eye size={13} strokeWidth={2.4} />
                              </Link>
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

            <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-4 border-t border-gray-100">
              <p className="text-[11.5px] font-extrabold text-gray-400 min-w-0 truncate">
                {from}–{to} of {data.total}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || loading}
                  className="w-9 h-9 rounded-xl grid place-items-center border border-gray-200 text-gray-500 hover:border-[var(--g1)] hover:text-[var(--g2)] transition disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-[12px] font-extrabold text-gray-600 px-1 whitespace-nowrap">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => (data.hasMore ? p + 1 : p))}
                  disabled={!data.hasMore || loading}
                  className="w-9 h-9 rounded-xl grid place-items-center border border-gray-200 text-gray-500 hover:border-[var(--g1)] hover:text-[var(--g2)] transition disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
