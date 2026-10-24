import { and, eq, isNull } from "drizzle-orm";
import { getAdminUser } from "@/lib/admin-auth";
import { getDb } from "@/db";
import { categories, events, submissions } from "@/db/schema";
import { apiError, unauthorized } from "@/lib/api-errors";
import { eventBelongsToUser, getEventSnapshot } from "@/lib/event-data";

export async function deleteFromGallery(request: Request, id: string, kind: "category" | "submission") {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const user = await getAdminUser();
    if (!user) return unauthorized();
    const db = getDb();
    const table = kind === "category" ? categories : submissions;
    const [item] = await db.select({ eventId: table.eventId }).from(table).where(eq(table.id, id)).limit(1);
    if (!item || !(await eventBelongsToUser(item.eventId, user.userId))) return Response.json({ error: "Item not found." }, { status: 404 });
    const deletedAt = new Date().toISOString();
    // Soft-delete metadata only. Preserve object keys, likes and all R2 image files.
    if (kind === "category") {
      await db.batch([
        db.update(categories).set({ deletedAt, active: false }).where(and(eq(categories.id, id), isNull(categories.deletedAt))),
        db.update(submissions).set({ deletedAt }).where(and(eq(submissions.categoryId, id), isNull(submissions.deletedAt))),
        db.update(events).set({ judgingCategoryId: null }).where(and(eq(events.id, item.eventId), eq(events.judgingCategoryId, id))),
      ]);
    } else {
      await db.update(submissions).set({ deletedAt }).where(and(eq(submissions.id, id), isNull(submissions.deletedAt)));
    }
    return Response.json(await getEventSnapshot(item.eventId, true));
  } catch (error) { return apiError(error); }
}
