import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    code: text("code").notNull(),
    title: text("title").notNull(),
    eventDate: text("event_date"),
    location: text("location").notNull().default(""),
    status: text("status", { enum: ["collecting", "voting", "judging", "closed"] })
      .notNull()
      .default("collecting"),
    slideshowPhotos: text("slideshow_photos"),
    slideshowSeconds: integer("slideshow_seconds").notNull().default(5),
    spotlightPhotoId: text("spotlight_photo_id"),
    spotlightToken: text("spotlight_token"),
    spotlightExpiresAt: integer("spotlight_expires_at"),
    judgingCategoryId: text("judging_category_id"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("events_code_unique").on(table.code),
    index("events_owner_idx").on(table.ownerId),
  ],
);

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    prompt: text("prompt").notNull().default(""),
    icon: text("icon").notNull().default("Camera"),
    sortOrder: integer("sort_order").notNull().default(0),
    deletedAt: text("deleted_at"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("categories_event_idx").on(table.eventId)],
);

export const submissions = sqliteTable(
  "submissions",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    deletedAt: text("deleted_at"),
    guestName: text("guest_name").notNull(),
    caption: text("caption").notNull().default(""),
    objectKey: text("object_key").notNull(),
    mimeType: text("mime_type").notNull(),
    status: text("status", { enum: ["approved", "hidden"] })
      .notNull()
      .default("approved"),
    isFinalist: integer("is_finalist", { mode: "boolean" })
      .notNull()
      .default(false),
    isWinner: integer("is_winner", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("submissions_event_idx").on(table.eventId),
    index("submissions_category_idx").on(table.categoryId),
    index("submissions_status_idx").on(table.status),
  ],
);

export const likes = sqliteTable("likes", {
  submissionId: text("submission_id").notNull().references(() => submissions.id, { onDelete: "cascade" }),
  voterId: text("voter_id").notNull(),
}, (table) => [uniqueIndex("likes_submission_voter_unique").on(table.submissionId, table.voterId)]);

export const weddingUploads = sqliteTable("wedding_uploads", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  guestName: text("guest_name").notNull(),
  objectKey: text("object_key").notNull(),
  mimeType: text("mime_type").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("wedding_uploads_event_idx").on(table.eventId)]);
