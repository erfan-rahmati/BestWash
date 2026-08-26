-- CreateEnum
CREATE TYPE "BookingHoldStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "booking_holds" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "vehicleClassId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "addonIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "totalAmountRial" INTEGER NOT NULL,
    "status" "BookingHoldStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_hold_buckets" (
    "holdId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_hold_buckets_pkey" PRIMARY KEY ("holdId","startsAt")
);

-- CreateIndex
CREATE UNIQUE INDEX "booking_holds_token_key" ON "booking_holds"("token");

-- CreateIndex
CREATE INDEX "booking_holds_status_expiresAt_idx" ON "booking_holds"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "booking_holds_startsAt_idx" ON "booking_holds"("startsAt");

-- CreateIndex
CREATE INDEX "booking_holds_vehicleClassId_idx" ON "booking_holds"("vehicleClassId");

-- CreateIndex
CREATE INDEX "booking_holds_packageId_idx" ON "booking_holds"("packageId");

-- CreateIndex
CREATE INDEX "booking_hold_buckets_startsAt_idx" ON "booking_hold_buckets"("startsAt");

-- AddForeignKey
ALTER TABLE "booking_holds" ADD CONSTRAINT "booking_holds_vehicleClassId_fkey" FOREIGN KEY ("vehicleClassId") REFERENCES "vehicle_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_holds" ADD CONSTRAINT "booking_holds_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "service_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_hold_buckets" ADD CONSTRAINT "booking_hold_buckets_holdId_fkey" FOREIGN KEY ("holdId") REFERENCES "booking_holds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_hold_buckets" ADD CONSTRAINT "booking_hold_buckets_startsAt_fkey" FOREIGN KEY ("startsAt") REFERENCES "booking_capacity_buckets"("startsAt") ON DELETE RESTRICT ON UPDATE CASCADE;
