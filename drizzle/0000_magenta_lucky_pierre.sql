CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp with time zone,
	"refreshTokenExpiresAt" timestamp with time zone,
	"scope" text,
	"password" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant" (
	"id" text PRIMARY KEY NOT NULL,
	"businessName" text NOT NULL,
	"ownerName" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"address" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"baseRate" double precision DEFAULT 0 NOT NULL,
	"extraRatePerKg" double precision DEFAULT 0 NOT NULL,
	"maxWeightKg" double precision DEFAULT 3 NOT NULL,
	"freeWeightKg" double precision DEFAULT 1 NOT NULL,
	"approvedBy" text,
	"approvedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"merchantId" text NOT NULL,
	"pickupLocationId" text NOT NULL,
	"recipientName" text NOT NULL,
	"recipientPhone" text NOT NULL,
	"deliveryAddress" text NOT NULL,
	"deliveryCity" text NOT NULL,
	"parcelWeightKg" double precision NOT NULL,
	"deliveryType" text DEFAULT 'STANDARD' NOT NULL,
	"productCost" double precision NOT NULL,
	"deliveryCharge" double precision NOT NULL,
	"securityMoney" double precision NOT NULL,
	"totalCollectible" double precision NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"approvedBy" text,
	"approvedAt" timestamp with time zone,
	"pickupRiderId" text,
	"assignedAt" timestamp with time zone,
	"pickedUpAt" timestamp with time zone,
	"warehouseId" text,
	"receivedAtWarehouseAt" timestamp with time zone,
	"receivedByWarehouse" text,
	"deliveryRiderId" text,
	"dispatchedAt" timestamp with time zone,
	"dispatchedBy" text,
	"outForDeliveryAt" timestamp with time zone,
	"deliveredAt" timestamp with time zone,
	"deliveryProofRef" text,
	"amountCollected" double precision,
	"failedAttemptAt" timestamp with time zone,
	"failureNote" text,
	"deliveryAttempts" integer DEFAULT 0 NOT NULL,
	"failedResolvedAt" timestamp with time zone,
	"failedResolvedBy" text,
	"returnedAt" timestamp with time zone,
	"returnReason" text,
	"codSettledAt" timestamp with time zone,
	"codSettledBy" text,
	"payoutRequestId" text,
	CONSTRAINT "order_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "payout_request" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"merchantId" text NOT NULL,
	"orderIds" text NOT NULL,
	"amount" double precision NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"payoutMethod" text NOT NULL,
	"payoutDetails" text NOT NULL,
	"requestedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewedBy" text,
	"reviewedAt" timestamp with time zone,
	"rejectReason" text,
	"paidAt" timestamp with time zone,
	CONSTRAINT "payout_request_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "pickup_location" (
	"id" text PRIMARY KEY NOT NULL,
	"merchantId" text NOT NULL,
	"label" text NOT NULL,
	"address" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"userId" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"canManagePricing" boolean DEFAULT false NOT NULL,
	"warehouseId" text,
	"merchantId" text,
	"riderId" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rider" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"zone" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"warehouseId" text
);
--> statement-breakpoint
CREATE TABLE "security_config" (
	"id" text PRIMARY KEY NOT NULL,
	"lowValueThreshold" double precision DEFAULT 1000 NOT NULL,
	"lowValueFlatFee" double precision DEFAULT 10 NOT NULL,
	"highValuePercentage" double precision DEFAULT 1 NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedBy" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now(),
	"updatedAt" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "warehouse" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"managedBy" text,
	"isActive" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_merchantId_merchant_id_fk" FOREIGN KEY ("merchantId") REFERENCES "public"."merchant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_pickupLocationId_pickup_location_id_fk" FOREIGN KEY ("pickupLocationId") REFERENCES "public"."pickup_location"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_pickupRiderId_rider_id_fk" FOREIGN KEY ("pickupRiderId") REFERENCES "public"."rider"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_warehouseId_warehouse_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_deliveryRiderId_rider_id_fk" FOREIGN KEY ("deliveryRiderId") REFERENCES "public"."rider"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_payoutRequestId_payout_request_id_fk" FOREIGN KEY ("payoutRequestId") REFERENCES "public"."payout_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_request" ADD CONSTRAINT "payout_request_merchantId_merchant_id_fk" FOREIGN KEY ("merchantId") REFERENCES "public"."merchant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_location" ADD CONSTRAINT "pickup_location_merchantId_merchant_id_fk" FOREIGN KEY ("merchantId") REFERENCES "public"."merchant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider" ADD CONSTRAINT "rider_warehouseId_warehouse_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouse"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;