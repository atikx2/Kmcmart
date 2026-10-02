"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Columns2, Columns3, FileText, Printer, Tag } from "lucide-react";
import type { AdminOrderDetail, OrderStatusOption } from "@/lib/order-status";
import LabelSheet from "./LabelSheet";
import PrintSheet from "./PrintSheet";

type Mode = "label" | "invoice";

const TAB =
  "flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-extrabold transition whitespace-nowrap";

export default function PrintClient({
  orders,
  statuses,
  settings,
  courierName,
}: {
  orders: AdminOrderDetail[];
  statuses: OrderStatusOption[];
  settings: { siteName: string; phone: string; address: string; email: string };
  courierName: string;
}) {
  const [mode, setMode] = useState<Mode>("label");
  const [columns, setColumns] = useState<2 | 3>(2);
  const printed = useRef(false);

  /* Open the print dialog once on arrival, the way this page always has. */
  useEffect(() => {
    if (orders.length === 0 || printed.current) return;
    printed.current = true;
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, [orders.length]);

  const perPage = columns === 2 ? 10 : 18;
  const pages = Math.max(1, Math.ceil(orders.length / perPage));

  return (
    <div className="min-h-screen bg-[#f5f5f8] print:bg-white">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-100 px-3 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/admin/orders"
            className="w-9 h-9 shrink-0 rounded-xl grid place-items-center border border-gray-200 text-gray-500 hover:border-[var(--g1)] hover:text-[var(--g2)] transition"
            aria-label="Back to orders"
          >
            <ArrowLeft size={16} />
          </Link>

          <div className="flex gap-1 p-1 rounded-2xl bg-[#f4f4f7] shrink-0">
            <button
              onClick={() => setMode("label")}
              className={`${TAB} ${mode === "label" ? "bg-white shadow-sm text-[var(--g2)]" : "text-gray-500"}`}
            >
              <Tag size={13} />
              Labels
            </button>
            <button
              onClick={() => setMode("invoice")}
              className={`${TAB} ${mode === "invoice" ? "bg-white shadow-sm text-[var(--g2)]" : "text-gray-500"}`}
            >
              <FileText size={13} />
              Invoices
            </button>
          </div>

          {mode === "label" && (
            <div className="flex gap-1 p-1 rounded-2xl bg-[#f4f4f7] shrink-0">
              <button
                onClick={() => setColumns(2)}
                title="2 per row — fits 99×57mm sticker sheets"
                className={`${TAB} ${columns === 2 ? "bg-white shadow-sm text-[var(--g2)]" : "text-gray-500"}`}
              >
                <Columns2 size={13} />
                10/page
              </button>
              <button
                onClick={() => setColumns(3)}
                title="3 per row — smallest, most labels per sheet"
                className={`${TAB} ${columns === 3 ? "bg-white shadow-sm text-[var(--g2)]" : "text-gray-500"}`}
              >
                <Columns3 size={13} />
                18/page
              </button>
            </div>
          )}

          <p className="text-[11.5px] font-bold text-gray-400 ml-auto hidden sm:block">
            {orders.length} order{orders.length === 1 ? "" : "s"}
            {mode === "label" && orders.length > 0 && ` · ${pages} sheet${pages === 1 ? "" : "s"}`}
          </p>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 grad-bg text-white rounded-xl px-4 py-2.5 text-[12.5px] font-extrabold hover:opacity-90 transition shrink-0"
          >
            <Printer size={14} />
            Print
          </button>
        </div>
      </div>

      <div className="p-3 md:p-4">
        {orders.length === 0 ? (
          <p className="text-center text-sm font-bold text-gray-400 py-16">
            No orders selected. Go back and tick some orders first.
          </p>
        ) : mode === "label" ? (
          <LabelSheet orders={orders} siteName={settings.siteName} courierName={courierName} columns={columns} />
        ) : (
          <PrintSheet orders={orders} statuses={statuses} settings={settings} />
        )}
      </div>
    </div>
  );
}
