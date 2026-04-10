CREATE TABLE `daily_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`steps` integer DEFAULT 0,
	`person` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ingredient_id` integer NOT NULL,
	`price` real NOT NULL,
	`store` text NOT NULL,
	`date` text NOT NULL,
	`unit_purchased` text,
	`quality_rating` integer,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `supplement_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplement_id` integer NOT NULL,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`dose` real NOT NULL,
	`person` text NOT NULL,
	`situation` text NOT NULL,
	`side_effects` text,
	`effectiveness_rating` integer,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`supplement_id`) REFERENCES `supplements`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `supplements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`brand` text NOT NULL,
	`form` text NOT NULL,
	`default_dose` real NOT NULL,
	`dose_unit` text NOT NULL,
	`serving_info` text,
	`benefits` text,
	`best_time_to_take` text,
	`warnings` text,
	`avg_price` real,
	`purchase_unit` text,
	`store_preference` text,
	`active` integer DEFAULT true,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
ALTER TABLE `ingredients` ADD `vitamin_a_per_unit` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `ingredients` ADD `vitamin_c_per_unit` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `ingredients` ADD `vitamin_d_per_unit` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `ingredients` ADD `vitamin_b12_per_unit` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `ingredients` ADD `iron_per_unit` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `ingredients` ADD `zinc_per_unit` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `ingredients` ADD `calcium_per_unit` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `ingredients` ADD `magnesium_per_unit` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `ingredients` ADD `potassium_per_unit` real DEFAULT 0;