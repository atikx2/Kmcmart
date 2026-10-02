"use client";

import { taka } from "@/lib/format";
import { statusLabel, type AdminOrderDetail, type OrderStatusOption } from "@/lib/order-status";

/** Full A4 invoice, one order per page. The compact shipping label lives in LabelSheet. */
export default function PrintSheet({
  orders,
  statuses,
  settings,
}: {
  orders: AdminOrderDetail[];
  statuses: OrderStatusOption[];
  settings: { siteName: string; phone: string; address: string; email: string };
}) {
  return (
    <>
      <style>{`
        @media print {
          .invoice { page-break-after: always; box-shadow: none !important; border: 0 !important; margin: 0 !important; }
          .invoice:last-child { page-break-after: auto; }
          @page { size: A4 portrait; margin: 12mm; }
        }
      `}</style>

      <div className="space-y-4">
        {orders.length === 0 && (
          <p className="text-center text-sm font-bold text-gray-400 py-16">
            No orders selected. Go back and tick some orders first.
          </p>
        )}

        {orders.map((o) => (
          <div
            key={o.id}
            className="invoice bg-white rounded-2xl border border-gray-200 p-6 max-w-[760px] mx-auto text-[12px] text-gray-800"
          >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-200">
              <div className="min-w-0">
                <p className="font-display font-extrabold text-xl">{settings.siteName}</p>
                <p className="text-[11px] text-gray-500 mt-1 break-words">{settings.address}</p>
                <p className="text-[11px] text-gray-500">
                  {settings.phone} · {settings.email}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display font-extrabold text-lg">INVOICE</p>
                <p className="font-extrabold text-[13px]">#{o.code}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{o.placedAt}</p>
                <p className="text-[11px] text-gray-500">Status: {statusLabel(statuses, o.status)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-b border-gray-200">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1">Bill To</p>
                <p className="font-extrabold">{o.customerName}</p>
                <p className="text-gray-600">{o.phone}</p>
                <p className="text-gray-600 break-words">{o.address}</p>
              </div>
              <div className="min-w-0 sm:text-right">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1">Delivery</p>
                <p className="font-extrabold break-words">{o.deliveryAreaName}</p>
                <p className="text-gray-600">Charge: {taka(o.deliveryCharge)}</p>
                <p className="text-gray-600">Payment: Cash on Delivery</p>
              </div>
            </div>

            <table className="w-full mt-4">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-gray-400 border-b border-gray-200">
                  <th className="py-2 font-extrabold">#</th>
                  <th className="py-2 font-extrabold">Product</th>
                  <th className="py-2 font-extrabold text-right">Price</th>
                  <th className="py-2 font-extrabold text-right">Qty</th>
                  <th className="py-2 font-extrabold text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {o.items.map((it, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-2 text-gray-500">{idx + 1}</td>
                    <td className="py-2 pr-3">{it.name}</td>
                    <td className="py-2 text-right whitespace-nowrap">{taka(it.price)}</td>
                    <td className="py-2 text-right">{it.qty}</td>
                    <td className="py-2 text-right font-extrabold whitespace-nowrap">{taka(it.price * it.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex justify-end">
              <div className="w-[240px] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-extrabold">{taka(o.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery</span>
                  <span className="font-extrabold">{taka(o.deliveryCharge)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-300 text-[14px]">
                  <span className="font-display font-extrabold">Total</span>
                  <span className="font-display font-extrabold">{taka(o.total)}</span>
                </div>
              </div>
            </div>

            <p className="mt-6 text-center text-[10px] text-gray-400">
              Thank you for shopping with {settings.siteName}. Hotline {settings.phone}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
