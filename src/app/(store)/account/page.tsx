import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, Phone, ShoppingBag } from "lucide-react";
import { getSessionCustomer } from "@/lib/auth";
import { getOrdersForCustomer, getSiteText } from "@/lib/data";
import { taka } from "@/lib/format";
import LogoutButton from "./LogoutButton";

export const metadata: Metadata = { title: "My Account" };

const statusStyle: Record<string, string> = {
  pending: "bg-amber-50 text-amber-600",
  confirmed: "bg-blue-50 text-blue-600",
  delivered: "bg-emerald-50 text-emerald-600",
  cancelled: "bg-red-50 text-red-500",
};

export default async function AccountPage() {
  const customer = await getSessionCustomer();
  if (!customer) redirect("/login");

  const [myOrders, text] = await Promise.all([
    getOrdersForCustomer(customer.id, customer.phone),
    getSiteText(),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-8 md:py-12">
      {/* profile card */}
      <div className="grad-bg rounded-[28px] p-6 md:p-8 text-white shadow-[0_20px_50px_rgba(255,61,119,0.25)]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <span className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/20 backdrop-blur grid place-items-center font-display font-extrabold text-2xl shrink-0">
              {customer.name.trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h1 className="font-display font-extrabold text-xl md:text-2xl truncate">{customer.name}</h1>
              <p className="text-white/80 text-[12.5px] md:text-sm font-semibold flex items-center gap-1.5 mt-1">
                <Phone size={13} />
                {customer.phone}
              </p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </div>

      {/* orders */}
      <div className="mt-8">
        <h2 className="font-display font-extrabold text-lg flex items-center gap-2.5 mb-4">
          <span className="grad-bg text-white rounded-xl p-2">
            <Package size={15} />
          </span>
          {text.myOrders}
          <span className="text-xs font-bold text-gray-400">({myOrders.length})</span>
        </h2>

        {myOrders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-6 py-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full grad-soft grid place-items-center mb-4">
              <ShoppingBag size={24} className="text-gray-400" />
            </div>
            <p className="font-extrabold text-gray-800">{text.noOrders}</p>
            
            <Link
              href="/"
              className="inline-block mt-5 grad-bg text-white text-sm font-extrabold px-7 py-3 rounded-full hover:opacity-90 transition"
            >
              {text.continueShopping}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {myOrders.map((o) => (
              <Link
                key={o.id}
                href={`/complete-order/${o.code}`}
                className="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grad-soft rounded-xl w-11 h-11 grid place-items-center shrink-0">
                      <Package size={17} className="text-[var(--g2)]" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-extrabold text-sm text-gray-800">
                        Order <span className="grad-text">#{o.code}</span>
                      </p>
                      <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
                        {o.createdAt.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        • {o.items.reduce((a, i) => a + i.qty, 0)} {text.itemsWord}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-[10.5px] font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-full ${
                        statusStyle[o.status] ?? "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {o.status}
                    </span>
                    <span className="font-display font-extrabold text-sm text-gray-900">{taka(o.total)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
