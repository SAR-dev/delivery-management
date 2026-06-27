CREATE TABLE `announcement` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`publishedAt` text,
	`expiresAt` text,
	`isActive` integer DEFAULT true NOT NULL,
	`targetRoles` text NOT NULL,
	`createdBy` text NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
