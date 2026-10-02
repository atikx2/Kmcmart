import type { Metadata } from "next";
import { CUSTOMERS_PAGE_SIZE, listAdminCustomers } from "@/lib/admin-customers";
import { requirePermission } from "@/lib/admin-guard";
import CustomersClient from "./CustomersClient";

export const metadata: Metadata = { title: "Customers · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  await requirePermission("customers");
  const initial = await listAdminCustomers({ q: "", offset: 0, limit: CUSTOMERS_PAGE_SIZE });
  return <CustomersClient initial={initial} />;
}
