CREATE TABLE `expeditions` (
	`id` text PRIMARY KEY NOT NULL,
	`traveller_id` text NOT NULL,
	`mode` text NOT NULL,
	`class_id` text NOT NULL,
	`seed` integer NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`checkpoint` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`depth` integer DEFAULT 0 NOT NULL,
	`duration` real DEFAULT 0 NOT NULL,
	`peak_squad` real DEFAULT 0 NOT NULL,
	`gold` real DEFAULT 0 NOT NULL,
	`ranked` integer DEFAULT 1 NOT NULL,
	`details` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`traveller_id`) REFERENCES `travellers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_expeditions_traveller_finished` ON `expeditions` (`traveller_id`,`finished_at`);--> statement-breakpoint
CREATE INDEX `idx_expeditions_mode_ranked_status` ON `expeditions` (`mode`,`ranked`,`status`);--> statement-breakpoint
CREATE TABLE `chronicle_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`bucket` integer NOT NULL,
	`count` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `travellers` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `travellers_token_hash_unique` ON `travellers` (`token_hash`);