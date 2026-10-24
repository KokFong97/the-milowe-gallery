import { env } from "cloudflare:workers";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { weddingUploads } from "@/db/schema";
import { findSingleEvent } from "@/lib/event-data";
import { apiError } from "@/lib/api-errors";

export async function GET() {
  try {
    const event = await findSingleEvent();
    if (!event || event.status !== "closed") return Response.json({ error: "Uploads open when the wedding is closed." }, { status: 409 });
    const rows = await getDb().select().from(weddingUploads).where(eq(weddingUploads.eventId, event.id)).orderBy(desc(weddingUploads.createdAt));
    return Response.json({ photos: rows.map((row) => ({ id: row.id, createdAt: row.createdAt, guestName: row.guestName, imageUrl: `/api/uploads/${row.id}` })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}

export async function PUT(request: Request) {
  try {
    const event = await findSingleEvent();
    if (!event || event.status !== "closed") return Response.json({ error: "Uploads open when the wedding is closed." }, { status: 409 });
    if (!env.BUCKET) throw new Error("Photo storage is unavailable.");
    const form = await request.formData();
    const photo = form.get("photo");
    const guestName = String(form.get("guestName") ?? "").trim().slice(0, 50);
    if (!guestName) return Response.json({ error: "Please enter your name." }, { status: 400 });
    if (!(photo instanceof File) || !["image/jpeg", "image/png", "image/webp"].includes(photo.type)) return Response.json({ error: "Choose a JPEG, PNG or WebP photo." }, { status: 400 });
    const id = crypto.randomUUID();
    const objectKey = `${event.id}/wedding-uploads/${id}`;
    await env.BUCKET.put(objectKey, photo.stream(), { httpMetadata: { contentType: photo.type } });
    await getDb().insert(weddingUploads).values({ id, eventId: event.id, guestName, objectKey, mimeType: photo.type });
    return Response.json({ id }, { status: 201 });
  } catch (error) { return apiError(error); }
}
