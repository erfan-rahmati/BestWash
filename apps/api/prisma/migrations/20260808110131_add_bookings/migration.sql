-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "BookingPaymentStatus" AS ENUM ('UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "paymentStatus" "BookingPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "vehicleClassId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "totalAmountRial" INTEGER NOT NULL,
    "vehicleSource" "VehicleSource" NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "brandName" TEXT,
    "modelName" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "productionYear" INTEGER,
    "nickname" TEXT,
    "plateType" "VehiclePlateType" NOT NULL,
    "plateFirstTwo" TEXT,
    "plateLetter" TEXT,
    "plateMiddleThree" TEXT,
    "plateIranCode" TEXT,
    "motorcycleTopThree" TEXT,
    "motorcycleBottomFive" TEXT,
    "packageCode" TEXT NOT NULL,
    "packageNameFa" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_addons" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "addonId" TEXT NOT NULL,
    "addonCode" TEXT NOT NULL,
    "addonNameFa" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "amountRial" INTEGER NOT NULL,

    CONSTRAINT "booking_addons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_capacity_allocations" (
    "bookingId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_capacity_allocations_pkey" PRIMARY KEY ("bookingId","startsAt")
);

-- CreateIndex
CREATE UNIQUE INDEX "bookings_code_key" ON "bookings"("code");

-- CreateIndex
CREATE INDEX "bookings_startsAt_idx" ON "bookings"("startsAt");

-- CreateIndex
CREATE INDEX "bookings_status_startsAt_idx" ON "bookings"("status", "startsAt");

-- CreateIndex
CREATE INDEX "bookings_vehicleClassId_idx" ON "bookings"("vehicleClassId");

-- CreateIndex
CREATE INDEX "bookings_packageId_idx" ON "bookings"("packageId");

-- CreateIndex
CREATE INDEX "booking_addons_bookingId_idx" ON "booking_addons"("bookingId");

-- CreateIndex
CREATE INDEX "booking_addons_addonId_idx" ON "booking_addons"("addonId");

-- CreateIndex
CREATE INDEX "booking_capacity_allocations_startsAt_idx" ON "booking_capacity_allocations"("startsAt");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vehicleClassId_fkey" FOREIGN KEY ("vehicleClassId") REFERENCES "vehicle_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "service_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_addons" ADD CONSTRAINT "booking_addons_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_addons" ADD CONSTRAINT "booking_addons_addonId_fkey" FOREIGN KEY ("addonId") REFERENCES "service_addons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_capacity_allocations" ADD CONSTRAINT "booking_capacity_allocations_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_capacity_allocations" ADD CONSTRAINT "booking_capacity_allocations_startsAt_fkey" FOREIGN KEY ("startsAt") REFERENCES "booking_capacity_buckets"("startsAt") ON DELETE RESTRICT ON UPDATE CASCADE;
