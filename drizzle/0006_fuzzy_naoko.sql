CREATE TABLE "failed_mail" (
	"id" text PRIMARY KEY NOT NULL,
	"to" text NOT NULL,
	"subject" text NOT NULL,
	"html" text,
	"text" text,
	"error" text NOT NULL,
	"attempts" integer NOT NULL,
	"failedAt" timestamp with time zone DEFAULT now() NOT NULL
);
