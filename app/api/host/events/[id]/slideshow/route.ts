import { env } from "cloudflare:workers";
import { getAdminUser } from "@/lib/admin-auth";
import { eventBelongsToUser, getEventSnapshot } from "@/lib/event-data";
import { defaultSlideshowPhotos } from "@/lib/slideshow";
import { apiError, unauthorized } from "@/lib/api-errors";

async function update(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const user = await getAdminUser();
    if (!user) return unauthorized();
    const { id } = await params;
    if (!await eventBelongsToUser(id, user.userId)) return Response.json({ error: "Event not found." }, { status: 404 });
    const db = env.DB!;
    const defaults = JSON.stringify(defaultSlideshowPhotos);
    if (request.method === "PUT") {
      const form = await request.formData();
      const photo = form.get("photo");
      if (!(photo instanceof File) || !["image/jpeg", "image/png", "image/webp"].includes(photo.type)) return Response.json({ error: "Choose a JPEG, PNG or WebP photo." }, { status: 400 });
      if (!env.BUCKET) throw new Error("Photo storage unavailable.");
      const photoId = crypto.randomUUID();
      await env.BUCKET.put(`${id}/slideshow/${photoId}`, photo.stream(), { httpMetadata: { contentType: photo.type } });
      const entry = JSON.stringify({ id: photoId, url: `/api/slideshow/${id}/${photoId}` });
      await db.prepare("UPDATE events SET slideshow_photos = json_insert(COALESCE(slideshow_photos, ?), '$[#]', json(?)) WHERE id = ?").bind(defaults, entry, id).run();
    } else if (request.method === "PATCH") {
      const { seconds } = await request.json() as { seconds?: number };
      if (typeof seconds !== "number" || !Number.isInteger(seconds) || seconds < 1 || seconds > 3600) return Response.json({ error: "Enter a whole number from 1 to 3600 seconds." }, { status: 400 });
      await db.prepare("UPDATE events SET slideshow_seconds = ? WHERE id = ?").bind(seconds, id).run();
    } else {
      const { photoId } = await request.json() as { photoId?: string };
      if (!photoId) return Response.json({ error: "Choose a photo to remove." }, { status: 400 });
      // Remove only the playlist entry. Keep the original file in R2 or public assets.
      await db.prepare("UPDATE events SET slideshow_photos = COALESCE((SELECT json_group_array(json(value)) FROM json_each(COALESCE(slideshow_photos, ?)) WHERE json_extract(value, '$.id') != ?), '[]') WHERE id = ?").bind(defaults, photoId, id).run();
    }
    return Response.json(await getEventSnapshot(id, true));
  } catch (error) { return apiError(error); }
}
export const PUT = update;
export const PATCH = update;
export const DELETE = update;
