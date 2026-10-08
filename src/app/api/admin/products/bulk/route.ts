import { NextRequest } from "next/server";
import { inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { products } from "@/db/schema";
import { guardAdmin } from "@/lib/admin-api";
export async function POST(req: NextRequest) {
  const denied = await guardAdmin("products"); if (denied) return denied;
  const body = await req.json(); const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter((x:number)=>Number.isInteger(x)&&x>0) : [];
  const action = String(body.action || ""); if (!ids.length) return Response.json({ error: "Select at least one product" }, { status: 400 });
  if (action === "activate" || action === "hide") await db.update(products).set({ isActive: action === "activate" }).where(inArray(products.id, ids));
  else if (action === "delete") await db.delete(products).where(inArray(products.id, ids));
  else return Response.json({ error: "Unknown bulk action" }, { status: 400 });
  revalidatePath("/", "layout"); return Response.json({ ok: true, count: ids.length });
}
