ALTER TABLE "order"
  ADD COLUMN "cancelledAt"  TIMESTAMPTZ,
  ADD COLUMN "cancelledBy"  TEXT,
  ADD COLUMN "cancelReason" TEXT;
