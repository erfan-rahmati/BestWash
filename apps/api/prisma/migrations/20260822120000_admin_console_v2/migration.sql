ALTER TYPE "NotificationChannel" ADD VALUE IF NOT EXISTS 'PUSH';

ALTER TABLE "coupons"
  ADD COLUMN "minimumPoints" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "eligibleTierCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "deliveryChannels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "displayPlacement" TEXT;

UPDATE "coupons"
SET "deliveryChannels" = ARRAY['IN_APP', 'SMS']::TEXT[],
    "displayPlacement" = 'PAYMENT_SUCCESS'
WHERE "code" = 'WELCOME';

CREATE TABLE "booking_schedule_time_blocks" (
  "id" TEXT NOT NULL,
  "localDate" DATE NOT NULL,
  "startMinute" INTEGER NOT NULL,
  "endMinute" INTEGER NOT NULL,
  "reason" TEXT,
  "createdByAdminId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "booking_schedule_time_blocks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "booking_schedule_time_blocks_minute_check"
    CHECK ("startMinute" >= 360 AND "endMinute" <= 1440 AND "endMinute" > "startMinute")
);

CREATE UNIQUE INDEX "booking_schedule_time_blocks_localDate_startMinute_endMinute_key"
  ON "booking_schedule_time_blocks"("localDate", "startMinute", "endMinute");
CREATE INDEX "booking_schedule_time_blocks_localDate_startMinute_endMinute_idx"
  ON "booking_schedule_time_blocks"("localDate", "startMinute", "endMinute");

CREATE TABLE "admin_notifications" (
  "id" TEXT NOT NULL,
  "adminUserId" TEXT,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "actionUrl" TEXT,
  "entityType" TEXT,
  "entityId" TEXT,
  "readAt" TIMESTAMP(3),
  "pushedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_push_subscriptions" (
  "id" TEXT NOT NULL,
  "adminUserId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "userAgent" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "admin_push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_push_subscriptions_endpoint_key" ON "admin_push_subscriptions"("endpoint");
CREATE INDEX "admin_notifications_adminUserId_readAt_createdAt_idx" ON "admin_notifications"("adminUserId", "readAt", "createdAt");
CREATE INDEX "admin_notifications_type_createdAt_idx" ON "admin_notifications"("type", "createdAt");
CREATE INDEX "admin_push_subscriptions_adminUserId_isActive_idx" ON "admin_push_subscriptions"("adminUserId", "isActive");

ALTER TABLE "admin_notifications"
  ADD CONSTRAINT "admin_notifications_adminUserId_fkey"
  FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "admin_push_subscriptions"
  ADD CONSTRAINT "admin_push_subscriptions_adminUserId_fkey"
  FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
