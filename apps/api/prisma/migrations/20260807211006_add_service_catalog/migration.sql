-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "nameEn" TEXT,
    "descriptionFa" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_packages" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "nameEn" TEXT,
    "descriptionFa" TEXT,
    "badgeFa" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_package_items" (
    "packageId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "service_package_items_pkey" PRIMARY KEY ("packageId","serviceId")
);

-- CreateTable
CREATE TABLE "service_package_prices" (
    "packageId" TEXT NOT NULL,
    "vehicleClassId" TEXT NOT NULL,
    "amountRial" INTEGER NOT NULL,
    "vehicleModelId" TEXT,

    CONSTRAINT "service_package_prices_pkey" PRIMARY KEY ("packageId","vehicleClassId")
);

-- CreateTable
CREATE TABLE "service_addons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "nameEn" TEXT,
    "descriptionFa" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_addons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_addon_prices" (
    "addonId" TEXT NOT NULL,
    "vehicleClassId" TEXT NOT NULL,
    "amountRial" INTEGER NOT NULL,
    "vehicleModelId" TEXT,

    CONSTRAINT "service_addon_prices_pkey" PRIMARY KEY ("addonId","vehicleClassId")
);

-- CreateIndex
CREATE UNIQUE INDEX "services_code_key" ON "services"("code");

-- CreateIndex
CREATE INDEX "services_isActive_sortOrder_idx" ON "services"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "service_packages_code_key" ON "service_packages"("code");

-- CreateIndex
CREATE INDEX "service_packages_isActive_sortOrder_idx" ON "service_packages"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "service_package_items_serviceId_idx" ON "service_package_items"("serviceId");

-- CreateIndex
CREATE INDEX "service_package_prices_vehicleClassId_idx" ON "service_package_prices"("vehicleClassId");

-- CreateIndex
CREATE UNIQUE INDEX "service_addons_code_key" ON "service_addons"("code");

-- CreateIndex
CREATE INDEX "service_addons_isActive_sortOrder_idx" ON "service_addons"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "service_addon_prices_vehicleClassId_idx" ON "service_addon_prices"("vehicleClassId");

-- AddForeignKey
ALTER TABLE "service_package_items" ADD CONSTRAINT "service_package_items_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "service_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_package_items" ADD CONSTRAINT "service_package_items_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_package_prices" ADD CONSTRAINT "service_package_prices_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "service_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_package_prices" ADD CONSTRAINT "service_package_prices_vehicleClassId_fkey" FOREIGN KEY ("vehicleClassId") REFERENCES "vehicle_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_package_prices" ADD CONSTRAINT "service_package_prices_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "vehicle_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_addon_prices" ADD CONSTRAINT "service_addon_prices_addonId_fkey" FOREIGN KEY ("addonId") REFERENCES "service_addons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_addon_prices" ADD CONSTRAINT "service_addon_prices_vehicleClassId_fkey" FOREIGN KEY ("vehicleClassId") REFERENCES "vehicle_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_addon_prices" ADD CONSTRAINT "service_addon_prices_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "vehicle_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;
