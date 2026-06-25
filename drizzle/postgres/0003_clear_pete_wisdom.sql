CREATE TABLE "division" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "division_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "merchant" ADD COLUMN "divisionId" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "deliveryDivisionId" text;--> statement-breakpoint
ALTER TABLE "pickup_location" ADD COLUMN "divisionId" text;--> statement-breakpoint
ALTER TABLE "warehouse" ADD COLUMN "divisionId" text;