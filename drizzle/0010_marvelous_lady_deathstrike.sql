ALTER TABLE "order" ADD COLUMN "cancelledAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "cancelledBy" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "cancelReason" text;