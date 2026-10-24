import { getAdminUser } from "@/lib/admin-auth";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { events, weddingUploads } from "@/db/schema";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await getDb().select({ objectKey: weddingUploads.objectKey, ownerId: events.ownerId, status: events.status }).from(weddingUploads).innerJoin(events, eq(events.id, weddingUploads.eventId)).where(eq(weddingUploads.id, id)).limit(1);
  if (!row || !env.BUCKET) return new Response("Not found", { status: 404 });
  if (row.status !== "closed") {
    const user = await getAdminUser();
    if (!user || user.userId !== row.ownerId) return new Response("Not found", { status: 404 });
  }
  const photo = await env.BUCKET.get(row.objectKey);
  if (!photo) return new Response("Not found", { status: 404 });
  const headers = new Headers({ "Cache-Control": "private, no-store" });
  photo.writeHttpMetadata(headers);
  return new Response(photo.body, { headers });
}
