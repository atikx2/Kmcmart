import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Package, Phone, PhoneCall, ShoppingBag, Truck } from "lucide-react";
import { getOrderByCode, getSettings, getSiteText } from "@/lib/data";
import { taka } from "@/lib/format";

export const metadata: Metadata = { title: "Order Complete" };

export default async function CompleteOrderPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const [order, settings, text] = await Promise.all([getOrderByCode(code), getSettings(), getSiteText()]);
  if (!order) notFound();

  const steps = [
    { icon: PhoneCall, title: text.stepCallTitle, sub: text.stepCallSub },
    { icon: Package, title: text.stepPackTitle, sub: text.stepPackSub },
    { icon: Truck, title: text.stepDeliveryTitle, sub: text.stepDeliverySub },
  ];

  const firstName = order.customerName.trim().split(" ")[0];

  return (
    <div className="grad-soft py-8 md:py-14 px-3">
      <div className="max-w-2xl mx-auto">
        {/* success card */}
        <div className="bg-white rounded-[28px] border border-gray-100 shadow-[0_20px_60px_rgba(17,18,28,0.08)] px-5 md:px-10 pt-10 pb-8 text-center">
          <div className="mx-auto w-24 h-24 rounded-full grad-bg grid place-items-center animate-pop shadow-[0_16px_40px_rgba(255,61,119,0.35)]">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path className="check-path" d="M4 12.5l5 5L20 6.5" />
            </svg>
          </div>

          <h1 className="mt-5 font-display text-2xl md:text-3xl font-extrabold tracking-tight">
            {text.thankYou}, <span className="grad-text">{firstName}!</span>
          </h1>
          <p className="mt-2 text-sm md:text-[15px] text-gray-500 font-semibold">
            {text.orderPlaced}
          </p>

          <div className="mt-5 inline-flex items-center gap-2 grad-soft rounded-full px-5 py-2.5">
            <ShoppingBag size={15} className="text-[var(--g2)]" />
            <span className="text-sm font-extrabold text-gray-700">
              {text.orderId}: <span className="grad-text font-display text-base">#{order.code}</span>
            </span>
          </div>

          {/* steps */}
          <div className="mt-7 grid grid-cols-3 gap-2 md:gap-3">
            {steps.map(({ icon: Icon, title, sub }, i) => (
              <div key={title} className="relative bg-gray-50 rounded-2xl px-2 md:px-3 py-3.5">
                <span className={`mx-auto w-10 h-10 rounded-xl grid place-items-center text-white ${i === 0 ? "grad-bg" : "bg-gray-300"}`}>
                  <Icon size={16} />
                </span>
                <p className="mt-2 text-[10.5px] md:text-xs font-extrabold text-gray-800 leading-tight">{title}</p>
                <p className="text-[9.5px] md:text-[10.5px] text-gray-400 font-semibold leading-tight mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* order details */}
        <div className="mt-5 bg-white rounded-[28px] border border-gray-100 shadow-[0_20px_60px_rgba(17,18,28,0.08)] p-5 md:p-8">
          <h2 className="font-display font-extrabold text-base md:text-lg mb-4">{text.orderDetails}</h2>

          <div className="space-y-2.5">
            {order.items.map((item) => (
              <div key={item.productId + item.name} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-2.5">
                <span className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  <Image src={item.image} alt={item.name} fill className="object-cover" sizes="48px" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[12.5px] font-bold text-gray-800 truncate">{item.name}</span>
                  <span className="block text-[11px] text-gray-400 font-semibold">
                    {taka(item.price)} × {item.qty}
                  </span>
                </span>
                <span className="text-[13px] font-extrabold text-gray-800 whitespace-nowrap">
                  {taka(item.price * item.qty)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-2 text-[13.5px] font-semibold text-gray-500">
            <div className="flex justify-between">
              <span>{text.subtotal}</span>
              <span className="text-gray-800">{taka(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>
                {text.deliveryWord} ({order.deliveryAreaName})
              </span>
              <span className="text-gray-800">{taka(order.deliveryCharge)}</span>
            </div>
            <div className="border-t border-dashed border-gray-200 pt-2.5 flex justify-between items-center">
              <span className="text-gray-800 font-extrabold">
                {text.total} ({text.cashOnDelivery})
              </span>
              <span className="grad-text font-display font-extrabold text-2xl">{taka(order.total)}</span>
            </div>
          </div>

          <div className="mt-6 bg-gray-50 rounded-2xl p-4 text-[13px] space-y-2">
            <p className="flex items-start gap-2.5 text-gray-600 font-semibold">
              <MapPin size={15} className="text-[var(--g2)] shrink-0 mt-0.5" />
              <span>
                {order.customerName} • {order.phone}
                <span className="block text-gray-400 font-medium mt-0.5">{order.address}</span>
              </span>
            </p>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              href="/"
              className="flex-1 grad-bg text-white rounded-2xl py-3.5 text-sm font-extrabold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition"
            >
              <ShoppingBag size={15} />
              {text.continueShopping}
            </Link>
            <a
              href={`tel:${settings.phone.replace(/\s/g, "")}`}
              className="flex-1 grad-border rounded-2xl py-3.5 text-sm font-extrabold text-gray-800 flex items-center justify-center gap-2 hover:shadow-lg active:scale-[0.99] transition"
            >
              <Phone size={15} className="text-[var(--g2)]" />
              {text.callNow}: {settings.phone}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
