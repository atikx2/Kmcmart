import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { hashPassword, setSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { name, phone, password } = await req.json();

    if (!name || name.trim().length < 3) {
      return Response.json({ error: "Please enter your full name" }, { status: 400 });
    }
    if (!phone || !/^01[3-9]\d{8}$/.test(phone.trim())) {
      return Response.json({ error: "Enter a valid 11-digit mobile number" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const existing = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.phone, phone.trim()))
      .limit(1);
    if (existing[0]) {
      return Response.json({ error: "An account with this number already exists" }, { status: 409 });
    }

    const [created] = await db
      .insert(customers)
      .values({
        name: name.trim(),
        phone: phone.trim(),
        passwordHash: hashPassword(password),
      })
      .returning({ id: customers.id, name: customers.name, phone: customers.phone });

    await setSession(created.id);
    return Response.json({ ok: true, customer: { name: created.name, phone: created.phone } });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Registration failed" }, { status: 500 });
  }
}
