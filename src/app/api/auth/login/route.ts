import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { setSession, verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = await req.json();
    if (!phone || !password) {
      return Response.json({ error: "Phone and password are required" }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(customers)
      .where(eq(customers.phone, phone.trim()))
      .limit(1);

    const customer = rows[0];
    if (!customer || !verifyPassword(password, customer.passwordHash)) {
      return Response.json({ error: "Invalid mobile number or password" }, { status: 401 });
    }

    await setSession(customer.id);
    return Response.json({ ok: true, customer: { name: customer.name, phone: customer.phone } });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Login failed" }, { status: 500 });
  }
}
