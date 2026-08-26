/*
  Warnings:

  - A unique constraint covering the columns `[holdId]` on the table `bookings` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `holdId` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `plateNormalized` to the `bookings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "holdId" TEXT NOT NULL,
ADD COLUMN     "plateNormalized" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "bookings_holdId_key" ON "bookings"("holdId");

-- CreateIndex
CREATE INDEX "bookings_plateNormalized_idx" ON "bookings"("plateNormalized");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_holdId_fkey" FOREIGN KEY ("holdId") REFERENCES "booking_holds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
