CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`title` text NOT NULL,
	`prompt` text DEFAULT '' NOT NULL,
	`icon` text DEFAULT 'Camera' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `categories_event_idx` ON `categories` (`event_id`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`event_date` text,
	`location` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'collecting' NOT NULL,
	`moderation_enabled` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_code_unique` ON `events` (`code`);--> statement-breakpoint
CREATE INDEX `events_owner_idx` ON `events` (`owner_id`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`category_id` text NOT NULL,
	`guest_name` text NOT NULL,
	`caption` text DEFAULT '' NOT NULL,
	`object_key` text NOT NULL,
	`mime_type` text NOT NULL,
	`status` text DEFAULT 'approved' NOT NULL,
	`is_finalist` integer DEFAULT false NOT NULL,
	`is_winner` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `submissions_event_idx` ON `submissions` (`event_id`);--> statement-breakpoint
CREATE INDEX `submissions_category_idx` ON `submissions` (`category_id`);--> statement-breakpoint
CREATE INDEX `submissions_status_idx` ON `submissions` (`status`);