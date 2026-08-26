-- Extend the booking lifecycle without rewriting historical values.
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'ADMIN_REJECTED';

ALTER TABLE "coupons"
ADD COLUMN IF NOT EXISTS "minimumPriorBookings" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "media_assets" (
  "id" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "altText" TEXT,
  "title" TEXT,
  "uploadedByAdminId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "media_assets_url_key" ON "media_assets"("url");
CREATE INDEX IF NOT EXISTS "media_assets_createdAt_idx" ON "media_assets"("createdAt");

CREATE TABLE IF NOT EXISTS "blog_post_media" (
  "postId" TEXT NOT NULL,
  "mediaId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "caption" TEXT,
  CONSTRAINT "blog_post_media_pkey" PRIMARY KEY ("postId", "mediaId"),
  CONSTRAINT "blog_post_media_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "blog_post_media_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "blog_post_media_mediaId_idx" ON "blog_post_media"("mediaId");

CREATE TABLE IF NOT EXISTS "invoices" (
  "id" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "subtotalRial" INTEGER NOT NULL,
  "discountRial" INTEGER NOT NULL DEFAULT 0,
  "walletRial" INTEGER NOT NULL DEFAULT 0,
  "gatewayRial" INTEGER NOT NULL DEFAULT 0,
  "totalRial" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "invoices_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "invoices_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_number_key" ON "invoices"("number");
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_bookingId_key" ON "invoices"("bookingId");
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_paymentId_key" ON "invoices"("paymentId");
CREATE INDEX IF NOT EXISTS "invoices_customerId_issuedAt_idx" ON "invoices"("customerId", "issuedAt");
