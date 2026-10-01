import type { Metadata } from "next";
import OverflowCheckClient from "./OverflowCheckClient";

/** TEMPORARY diagnostic route — delete before the final merge. */
export const metadata: Metadata = { title: "Overflow check", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function OverflowCheckPage() {
  return <OverflowCheckClient />;
}
