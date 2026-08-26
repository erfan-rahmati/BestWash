-- CreateEnum
CREATE TYPE "BookingCheckoutStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'CONSUMED');

-- CreateTable
CREATE TABLE "booking_checkouts" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "holdId" TEXT NOT NULL,
    "customerId" TEXT,
    "status" "BookingCheckoutStatus" NOT NULL DEFAULT 'PENDING',
    "amountRial" INTEGER NOT NULL,
    "vehicleSnapshot" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_checkouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "booking_checkouts_token_key" ON "booking_checkouts"("token");

-- CreateIndex
CREATE UNIQUE INDEX "booking_checkouts_holdId_key" ON "booking_checkouts"("holdId");

-- CreateIndex
CREATE INDEX "booking_checkouts_status_expiresAt_idx" ON "booking_checkouts"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "booking_checkouts_customerId_idx" ON "booking_checkouts"("customerId");

-- CreateIndex
CREATE INDEX "booking_checkouts_createdAt_idx" ON "booking_checkouts"("createdAt");

-- AddForeignKey
ALTER TABLE "booking_checkouts" ADD CONSTRAINT "booking_checkouts_holdId_fkey" FOREIGN KEY ("holdId") REFERENCES "booking_holds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_checkouts" ADD CONSTRAINT "booking_checkouts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
