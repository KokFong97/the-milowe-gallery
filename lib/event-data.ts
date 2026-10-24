import { defaultSlideshowPhotos, type SlideshowPhoto } from "@/lib/slideshow";
import { cookies } from "next/headers";
import { and, asc, desc, eq, sql, isNull } from "drizzle-orm";
import { categories, events, submissions, likes } from "@/db/schema";
import { getDb } from "@/db";
import type { EventSnapshot } from "@/lib/millowe-types";

export async function findEventByCode(code: string) {
  const db = getDb();
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.code, code.toUpperCase()))
    .limit(1);
  return event ?? null;
}

export async function findSingleEvent() {
  const db = getDb();
  const [event] = await db
    .select()
    .from(events)
    .orderBy(asc(events.createdAt))
    .limit(1);
  return event ?? null;
}

export async function getEventSnapshot(
  eventId: string,
  includeUnapproved = false,
): Promise<EventSnapshot | null> {
  const db = getDb();
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!event) return null;

  const categoryRows = await db
    .select()
    .from(categories)
    .where(and(eq(categories.eventId, eventId), isNull(categories.deletedAt)))
    .orderBy(asc(categories.sortOrder), asc(categories.createdAt));

  const submissionRows = await db
    .select()
    .from(submissions)
    .where(
      includeUnapproved
        ? and(eq(submissions.eventId, eventId), isNull(submissions.deletedAt))
        : and(
            eq(submissions.eventId, eventId),
            eq(submissions.status, "approved"),
            isNull(submissions.deletedAt),
          ),
    )
    .orderBy(desc(submissions.createdAt));

  const voterId = (await cookies()).get("milowe-voter")?.value ?? "";
  const totals = await db.select({
    submissionId: likes.submissionId,
    likeCount: sql<number>`count(*)`,
    likedByMe: sql<number>`max(case when ${likes.voterId} = ${voterId} then 1 else 0 end)`,
  }).from(likes).innerJoin(submissions, eq(likes.submissionId, submissions.id))
    .where(eq(submissions.eventId, eventId)).groupBy(likes.submissionId);
  const likesById = new Map(totals.map((row) => [row.submissionId, row]));

  return {
    spotlight: event.status === "judging" && event.spotlightPhotoId && (event.spotlightExpiresAt ?? 0) > Date.now() && submissionRows.some((photo) => photo.id === event.spotlightPhotoId && photo.status === "approved")
      ? { photoId: event.spotlightPhotoId, expiresAt: event.spotlightExpiresAt! } : null,
    slideshow: { seconds: event.slideshowSeconds, photos: event.slideshowPhotos === null ? defaultSlideshowPhotos : JSON.parse(event.slideshowPhotos) as SlideshowPhoto[] },
    event: {
      id: event.id,
      code: event.code,
      title: event.title,
      eventDate: event.eventDate,
      location: event.location,
      status: event.status,
      judgingCategoryId: event.judgingCategoryId,
      createdAt: event.createdAt,
    },
    categories: categoryRows.map((category) => ({
      id: category.id,
      eventId: category.eventId,
      title: category.title,
      prompt: category.prompt,
      icon: category.icon,
      sortOrder: category.sortOrder,
      active: category.active,
      submissionCount: submissionRows.filter(
        (submission) => submission.categoryId === category.id,
      ).length,
    })),
    submissions: submissionRows.map((submission) => ({
      id: submission.id,
      eventId: submission.eventId,
      categoryId: submission.categoryId,
      guestName: submission.guestName,
      caption: submission.caption,
      status: submission.status,
      isFinalist: submission.isFinalist,
      isWinner: submission.isWinner,
      createdAt: submission.createdAt,
      imageUrl: `/media/${submission.id}`,
      likeCount: likesById.get(submission.id)?.likeCount ?? 0,
      likedByMe: Boolean(likesById.get(submission.id)?.likedByMe),
    })),
  };
}

export async function eventBelongsToUser(eventId: string, userId: string) {
  const db = getDb();
  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.ownerId, userId)))
    .limit(1);
  return event ?? null;
}
