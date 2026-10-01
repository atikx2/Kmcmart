import type { Metadata } from "next";
import { Suspense } from "react";
import { getDeliveryAreas, getSettings } from "@/lib/data";
import CheckoutForm from "./CheckoutForm";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const [areas, settings] = await Promise.all([getDeliveryAreas(), getSettings()]);

  return (
    <Suspense>
      <CheckoutForm
        areas={areas.map((a) => ({ id: a.id, name: a.name, charge: a.charge }))}
        supportPhone={settings.phone}
      />
    </Suspense>
  );
}
