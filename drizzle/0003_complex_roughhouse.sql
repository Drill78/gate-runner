ALTER TABLE `expeditions` ADD `start_room` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `expeditions` ADD `ruleset` text DEFAULT 'legacy' NOT NULL;