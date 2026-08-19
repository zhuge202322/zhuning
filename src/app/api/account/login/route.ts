import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { parseJsonObject, internalErrorResponse } from "@/lib/api-route";
import { assertCustomerAuthConfigured, createCustomerSession, CustomerAuthConfigurationError, normalizeCustomerEmail, publicCustomer } from "@/lib/customer-auth";
import { errorResponse } from "@/lib/input-validation";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try { assertCustomerAuthConfigured(); } catch (error) {
    if (error instanceof CustomerAuthConfigurationError) return errorResponse(error.message, 503);
    throw error;
  }
  const parsed = await parseJsonObject(req);
  if (!parsed.ok) return parsed.response;
  const email = normalizeCustomerEmail(parsed.data.email);
  const password = parsed.data.password;
  if (!/^\S+@\S+\.\S+$/.test(email) || typeof password !== "string") return errorResponse("Invalid email or password");
  try {
    const customer = await prisma.customer.findUnique({ where: { email } });
    if (!customer?.passwordHash || !(await bcrypt.compare(password, customer.passwordHash))) return errorResponse("Invalid email or password", 401);
    if (customer.disabledAt || customer.status === "DISABLED") return errorResponse("This account is disabled", 403);
    const updated = await prisma.customer.update({ where: { id: customer.id }, data: { lastLoginAt: new Date() } });
    await createCustomerSession(updated);
    return NextResponse.json({ customer: publicCustomer(updated) });
  } catch (error) {
    return internalErrorResponse("Customer login failed", error);
  }
}
