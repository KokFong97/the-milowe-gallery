import { ADMIN_COOKIE } from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return new Response("Forbidden", { status: 403 });
  return new Response(null, { status: 303, headers: { Location: "/admin", "Cache-Control": "no-store", "Set-Cookie": `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0` } });
}
