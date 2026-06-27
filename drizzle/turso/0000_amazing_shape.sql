CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`userId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` text,
	`refreshTokenExpiresAt` text,
	`scope` text,
	`password` text,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actorId` text,
	`actorName` text NOT NULL,
	`actorRole` text NOT NULL,
	`action` text NOT NULL,
	`entityType` text NOT NULL,
	`entityId` text,
	`description` text NOT NULL,
	`metadata` text,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `division` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `division_name_unique` ON `division` (`name`);--> statement-breakpoint
CREATE TABLE `email_log` (
	`id` text PRIMARY KEY NOT NULL,
	`to` text NOT NULL,
	`subject` text NOT NULL,
	`status` text NOT NULL,
	`attempts` integer NOT NULL,
	`error` text,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`markedSentBy` text,
	`markedSentAt` text
);
--> statement-breakpoint
CREATE TABLE `failed_mail` (
	`id` text PRIMARY KEY NOT NULL,
	`to` text NOT NULL,
	`subject` text NOT NULL,
	`html` text,
	`text` text,
	`error` text NOT NULL,
	`attempts` integer NOT NULL,
	`failedAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `merchant` (
	`id` text PRIMARY KEY NOT NULL,
	`businessName` text NOT NULL,
	`ownerName` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`address` text NOT NULL,
	`divisionId` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`baseRate` real DEFAULT 0 NOT NULL,
	`extraRatePerKg` real DEFAULT 0 NOT NULL,
	`maxWeightKg` real DEFAULT 3 NOT NULL,
	`freeWeightKg` real DEFAULT 1 NOT NULL,
	`approvedBy` text,
	`approvedAt` text,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `order` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`merchantId` text NOT NULL,
	`pickupLocationId` text NOT NULL,
	`recipientName` text NOT NULL,
	`recipientPhone` text NOT NULL,
	`deliveryAddress` text NOT NULL,
	`deliveryCity` text NOT NULL,
	`deliveryDivisionId` text,
	`deliveryMapLink` text,
	`deliveryImageLinks` text,
	`parcelWeightKg` real NOT NULL,
	`deliveryType` text DEFAULT 'STANDARD' NOT NULL,
	`productCost` real NOT NULL,
	`deliveryCharge` real NOT NULL,
	`securityMoney` real NOT NULL,
	`totalCollectible` real NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`approvedBy` text,
	`approvedAt` text,
	`pickupRiderId` text,
	`assignedAt` text,
	`pickedUpAt` text,
	`pickupProofRefs` text,
	`warehouseId` text,
	`receivedAtWarehouseAt` text,
	`receivedByWarehouse` text,
	`deliveryRiderId` text,
	`dispatchedAt` text,
	`dispatchedBy` text,
	`outForDeliveryAt` text,
	`deliveredAt` text,
	`deliveryProofRef` text,
	`amountCollected` real,
	`failedAttemptAt` text,
	`failureNote` text,
	`deliveryAttempts` integer DEFAULT 0 NOT NULL,
	`failedResolvedAt` text,
	`failedResolvedBy` text,
	`returnedAt` text,
	`returnReason` text,
	`cancelledAt` text,
	`cancelledBy` text,
	`cancelReason` text,
	`merchantNote` text,
	`receiverNote` text,
	`codSettledAt` text,
	`codSettledBy` text,
	`payoutRequestId` text,
	FOREIGN KEY (`merchantId`) REFERENCES `merchant`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pickupLocationId`) REFERENCES `pickup_location`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pickupRiderId`) REFERENCES `rider`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`warehouseId`) REFERENCES `warehouse`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deliveryRiderId`) REFERENCES `rider`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payoutRequestId`) REFERENCES `payout_request`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `order_code_unique` ON `order` (`code`);--> statement-breakpoint
CREATE TABLE `payout_request` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`merchantId` text NOT NULL,
	`orderIds` text NOT NULL,
	`amount` real NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`payoutMethod` text NOT NULL,
	`payoutDetails` text NOT NULL,
	`requestedAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`reviewedBy` text,
	`reviewedAt` text,
	`rejectReason` text,
	`paidAt` text,
	FOREIGN KEY (`merchantId`) REFERENCES `merchant`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payout_request_code_unique` ON `payout_request` (`code`);--> statement-breakpoint
CREATE TABLE `pickup_location` (
	`id` text PRIMARY KEY NOT NULL,
	`merchantId` text NOT NULL,
	`label` text NOT NULL,
	`address` text NOT NULL,
	`divisionId` text,
	`mapLink` text,
	`imageLinks` text,
	FOREIGN KEY (`merchantId`) REFERENCES `merchant`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `profile` (
	`userId` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`canManagePricing` integer DEFAULT false NOT NULL,
	`tableRowsPerPage` integer DEFAULT 20 NOT NULL,
	`warehouseId` text,
	`merchantId` text,
	`riderId` text,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rider` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`zone` text NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`taskType` text DEFAULT 'DELIVERY' NOT NULL,
	`warehouseId` text NOT NULL,
	FOREIGN KEY (`warehouseId`) REFERENCES `warehouse`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `security_config` (
	`id` text PRIMARY KEY NOT NULL,
	`lowValueThreshold` real DEFAULT 1000 NOT NULL,
	`lowValueFlatFee` real DEFAULT 10 NOT NULL,
	`highValuePercentage` real DEFAULT 1 NOT NULL,
	`updatedAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedBy` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expiresAt` text NOT NULL,
	`token` text NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`userId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer DEFAULT false NOT NULL,
	`image` text,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`role` text,
	`banned` integer,
	`banReason` text,
	`banExpires` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` text NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `warehouse` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`address` text NOT NULL,
	`city` text NOT NULL,
	`divisionId` text,
	`managedBy` text,
	`isActive` integer DEFAULT true NOT NULL
);
