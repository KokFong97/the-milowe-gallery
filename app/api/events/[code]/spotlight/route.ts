import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { events, submissions } from "@/db/schema";
import { apiError } from "@/lib/api-errors";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const [row] = await getDb().select({ status: events.status, photoId: submissions.id, expiresAt: events.spotlightExpiresAt })
      .from(events).leftJoin(submissions, and(eq(submissions.id, events.spotlightPhotoId), eq(submissions.eventId, events.id), eq(submissions.status, "approved"), isNull(submissions.deletedAt)))
      .where(eq(events.code, code.toUpperCase())).limit(1);
    if (!row) return Response.json({ error: "Event not found." }, { status: 404 });
    const spotlight = row.status === "judging" && row.photoId && (row.expiresAt ?? 0) > Date.now() ? { photoId: row.photoId, expiresAt: row.expiresAt! } : null;
    return Response.json({ spotlight }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
