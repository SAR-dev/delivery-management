ALTER TABLE "rider" DROP CONSTRAINT "rider_warehouseId_warehouse_id_fk";
--> statement-breakpoint
ALTER TABLE "rider" ALTER COLUMN "warehouseId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "rider" ADD COLUMN "taskType" text DEFAULT 'DELIVERY' NOT NULL;--> statement-breakpoint
ALTER TABLE "rider" ADD CONSTRAINT "rider_warehouseId_warehouse_id_fk" FOREIGN KEY ("warehouseId") REFERENCES "public"."warehouse"("id") ON DELETE restrict ON UPDATE no action;