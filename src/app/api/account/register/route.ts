import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { parseJsonObject, prismaErrorResponse, internalErrorResponse } from "@/lib/api-route";
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
  const { name, email, password, phone = "", marketingOptIn = false } = parsed.data;
  const normalizedEmail = normalizeCustomerEmail(email);
  if (typeof name !== "string" || !name.trim() || name.trim().length > 160) return errorResponse("Full name is required");
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || normalizedEmail.length > 320) return errorResponse("A valid email address is required");
  if (typeof password !== "string" || password.length < 10 || password.length > 200) return errorResponse("Password must be at least 10 characters");
  if (typeof phone !== "string" || phone.length > 80 || typeof marketingOptIn !== "boolean") return errorResponse("Invalid account details");

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const customer = await prisma.$transaction(async (tx) => {
      const existing = await tx.customer.findUnique({ where: { email: normalizedEmail } });
      if (existing?.passwordHash) throw Object.assign(new Error("Account already exists"), { code: "ACCOUNT_EXISTS" });
      if (existing?.disabledAt || existing?.status === "DISABLED") throw Object.assign(new Error("Account is disabled"), { code: "ACCOUNT_DISABLED" });
      if (existing) throw Object.assign(new Error("Legacy inquiry customer requires support verification"), { code: "LEGACY_CUSTOMER" });
      return tx.customer.create({
        data: { name: name.trim(), email: normalizedEmail, phone: phone.trim(), marketingOptIn, passwordHash, status: "ACTIVE" },
      });
    });
    await createCustomerSession(customer);
    return NextResponse.json({ customer: publicCustomer(customer) }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "ACCOUNT_EXISTS") return errorResponse("An account already exists for this email", 409);
    if ((error as { code?: string }).code === "ACCOUNT_DISABLED") return errorResponse("This account is disabled", 403);
    if ((error as { code?: string }).code === "LEGACY_CUSTOMER") return errorResponse("This email is linked to an existing inquiry record. Please contact support to activate online access.", 409);
    return prismaErrorResponse(error) ?? internalErrorResponse("Customer registration failed", error);
  }
}
