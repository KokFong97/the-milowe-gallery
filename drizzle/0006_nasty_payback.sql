UPDATE submissions SET status = 'approved' WHERE status = 'pending';
--> statement-breakpoint
ALTER TABLE `events` DROP COLUMN `moderation_enabled`;