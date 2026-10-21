import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "./users";

export type SessionPayload = { userId: number; role: Role };

const COOKIE = "session";
const MAX_AGE_MS = 8 * 60 * 60 * 1000; // um turno de trabalho

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET ausente ou curto (mín. 32 caracteres)");
  return new TextEncoder().encode(secret);
}

export async function encrypt(payload: SessionPayload, expiresAt: Date) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(expiresAt).sign(key());
}

export async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return { userId: Number(payload.userId), role: payload.role as Role };
  } catch {
    return null;
  }
}

export async function createSession(payload: SessionPayload) {
  const expires = new Date(Date.now() + MAX_AGE_MS);
  (await cookies()).set(COOKIE, await encrypt(payload, expires), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function readSession() {
  return decrypt((await cookies()).get(COOKIE)?.value);
}

export async function deleteSession() {
  (await cookies()).delete(COOKIE);
}

export const SESSION_COOKIE = COOKIE;
