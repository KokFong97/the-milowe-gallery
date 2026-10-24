import { ADMIN_COOKIE, SESSION_SECONDS, createAdminSession, validPassword } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (request.headers.get("origin") !== url.origin) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  if (!validPassword(String(form.get("password") ?? ""))) {
    return new Response(null, { status: 303, headers: { Location: "/admin?error=1", "Cache-Control": "no-store" } });
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: "/admin",
      "Cache-Control": "no-store",
      "Set-Cookie": `${ADMIN_COOKIE}=${createAdminSession()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${url.protocol === "https:" ? "; Secure" : ""}`,
    },
  });
}
