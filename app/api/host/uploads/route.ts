import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { weddingUploads } from "@/db/schema";
import { getAdminUser } from "@/lib/admin-auth";
import { eventBelongsToUser } from "@/lib/event-data";
import { apiError, unauthorized } from "@/lib/api-errors";

export async function GET(request: Request) {
  try {
    const user = await getAdminUser();
    if (!user) return unauthorized();
    const eventId = new URL(request.url).searchParams.get("eventId") ?? "";
    if (!await eventBelongsToUser(eventId, user.userId)) return Response.json({ error: "Event not found." }, { status: 404 });
    const rows = await getDb().select().from(weddingUploads).where(eq(weddingUploads.eventId, eventId)).orderBy(desc(weddingUploads.createdAt));
    return Response.json({ photos: rows.map((row) => ({ id: row.id, createdAt: row.createdAt, guestName: row.guestName, imageUrl: `/api/uploads/${row.id}` })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
