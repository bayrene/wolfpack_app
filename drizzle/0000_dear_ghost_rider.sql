CREATE TABLE `freezer_inventory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipe_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`date_frozen` text NOT NULL,
	`expiry_date` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `grocery_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`list_id` integer NOT NULL,
	`ingredient_id` integer,
	`name` text NOT NULL,
	`amount` real,
	`unit` text,
	`estimated_cost` real,
	`store` text,
	`checked` integer DEFAULT false,
	`sort_order` integer DEFAULT 0,
	FOREIGN KEY (`list_id`) REFERENCES `grocery_lists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `grocery_lists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text DEFAULT 'Weekly Groceries',
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `ingredients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`default_unit` text NOT NULL,
	`calories_per_unit` real NOT NULL,
	`protein_per_unit` real NOT NULL,
	`carbs_per_unit` real NOT NULL,
	`fat_per_unit` real NOT NULL,
	`fiber_per_unit` real NOT NULL,
	`sugar_per_unit` real DEFAULT 0,
	`sodium_per_unit` real DEFAULT 0,
	`category` text NOT NULL,
	`avg_price` real,
	`purchase_unit` text,
	`store_preference` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ingredients_name_unique` ON `ingredients` (`name`);--> statement-breakpoint
CREATE TABLE `meal_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`meal_type` text NOT NULL,
	`person` text NOT NULL,
	`recipe_id` integer,
	`servings_consumed` real DEFAULT 1,
	`custom_name` text,
	`custom_calories` real,
	`custom_protein` real,
	`custom_carbs` real,
	`custom_fat` real,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `prep_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`recipes_prepped` text,
	`total_cost` real,
	`total_time_minutes` integer,
	`notes` text,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `recipe_ingredients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipe_id` integer NOT NULL,
	`ingredient_id` integer NOT NULL,
	`amount` real NOT NULL,
	`unit` text NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text NOT NULL,
	`prep_time_minutes` integer,
	`cook_time_minutes` integer,
	`servings` integer DEFAULT 1,
	`freezer_friendly` integer DEFAULT false,
	`freezer_life_days` integer,
	`fridge_life_days` integer DEFAULT 5,
	`cost_per_serving` real,
	`difficulty` text,
	`instructions` text,
	`notes` text,
	`image_url` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
