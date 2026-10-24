import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { SlideshowPhoto } from "@/lib/slideshow";

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string; photoId: string }> }) {
  const { eventId, photoId } = await params;
  const [event] = await getDb().select().from(events).where(eq(events.id, eventId)).limit(1);
  const photos = JSON.parse(event?.slideshowPhotos ?? "[]") as SlideshowPhoto[];
  if (!photos.some((photo) => photo.id === photoId) || !env.BUCKET) return new Response("Not found", { status: 404 });
  const object = await env.BUCKET.get(`${eventId}/slideshow/${photoId}`);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers({ "Cache-Control": "no-store" });
  object.writeHttpMetadata(headers);
  return new Response(object.body, { headers });
}
