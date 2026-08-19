export function customerJwtSecret(env) {
  const value = typeof env.CUSTOMER_JWT_SECRET === "string" ? env.CUSTOMER_JWT_SECRET.trim() : "";
  if (!value) throw new Error("CUSTOMER_JWT_SECRET is required");
  return value;
}
