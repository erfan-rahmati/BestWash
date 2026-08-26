ALTER TABLE "customers" ADD COLUMN "email" TEXT;
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

ALTER TABLE "booking_checkouts" ADD COLUMN "couponCode" TEXT;
ALTER TABLE "bookings" ADD COLUMN "cancellationReason" TEXT;
ALTER TABLE "bookings" ADD COLUMN "refundDueAt" TIMESTAMP(3);

ALTER TABLE "notifications" ADD COLUMN "title" TEXT;
ALTER TABLE "notifications" ADD COLUMN "body" TEXT;
ALTER TABLE "notifications" ADD COLUMN "actionUrl" TEXT;
ALTER TABLE "notifications" ADD COLUMN "readAt" TIMESTAMP(3);

-- Only active vehicles must be unique. Archived records remain as booking history.
DROP INDEX IF EXISTS "customer_vehicles_customerId_plateNormalized_key";
CREATE UNIQUE INDEX "customer_vehicles_active_plate_key"
  ON "customer_vehicles"("customerId", "plateNormalized")
  WHERE "isActive" = true;

CREATE TABLE "push_subscriptions" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "userAgent" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
CREATE INDEX "push_subscriptions_customerId_isActive_idx" ON "push_subscriptions"("customerId", "isActive");
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "support_tickets" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "support_tickets_code_key" ON "support_tickets"("code");
CREATE INDEX "support_tickets_customerId_updatedAt_idx" ON "support_tickets"("customerId", "updatedAt");
CREATE INDEX "support_tickets_status_updatedAt_idx" ON "support_tickets"("status", "updatedAt");
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "support_messages" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "authorType" TEXT NOT NULL,
  "authorId" TEXT,
  "body" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "support_messages_ticketId_createdAt_idx" ON "support_messages"("ticketId", "createdAt");
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "blog_posts" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "excerpt" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "coverImageUrl" TEXT,
  "coverImageAlt" TEXT,
  "category" TEXT,
  "readingMinutes" INTEGER NOT NULL DEFAULT 4,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");
CREATE INDEX "blog_posts_isPublished_publishedAt_idx" ON "blog_posts"("isPublished", "publishedAt");
