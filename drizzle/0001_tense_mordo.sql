CREATE TABLE `likes` (
	`submission_id` text NOT NULL,
	`voter_id` text NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `likes_submission_voter_unique` ON `likes` (`submission_id`,`voter_id`);