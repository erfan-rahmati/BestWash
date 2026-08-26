-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('CUSTOMER_APP', 'ADMIN_MANUAL');

-- CreateEnum
CREATE TYPE "PickupMode" AS ENUM ('OWNER', 'DELEGATE');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('ZIBAL', 'TEST');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PENDING', 'REDIRECTED', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('CASHBACK', 'PAYMENT', 'REFUND', 'REVERSAL', 'PROMOTIONAL_CREDIT', 'MANUAL_CREDIT', 'MANUAL_DEBIT', 'EXPIRATION');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AdminStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BookingStatus" ADD VALUE 'PENDING_PAYMENT';
ALTER TYPE "BookingStatus" ADD VALUE 'CHECKED_IN';
ALTER TYPE "BookingStatus" ADD VALUE 'IN_QUEUE';
ALTER TYPE "BookingStatus" ADD VALUE 'READY_FOR_PICKUP';
ALTER TYPE "BookingStatus" ADD VALUE 'DELIVERED';

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "birthDate" DATE,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastBookingAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notificationPreferences" JSONB,
ADD COLUMN     "passwordHash" TEXT;

-- AlterTable
ALTER TABLE "customer_vehicles" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "categoryId" TEXT;

-- AlterTable
ALTER TABLE "booking_holds" ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "priceSnapshot" JSONB;

-- AlterTable
ALTER TABLE "booking_checkouts" ADD COLUMN     "createdByAdminId" TEXT,
ADD COLUMN     "delegateSnapshot" JSONB,
ADD COLUMN     "discountAmountRial" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gatewayAmountRial" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "pickupMode" "PickupMode" NOT NULL DEFAULT 'OWNER',
ADD COLUMN     "source" "BookingSource" NOT NULL DEFAULT 'CUSTOMER_APP',
ADD COLUMN     "walletAmountRial" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "checkedInAt" TIMESTAMP(3),
ADD COLUMN     "checkoutId" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "createdByAdminId" TEXT,
ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "customerNote" TEXT,
ADD COLUMN     "customerVehicleId" TEXT,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "discountAmountRial" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gatewayAmountRial" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "inProgressAt" TIMESTAMP(3),
ADD COLUMN     "internalNote" TEXT,
ADD COLUMN     "pickupMode" "PickupMode" NOT NULL DEFAULT 'OWNER',
ADD COLUMN     "readyAt" TIMESTAMP(3),
ADD COLUMN     "serviceSnapshot" JSONB,
ADD COLUMN     "source" "BookingSource" NOT NULL DEFAULT 'CUSTOMER_APP',
ADD COLUMN     "walletAmountRial" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "customer_sessions" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "refreshTokenHash" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_challenges" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "mobile" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "nameEn" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "vehicleClassId" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_blocks" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_status_history" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fromStatus" "BookingStatus",
    "toStatus" "BookingStatus" NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pickup_delegates" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pickup_delegates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pickup_credentials" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "codeCiphertext" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lockedUntil" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "rotatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pickup_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "checkoutId" TEXT NOT NULL,
    "customerId" TEXT,
    "bookingId" TEXT,
    "provider" "PaymentProvider" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "amountRial" INTEGER NOT NULL,
    "walletAmountRial" INTEGER NOT NULL DEFAULT 0,
    "gatewayAmountRial" INTEGER NOT NULL DEFAULT 0,
    "providerTrackId" TEXT,
    "providerReferenceNumber" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redirectedAt" TIMESTAMP(3),
    "callbackReceivedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_attempts" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "requestSnapshot" JSONB,
    "responseSnapshot" JSONB,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_callbacks" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_callbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amountRial" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "providerReference" TEXT,
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_accounts" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "balanceRial" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "bookingId" TEXT,
    "type" "WalletTransactionType" NOT NULL,
    "amountRial" INTEGER NOT NULL,
    "balanceAfterRial" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "reason" TEXT,
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_credit_lots" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "originalAmountRial" INTEGER NOT NULL,
    "remainingAmountRial" INTEGER NOT NULL,
    "sourceTransactionId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_credit_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_accounts" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "tierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_transactions" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "bookingId" TEXT,
    "points" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_tiers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "minPoints" INTEGER NOT NULL,
    "maxPoints" INTEGER,
    "benefits" JSONB,
    "cashbackMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_rules" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "conditions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_rewards" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "pointsCost" INTEGER NOT NULL,
    "payload" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "maxUsage" INTEGER,
    "perCustomerUsage" INTEGER NOT NULL DEFAULT 1,
    "minimumAmountRial" INTEGER NOT NULL DEFAULT 0,
    "firstBookingOnly" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_service_scopes" (
    "couponId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,

    CONSTRAINT "coupon_service_scopes_pkey" PRIMARY KEY ("couponId","packageId")
);

