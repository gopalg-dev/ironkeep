CREATE TABLE `bodyweights` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`day` text NOT NULL,
	`weight` real NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bodyweights_day` ON `bodyweights` (`day`);--> statement-breakpoint
CREATE TABLE `measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`day` text NOT NULL,
	`arm` real,
	`chest` real,
	`waist` real
);
--> statement-breakpoint
CREATE UNIQUE INDEX `measurements_day` ON `measurements` (`day`);--> statement-breakpoint
CREATE TABLE `plans` (
	`split` text PRIMARY KEY NOT NULL,
	`days` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `prefs` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`day_id` text NOT NULL,
	`day_name` text NOT NULL,
	`day_type` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`paused_at` text,
	`paused_ms` integer,
	`status` text NOT NULL,
	`effort` integer,
	`note` text,
	`entries` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workouts_status_finished` ON `workouts` (`status`,`finished_at`);--> statement-breakpoint
CREATE INDEX `workouts_day` ON `workouts` (`day_id`);