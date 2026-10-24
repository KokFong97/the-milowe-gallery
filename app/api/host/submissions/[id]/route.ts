import { deleteFromGallery } from "@/lib/delete-from-gallery";
import { and, eq } from "drizzle-orm";
import { getAdminUser } from "@/lib/admin-auth";
import { getDb } from "@/db";
import { submissions } from "@/db/schema";
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
    const [submission] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, id))
      .limit(1);
    if (!submission || submission.deletedAt || !(await eventBelongsToUser(submission.eventId, user.userId))) {
      return Response.json({ error: "Photo not found." }, { status: 404 });
    }
    const payload = (await request.json()) as {
      status?: "approved" | "hidden";
      isFinalist?: boolean;
      isWinner?: boolean;
    };
    const changes: Partial<typeof submissions.$inferInsert> = {};
    if (["approved", "hidden"].includes(payload.status ?? "")) {
      changes.status = payload.status;
    }
    if (typeof payload.isFinalist === "boolean") changes.isFinalist = payload.isFinalist;
    if (payload.isWinner === true) {
      await db
        .update(submissions)
        .set({ isWinner: false })
        .where(
          and(
            eq(submissions.eventId, submission.eventId),
            eq(submissions.categoryId, submission.categoryId),
          ),
        );
      changes.isWinner = true;
      changes.isFinalist = true;
      changes.status = "approved";
    } else if (payload.isWinner === false) {
      changes.isWinner = false;
    }
    await db.update(submissions).set(changes).where(eq(submissions.id, id));
    return Response.json(await getEventSnapshot(submission.eventId, true));
  } catch (error) {
    return apiError(error);
  }
}


export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return deleteFromGallery(request, (await params).id, "submission");
}
