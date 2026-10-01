import { NextRequest } from "next/server";
import { searchProducts } from "@/lib/data";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const items = await searchProducts(q, 8);
  return Response.json({ items });
}
