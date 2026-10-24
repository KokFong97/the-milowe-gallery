import { and, eq, isNull } from "drizzle-orm";
import { getAdminUser } from "@/lib/admin-auth";
import { getDb } from "@/db";
import { categories, events } from "@/db/schema";
import { apiError, unauthorized } from "@/lib/api-errors";
import { eventBelongsToUser, getEventSnapshot } from "@/lib/event-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAdminUser();
    if (!user) return unauthorized();
    const { id } = await params;
    if (!(await eventBelongsToUser(id, user.userId))) {
      return Response.json({ error: "Event not found." }, { status: 404 });
    }
    return Response.json(await getEventSnapshot(id, true), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAdminUser();
    if (!user) return unauthorized();
    const { id } = await params;
    if (!(await eventBelongsToUser(id, user.userId))) {
      return Response.json({ error: "Event not found." }, { status: 404 });
    }
    const payload = (await request.json()) as {
      status?: "collecting" | "voting" | "judging" | "closed";
      judgingCategoryId?: string | null;
      title?: string;
      eventDate?: string | null;
      location?: string;
      addCategory?: { title?: string; prompt?: string; icon?: string };
    };
    const db = getDb();
    const changes: Partial<typeof events.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };
    if (["collecting", "voting", "judging", "closed"].includes(payload.status ?? "")) {
      changes.status = payload.status;
      changes.spotlightPhotoId = null;
      changes.spotlightToken = null;
      changes.spotlightExpiresAt = null;
    }
    if (payload.judgingCategoryId !== undefined) {
      if (payload.judgingCategoryId !== null) {
        const [category] = await db.select().from(categories).where(and(eq(categories.id, payload.judgingCategoryId), eq(categories.eventId, id), isNull(categories.deletedAt))).limit(1);
        if (!category) return Response.json({ error: "Choose a category from this wedding." }, { status: 400 });
      }
      changes.judgingCategoryId = payload.judgingCategoryId;
    }
    if (payload.title?.trim()) changes.title = payload.title.trim().slice(0, 90);
    if (typeof payload.location === "string") {
      changes.location = payload.location.trim().slice(0, 120);
    }
    if (payload.eventDate !== undefined) changes.eventDate = payload.eventDate || null;
    await db.update(events).set(changes).where(eq(events.id, id));

    if (payload.addCategory?.title?.trim()) {
      const existing = await db
        .select({ sortOrder: categories.sortOrder })
        .from(categories)
        .where(eq(categories.eventId, id));
      await db.insert(categories).values({
        id: crypto.randomUUID(),
        eventId: id,
        title: payload.addCategory.title.trim().slice(0, 60),
        prompt: payload.addCategory.prompt?.trim().slice(0, 180) ?? "",
        icon: payload.addCategory.icon ?? "Camera",
        sortOrder: existing.length,
      });
    }

    return Response.json(await getEventSnapshot(id, true));
  } catch (error) {
    return apiError(error);
  }
}
