-- CreateTable
CREATE TABLE "booking_schedule_rules" (
    "id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "openMinute" INTEGER NOT NULL,
    "closeMinute" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 2,
    "slotStepMinutes" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_schedule_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_schedule_overrides" (
    "id" TEXT NOT NULL,
    "localDate" DATE NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "openMinute" INTEGER,
    "closeMinute" INTEGER,
    "capacity" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_schedule_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_capacity_buckets" (
    "id" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "usedCapacity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_capacity_buckets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "booking_schedule_rules_weekday_key" ON "booking_schedule_rules"("weekday");

-- CreateIndex
CREATE UNIQUE INDEX "booking_schedule_overrides_localDate_key" ON "booking_schedule_overrides"("localDate");

-- CreateIndex
CREATE INDEX "booking_schedule_overrides_localDate_idx" ON "booking_schedule_overrides"("localDate");

-- CreateIndex
CREATE UNIQUE INDEX "booking_capacity_buckets_startsAt_key" ON "booking_capacity_buckets"("startsAt");

-- CreateIndex
CREATE INDEX "booking_capacity_buckets_startsAt_idx" ON "booking_capacity_buckets"("startsAt");
