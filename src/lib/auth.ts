import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

function getSecret() {
  const configured = process.env.ADMIN_JWT_SECRET;
  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_JWT_SECRET is required in production");
  }
  return new TextEncoder().encode(configured || "local-development-secret");
}

const COOKIE = 'myklens_admin';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function createSession(payload: { id: number; username: string }) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());

  const c = await cookies();
  c.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function destroySession() {
  const c = await cookies();
  c.delete(COOKIE);
}

export async function getSession(): Promise<{ id: number; username: string } | null> {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const id = Number(payload.id);
    const username = typeof payload.username === "string" ? payload.username : "";
    if (!Number.isInteger(id) || id <= 0 || !username) return null;
    return { id, username };
  } catch {
    return null;
  }
}

export async function getSessionFromToken(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const id = Number(payload.id);
    const username = typeof payload.username === "string" ? payload.username : "";
    if (!Number.isInteger(id) || id <= 0 || !username) return null;
    return { id, username };
  } catch {
    return null;
  }
}

export const ADMIN_COOKIE = COOKIE;
