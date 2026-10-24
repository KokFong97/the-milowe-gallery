ALTER TABLE `events` ADD `slideshow_photos` text;--> statement-breakpoint
ALTER TABLE `events` ADD `slideshow_seconds` integer DEFAULT 5 NOT NULL;