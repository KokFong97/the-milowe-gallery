import { deleteFromGallery } from "@/lib/delete-from-gallery";
import { eq } from "drizzle-orm";
import { getAdminUser } from "@/lib/admin-auth";
import { getDb } from "@/db";
import { categories } from "@/db/schema";
import { apiError, unauthorized } from "@/lib/api-errors";
import { eventBelongsToUser, getEventSnapshot } from "@/lib/event-data";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAdminUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const db = getDb();
    const [category] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    if (!category || category.deletedAt || !(await eventBelongsToUser(category.eventId, user.userId))) {
      return Response.json({ error: "Category not found." }, { status: 404 });
    }
    const payload = (await request.json()) as {
      title?: string;
      prompt?: string;
      active?: boolean;
    };
    const changes: Partial<typeof categories.$inferInsert> = {};
    if (payload.title?.trim()) changes.title = payload.title.trim().slice(0, 60);
    if (typeof payload.prompt === "string") changes.prompt = payload.prompt.trim().slice(0, 180);
    if (typeof payload.active === "boolean") changes.active = payload.active;
    await db.update(categories).set(changes).where(eq(categories.id, id));
    return Response.json(await getEventSnapshot(category.eventId, true));
  } catch (error) {
    return apiError(error);
  }
}


export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return deleteFromGallery(request, (await params).id, "category");
}