-- CreateTable
CREATE TABLE "coupon_usages" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "discountAmountRial" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'SMS',
    "title" TEXT,
    "body" TEXT NOT NULL,
    "providerTemplateId" TEXT,
    "isTransactional" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "templateCode" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "recipient" TEXT NOT NULL,
    "payload" JSONB,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_attempts" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "providerStatus" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_journeys" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "customerId" TEXT,
    "mobile" TEXT,
    "currentStep" TEXT NOT NULL,
    "context" JSONB,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "convertedAt" TIMESTAMP(3),
    "abandonedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_journeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_journey_events" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "step" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_journey_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "triggerEvent" TEXT NOT NULL,
    "conditions" JSONB,
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "templateCode" TEXT NOT NULL,
    "frequencyCap" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_executions" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "customerId" TEXT,
    "status" TEXT NOT NULL,
    "eligibleAt" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "revenueRial" INTEGER,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminReply" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hero_slides" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "linkType" TEXT NOT NULL DEFAULT 'NONE',
    "linkValue" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hero_slides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_banners" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "linkType" TEXT NOT NULL DEFAULT 'NONE',
    "linkValue" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_content" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "updatedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "updatedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_tags" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'blue',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_tag_assignments" (
    "customerId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "assignedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_tag_assignments_pkey" PRIMARY KEY ("customerId","tagId")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "totpSecretEncrypted" TEXT,
    "status" "AdminStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_user_roles" (
    "adminUserId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "admin_user_roles_pkey" PRIMARY KEY ("adminUserId","roleId")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_events" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorType" TEXT,
    "actorId" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "metadata" JSONB,
    "ipAddress" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_deliveries" (
    "id" TEXT NOT NULL,
    "integration" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "entityId" TEXT,
    "requestSnapshot" JSONB,
    "responseSnapshot" JSONB,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_sessions_tokenHash_key" ON "customer_sessions"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "customer_sessions_refreshTokenHash_key" ON "customer_sessions"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "customer_sessions_customerId_revokedAt_idx" ON "customer_sessions"("customerId", "revokedAt");

-- CreateIndex
CREATE INDEX "customer_sessions_expiresAt_idx" ON "customer_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "otp_challenges_mobile_purpose_createdAt_idx" ON "otp_challenges"("mobile", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "otp_challenges_expiresAt_idx" ON "otp_challenges"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_code_key" ON "service_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "resources_code_key" ON "resources"("code");

-- CreateIndex
CREATE INDEX "resource_blocks_resourceId_startsAt_endsAt_idx" ON "resource_blocks"("resourceId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "booking_status_history_bookingId_createdAt_idx" ON "booking_status_history"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "pickup_delegates_bookingId_isActive_idx" ON "pickup_delegates"("bookingId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "pickup_credentials_bookingId_key" ON "pickup_credentials"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotencyKey_key" ON "payments"("idempotencyKey");

-- CreateIndex
CREATE INDEX "payments_checkoutId_status_idx" ON "payments"("checkoutId", "status");

-- CreateIndex
CREATE INDEX "payments_provider_providerTrackId_idx" ON "payments"("provider", "providerTrackId");

-- CreateIndex
CREATE INDEX "payment_attempts_paymentId_createdAt_idx" ON "payment_attempts"("paymentId", "createdAt");

-- CreateIndex
CREATE INDEX "payment_callbacks_paymentId_receivedAt_idx" ON "payment_callbacks"("paymentId", "receivedAt");

-- CreateIndex
CREATE INDEX "refunds_paymentId_idx" ON "refunds"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_accounts_customerId_key" ON "wallet_accounts"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_idempotencyKey_key" ON "wallet_transactions"("idempotencyKey");

-- CreateIndex
CREATE INDEX "wallet_transactions_walletId_createdAt_idx" ON "wallet_transactions"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "wallet_credit_lots_walletId_expiresAt_idx" ON "wallet_credit_lots"("walletId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_accounts_customerId_key" ON "loyalty_accounts"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_transactions_idempotencyKey_key" ON "loyalty_transactions"("idempotencyKey");

-- CreateIndex
CREATE INDEX "loyalty_transactions_accountId_createdAt_idx" ON "loyalty_transactions"("accountId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_tiers_code_key" ON "loyalty_tiers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_rules_code_key" ON "loyalty_rules"("code");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_rewards_code_key" ON "loyalty_rewards"("code");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_usages_bookingId_key" ON "coupon_usages"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_usages_couponId_customerId_bookingId_key" ON "coupon_usages"("couponId", "customerId", "bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_code_key" ON "notification_templates"("code");

-- CreateIndex
CREATE INDEX "notifications_status_scheduledAt_idx" ON "notifications"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "notifications_customerId_createdAt_idx" ON "notifications"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "sms_attempts_notificationId_attemptedAt_idx" ON "sms_attempts"("notificationId", "attemptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "customer_journeys_sessionId_key" ON "customer_journeys"("sessionId");

-- CreateIndex
CREATE INDEX "customer_journeys_lastActivityAt_convertedAt_abandonedAt_idx" ON "customer_journeys"("lastActivityAt", "convertedAt", "abandonedAt");

-- CreateIndex
CREATE INDEX "customer_journey_events_journeyId_createdAt_idx" ON "customer_journey_events"("journeyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "automation_rules_code_key" ON "automation_rules"("code");

-- CreateIndex
CREATE UNIQUE INDEX "automation_executions_idempotencyKey_key" ON "automation_executions"("idempotencyKey");

-- CreateIndex
CREATE INDEX "automation_executions_ruleId_status_eligibleAt_idx" ON "automation_executions"("ruleId", "status", "eligibleAt");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_bookingId_key" ON "reviews"("bookingId");

-- CreateIndex
CREATE INDEX "reviews_status_isFeatured_idx" ON "reviews"("status", "isFeatured");

-- CreateIndex
CREATE INDEX "hero_slides_isActive_sortOrder_idx" ON "hero_slides"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "business_content_key_key" ON "business_content"("key");

-- CreateIndex
CREATE UNIQUE INDEX "business_settings_key_key" ON "business_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "customer_tags_code_key" ON "customer_tags"("code");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_mobile_key" ON "admin_users"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_sessions_tokenHash_key" ON "admin_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "admin_sessions_adminUserId_revokedAt_idx" ON "admin_sessions"("adminUserId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_createdAt_idx" ON "audit_logs"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorType_actorId_createdAt_idx" ON "audit_logs"("actorType", "actorId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_requestId_idx" ON "audit_logs"("requestId");

-- CreateIndex
CREATE INDEX "security_events_eventType_createdAt_idx" ON "security_events"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "security_events_severity_createdAt_idx" ON "security_events"("severity", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_events_idempotencyKey_key" ON "outbox_events"("idempotencyKey");

-- CreateIndex
CREATE INDEX "outbox_events_processedAt_availableAt_idx" ON "outbox_events"("processedAt", "availableAt");

-- CreateIndex
CREATE INDEX "integration_deliveries_integration_status_nextAttemptAt_idx" ON "integration_deliveries"("integration", "status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "booking_holds_idempotencyKey_key" ON "booking_holds"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "booking_checkouts_idempotencyKey_key" ON "booking_checkouts"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_checkoutId_key" ON "bookings"("checkoutId");

-- CreateIndex
CREATE INDEX "bookings_customerId_startsAt_idx" ON "bookings"("customerId", "startsAt");

-- CreateIndex
CREATE INDEX "bookings_source_createdAt_idx" ON "bookings"("source", "createdAt");

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_checkouts" ADD CONSTRAINT "booking_checkouts_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customerVehicleId_fkey" FOREIGN KEY ("customerVehicleId") REFERENCES "customer_vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "booking_checkouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_sessions" ADD CONSTRAINT "customer_sessions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_challenges" ADD CONSTRAINT "otp_challenges_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_vehicleClassId_fkey" FOREIGN KEY ("vehicleClassId") REFERENCES "vehicle_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_blocks" ADD CONSTRAINT "resource_blocks_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_delegates" ADD CONSTRAINT "pickup_delegates_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_credentials" ADD CONSTRAINT "pickup_credentials_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "booking_checkouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_callbacks" ADD CONSTRAINT "payment_callbacks_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_accounts" ADD CONSTRAINT "wallet_accounts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallet_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_credit_lots" ADD CONSTRAINT "wallet_credit_lots_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallet_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "loyalty_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "loyalty_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_service_scopes" ADD CONSTRAINT "coupon_service_scopes_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_service_scopes" ADD CONSTRAINT "coupon_service_scopes_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "service_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_attempts" ADD CONSTRAINT "sms_attempts_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_journeys" ADD CONSTRAINT "customer_journeys_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_journey_events" ADD CONSTRAINT "customer_journey_events_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "customer_journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "automation_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tag_assignments" ADD CONSTRAINT "customer_tag_assignments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tag_assignments" ADD CONSTRAINT "customer_tag_assignments_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "customer_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
