-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('CAR', 'MOTORCYCLE');

-- CreateEnum
CREATE TYPE "VehicleSource" AS ENUM ('CATALOG', 'CUSTOM');

-- CreateEnum
CREATE TYPE "VehiclePlateType" AS ENUM ('IRAN_CAR', 'IRAN_MOTORCYCLE');

-- CreateTable
CREATE TABLE "vehicle_classes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "nameEn" TEXT,
    "vehicleType" "VehicleType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_brands" (
    "id" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "nameEn" TEXT,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_models" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "vehicleClassId" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "nameEn" TEXT,
    "slug" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "mobileVerifiedAt" TIMESTAMP(3),
    "firstName" TEXT,
    "lastName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_vehicles" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "source" "VehicleSource" NOT NULL,
    "vehicleModelId" TEXT,
    "vehicleClassId" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "customBrandName" TEXT,
    "customModelName" TEXT,
    "nickname" TEXT,
    "color" TEXT NOT NULL,
    "productionYear" INTEGER,
    "plateType" "VehiclePlateType" NOT NULL,
    "plateNormalized" TEXT NOT NULL,
    "carPlateFirstTwo" TEXT,
    "carPlateLetter" TEXT,
    "carPlateMiddleThree" TEXT,
    "carPlateIranCode" TEXT,
    "motorcyclePlateTop" TEXT,
    "motorcyclePlateBottom" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_classes_code_key" ON "vehicle_classes"("code");

-- CreateIndex
CREATE INDEX "vehicle_classes_vehicleType_isActive_idx" ON "vehicle_classes"("vehicleType", "isActive");

-- CreateIndex
CREATE INDEX "vehicle_classes_sortOrder_idx" ON "vehicle_classes"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_brands_slug_key" ON "vehicle_brands"("slug");

-- CreateIndex
CREATE INDEX "vehicle_brands_isActive_sortOrder_idx" ON "vehicle_brands"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "vehicle_models_brandId_isActive_idx" ON "vehicle_models"("brandId", "isActive");

-- CreateIndex
CREATE INDEX "vehicle_models_vehicleClassId_idx" ON "vehicle_models"("vehicleClassId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_models_brandId_slug_key" ON "vehicle_models"("brandId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "customers_mobile_key" ON "customers"("mobile");

-- CreateIndex
CREATE INDEX "customer_vehicles_plateNormalized_idx" ON "customer_vehicles"("plateNormalized");

-- CreateIndex
CREATE INDEX "customer_vehicles_customerId_isActive_idx" ON "customer_vehicles"("customerId", "isActive");

-- CreateIndex
CREATE INDEX "customer_vehicles_vehicleModelId_idx" ON "customer_vehicles"("vehicleModelId");

-- CreateIndex
CREATE INDEX "customer_vehicles_vehicleClassId_idx" ON "customer_vehicles"("vehicleClassId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_vehicles_customerId_plateNormalized_key" ON "customer_vehicles"("customerId", "plateNormalized");

-- AddForeignKey
ALTER TABLE "vehicle_models" ADD CONSTRAINT "vehicle_models_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "vehicle_brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_models" ADD CONSTRAINT "vehicle_models_vehicleClassId_fkey" FOREIGN KEY ("vehicleClassId") REFERENCES "vehicle_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_vehicles" ADD CONSTRAINT "customer_vehicles_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_vehicles" ADD CONSTRAINT "customer_vehicles_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "vehicle_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_vehicles" ADD CONSTRAINT "customer_vehicles_vehicleClassId_fkey" FOREIGN KEY ("vehicleClassId") REFERENCES "vehicle_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
