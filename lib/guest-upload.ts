import { env } from "cloudflare:workers";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, events, submissions } from "@/db/schema";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function handleGuestUpload(
  request: Request,
  event: typeof events.$inferSelect,
) {
  if (event.status !== "collecting") {
    return Response.json(
      {
        error:
          event.status === "voting"
            ? "Submissions are closed during guest voting."
            : event.status === "judging"
            ? "Submissions are closed while judging is underway."
            : "This gallery has closed.",
      },
      { status: 409 },
    );
  }
  if (!env.BUCKET) throw new Error("Photo storage is not available.");

  const form = await request.formData();
  const photo = form.get("photo");
  const categoryId = String(form.get("categoryId") ?? "");
  const guestName = String(form.get("guestName") ?? "").trim().slice(0, 50);
  const caption = String(form.get("caption") ?? "").trim().slice(0, 140);
  if (!(photo instanceof File)) {
    return Response.json({ error: "Choose a photo to upload." }, { status: 400 });
  }
  if (!allowedTypes.has(photo.type)) {
    return Response.json(
      { error: "Please upload a JPEG, PNG or WebP image." },
      { status: 400 },
    );
  }
  if (!guestName) {
    return Response.json(
      { error: "Tell us who took this photo." },
      { status: 400 },
    );
  }

  const db = getDb();
  const [category] = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.eventId, event.id),
        eq(categories.active, true),
        isNull(categories.deletedAt),
      ),
    )
    .limit(1);
  if (!category) {
    return Response.json(
      { error: "Choose an active photo mission." },
      { status: 400 },
    );
  }

  const id = crypto.randomUUID();
  const extension =
    photo.type === "image/png"
      ? "png"
      : photo.type === "image/webp"
        ? "webp"
        : "jpg";
  const objectKey = `${event.id}/${id}.${extension}`;
  await env.BUCKET.put(objectKey, photo.stream(), {
    httpMetadata: { contentType: photo.type },
    customMetadata: { eventId: event.id, categoryId, guestName },
  });
  await db.insert(submissions).values({
    id,
    eventId: event.id,
    categoryId,
    guestName,
    caption,
    objectKey,
    mimeType: photo.type,
    status: "approved",
  });

  return Response.json(
    {
      submission: {
        id,
        status: "approved",
        imageUrl: `/media/${id}`,
      },
    },
    { status: 201 },
  );
}

