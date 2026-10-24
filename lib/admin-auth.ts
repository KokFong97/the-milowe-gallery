import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { findSingleEvent } from "@/lib/event-data";

// Server-only shared password for this one-time wedding site.
const PASSWORD = "ilovekokfong";
export const ADMIN_COOKIE = "milowe-admin";
export const SESSION_SECONDS = 60 * 60 * 12;

function sign(value: string) {
  return createHmac("sha256", PASSWORD).update(`milowe-admin-session:${value}`).digest("hex");
}

function equal(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function validPassword(value: string) {
  return equal(sign(value), sign(PASSWORD));
}

export function createAdminSession() {
  const expiry = String(Date.now() + SESSION_SECONDS * 1000);
  return `${expiry}.${sign(expiry)}`;
}

export async function getAdminUser() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const [expiry, signature, extra] = token.split(".");
  if (extra !== undefined || !expiry || !signature || !/^\d+$/.test(expiry) || Number(expiry) <= Date.now() || !equal(signature, sign(expiry))) return null;
  const event = await findSingleEvent();
  return { userId: event?.ownerId ?? "wedding-admin", displayName: "Admin" };
}
