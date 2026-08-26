ALTER TABLE "loyalty_accounts"
ADD COLUMN "tierLockedByAdmin" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "coupons"
ADD COLUMN "promotionFrequency" TEXT NOT NULL DEFAULT 'ONCE';

ALTER TABLE "coupons"
ADD CONSTRAINT "coupons_promotionFrequency_check"
CHECK ("promotionFrequency" IN ('ONCE', 'EVERY_ELIGIBLE_PAYMENT'));

CREATE TABLE "coupon_promotion_deliveries" (
  "id" TEXT NOT NULL,
  "couponId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "singleDeliveryKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "coupon_promotion_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "coupon_promotion_deliveries_couponId_customerId_bookingId_key"
ON "coupon_promotion_deliveries"("couponId", "customerId", "bookingId");

CREATE INDEX "coupon_promotion_deliveries_customerId_createdAt_idx"
ON "coupon_promotion_deliveries"("customerId", "createdAt");

CREATE UNIQUE INDEX "coupon_promotion_deliveries_singleDeliveryKey_key"
ON "coupon_promotion_deliveries"("singleDeliveryKey");

ALTER TABLE "coupon_promotion_deliveries"
ADD CONSTRAINT "coupon_promotion_deliveries_couponId_fkey"
FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "coupon_promotion_deliveries"
ADD CONSTRAINT "coupon_promotion_deliveries_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "coupon_promotion_deliveries"
ADD CONSTRAINT "coupon_promotion_deliveries_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
