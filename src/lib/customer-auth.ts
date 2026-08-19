import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

import { prisma } from "@/lib/prisma";
import { customerJwtSecret } from "@/lib/customer-auth-core.mjs";

const CUSTOMER_COOKIE = "muxcor_customer";
const MAX_AGE = 60 * 60 * 24 * 30;

export class CustomerAuthConfigurationError extends Error {
  constructor() {
    super("Customer authentication is not configured");
  }
}

function secret() {
  try {
    return new TextEncoder().encode(customerJwtSecret(process.env));
  } catch {
    throw new CustomerAuthConfigurationError();
  }
}

export function assertCustomerAuthConfigured() {
  secret();
}

export function normalizeCustomerEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function publicCustomer<T extends {
  id: number; name: string; email: string; phone: string; status: string; marketingOptIn: boolean;
  lastLoginAt: Date | null; disabledAt: Date | null; createdAt: Date; updatedAt: Date;
}>(customer: T) {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    status: customer.status,
    marketingOptIn: customer.marketingOptIn,
    lastLoginAt: customer.lastLoginAt,
    disabledAt: customer.disabledAt,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

export async function createCustomerSession(customer: { id: number; email: string; authVersion: number }) {
  const token = await new SignJWT({
    role: "customer",
    id: customer.id,
    email: customer.email,
    authVersion: customer.authVersion,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
  const jar = await cookies();
  jar.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroyCustomerSession() {
  const jar = await cookies();
  jar.delete(CUSTOMER_COOKIE);
}

async function decodeCustomerToken(token: string | undefined) {
  if (!token) return null;
  const signingSecret = secret();
  try {
    const { payload } = await jwtVerify(token, signingSecret);
    const id = Number(payload.id);
    const authVersion = Number(payload.authVersion);
    const email = typeof payload.email === "string" ? payload.email : "";
    if (payload.role !== "customer" || !Number.isInteger(id) || id <= 0 || !Number.isInteger(authVersion) || !email) return null;
    return { id, email, authVersion };
  } catch {
    return null;
  }
}

export async function getCustomerSession() {
  const jar = await cookies();
  const session = await decodeCustomerToken(jar.get(CUSTOMER_COOKIE)?.value);
  if (!session) return null;
  const customer = await prisma.customer.findUnique({ where: { id: session.id } });
  if (!customer || customer.email !== session.email || customer.authVersion !== session.authVersion || customer.disabledAt || customer.status === "DISABLED") return null;
  return customer;
}

export { CUSTOMER_COOKIE };
