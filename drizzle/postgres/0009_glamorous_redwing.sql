CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actorId" text,
	"actorName" text NOT NULL,
	"actorRole" text NOT NULL,
	"action" text NOT NULL,
	"entityType" text NOT NULL,
	"entityId" text,
	"description" text NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_log" (
	"id" text PRIMARY KEY NOT NULL,
	"to" text NOT NULL,
	"subject" text NOT NULL,
	"status" text NOT NULL,
	"attempts" integer NOT NULL,
	"error" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"markedSentBy" text,
	"markedSentAt" timestamp with time zone
);
