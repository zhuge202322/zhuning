import { NextResponse } from "next/server";
import { assertCustomerAuthConfigured, CustomerAuthConfigurationError, getCustomerSession, publicCustomer } from "@/lib/customer-auth";

export async function GET() {
  try { assertCustomerAuthConfigured(); } catch (error) {
    if (error instanceof CustomerAuthConfigurationError) return NextResponse.json({ error: error.message }, { status: 503 });
    throw error;
  }
  const customer = await getCustomerSession();
  if (!customer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ customer: publicCustomer(customer) });
}
