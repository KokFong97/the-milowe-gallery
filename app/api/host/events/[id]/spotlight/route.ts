import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { events, submissions } from "@/db/schema";
import { getAdminUser } from "@/lib/admin-auth";
import { eventBelongsToUser } from "@/lib/event-data";
import { apiError, unauthorized } from "@/lib/api-errors";

async function update(request: Request, params: Promise<{ id: string }>, clear: boolean) {
  try {
    const user = await getAdminUser();
    if (!user) return unauthorized();
    const { id } = await params;
    if (!(await eventBelongsToUser(id, user.userId))) return Response.json({ error: "Event not found." }, { status: 404 });
    const { token, photoId, claim } = await request.json() as { token?: unknown; photoId?: unknown; claim?: unknown };
    if (typeof token !== "string" || token.length < 16 || token.length > 100) return Response.json({ error: "Invalid preview session." }, { status: 400 });
    const db = getDb();
    if (clear) {
      await db.update(events).set({ spotlightPhotoId: null, spotlightToken: null, spotlightExpiresAt: null }).where(and(eq(events.id, id), eq(events.spotlightToken, token)));
      return Response.json({ ok: true });
    }
    if (typeof photoId !== "string") return Response.json({ error: "Choose a photo." }, { status: 400 });
    const [photo] = await db.select().from(submissions).where(and(eq(submissions.id, photoId), eq(submissions.eventId, id), isNull(submissions.deletedAt), eq(submissions.status, "approved"))).limit(1);
    if (!photo) return Response.json({ error: "Photo is unavailable." }, { status: 404 });
    const changed = await db.update(events).set({ spotlightPhotoId: photoId, spotlightToken: token, spotlightExpiresAt: Date.now() + 60000 }).where(and(eq(events.id, id), eq(events.status, "judging"), claim === true ? undefined : eq(events.spotlightToken, token))).returning({ id: events.id });
    if (!changed.length) return Response.json({ error: "Preview ended or the event is no longer judging." }, { status: 409 });
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}

export function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) { return update(request, params, false); }
export function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) { return update(request, params, true); }
