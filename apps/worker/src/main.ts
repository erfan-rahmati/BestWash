import "dotenv/config";
import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { createDecipheriv, createHash } from "node:crypto";
import pg from "pg";
import webPush from "web-push";
import {
  buildSmsIrRequest,
  isBulkSmsTemplate,
  providerMessageId,
  smsIrMode,
  type SmsIrResponse,
} from "./smsir.js";

const { Pool } = pg;
const configuredDatabaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL;

if (!configuredDatabaseUrl) throw new Error("DATABASE_URL is required.");
if (!redisUrl) throw new Error("REDIS_URL is required.");

// On Windows, VPN/TUN adapters can intermittently route localhost through an
// IPv6 path while Docker publishes PostgreSQL on IPv4 as well. Pin only the
// local development hostname to the IPv4 loopback without changing .env.
const parsedDatabaseUrl = new URL(configuredDatabaseUrl);
if (parsedDatabaseUrl.hostname.toLowerCase() === "localhost") {
  parsedDatabaseUrl.hostname = "127.0.0.1";
}
const databaseUrl = parsedDatabaseUrl.toString();

const pool = new Pool({
  connectionString: databaseUrl,
  max: 5,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 5_000,
});
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
const queue = new Queue("bestwash-platform", { connection });

function reportRuntimeError(scope: string, error: unknown) {
  console.error(`[${scope}]`, error);
}

// A disconnected idle PostgreSQL client emits through the pool. Without this
// listener Node treats the event as uncaught and terminates the whole worker.
// node-postgres removes the broken client from the pool automatically, so the
// next scheduled operation can establish a fresh connection.
pool.on("error", (error) => reportRuntimeError("postgres-pool", error));
pool.on("connect", (client) => {
  // pg-pool temporarily removes its idle-client listener while a client is
  // checked out. Keep one permanent listener on every physical connection so
  // a network reset during or immediately after a query cannot become an
  // unhandled EventEmitter error.
  client.on("error", (error) =>
    reportRuntimeError("postgres-client", error),
  );
});
connection.on("error", (error) => reportRuntimeError("redis", error));
queue.on("error", (error) => reportRuntimeError("bullmq-queue", error));

const vapidPublicKey = process.env.WEB_PUSH_PUBLIC_KEY;
const vapidPrivateKey = process.env.WEB_PUSH_PRIVATE_KEY;
if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails(
    process.env.WEB_PUSH_SUBJECT ?? "mailto:support@bestwash.ir",
    vapidPublicKey,
    vapidPrivateKey,
  );
}

const notificationCopy: Record<string, { title: string; body: string }> = {
  BOOKING_CONFIRMED: {
    title: "رزرو شما تأیید شد",
    body: "رزرو شما با موفقیت ثبت شد. جزئیات و وضعیت را در برنامه ببینید.",
  },
  WELCOME: {
    title: "هدیه رزرو بعدی شما",
    body: "کد WELCOME برای ۱۵٪ تخفیف رزرو بعدی فعال است.",
  },
  BOOKING_REMINDER: {
    title: "یادآوری زمان رزرو",
    body: "حدود ۱۰ دقیقه تا زمان مراجعه شما باقی مانده است.",
  },
  BOOKING_CANCELLED: {
    title: "رزرو لغو شد",
    body: "رزرو شما لغو شد. جزئیات بازپرداخت در کیف پول قابل مشاهده است.",
  },
  CAR_CHECKED_IN: {
    title: "خودرو پذیرش شد",
    body: "خودروی شما در مجموعه پذیرش شد.",
  },
  CAR_IN_PROGRESS: {
    title: "شست‌وشوی خودرو آغاز شد",
    body: "خودروی شما اکنون در حال دریافت خدمات است.",
  },
  PICKUP_CODE_OWNER: {
    title: "خودرو آماده تحویل است",
    body: "خودروی شما آماده است. کد تحویل برای شما ارسال شد.",
  },
  PICKUP_CODE_DELEGATE: {
    title: "خودرو آماده تحویل است",
    body: "خودرو آماده است و کد برای تحویل‌گیرنده ارسال شد.",
  },
  PICKUP_REMINDER_OWNER: {
    title: "یادآوری دریافت خودرو",
    body: "خودروی شما آماده تحویل است؛ لطفاً برای دریافت آن مراجعه کنید.",
  },
  BOOKING_COMPLETED: {
    title: "خدمت با موفقیت تکمیل شد",
    body: "از انتخاب BestWash متشکریم. امتیاز و اعتبار خود را ببینید.",
  },
  LOYALTY_POINTS_EARNED: {
    title: "امتیاز جدید دریافت کردید",
    body: "امتیاز شما به‌روزرسانی شد.",
  },
  LOYALTY_TIER_UPGRADE: {
    title: "سطح باشگاه شما ارتقا یافت",
    body: "مزایای سطح جدید را در بخش امتیاز و دستاوردها ببینید.",
  },
  CASHBACK_EARNED: {
    title: "اعتبار هدیه دریافت کردید",
    body: "اعتبار بازگشتی به کیف پول شما اضافه شد.",
  },
};

function decryptMessageSecret(ciphertext: string): string {
  const configured = [
    process.env.MESSAGE_SECRET_ENCRYPTION_KEY,
    process.env.MESSAGE_SECRET_ENCRYPTION_KEY_PREVIOUS,
  ].filter(Boolean) as string[];
  if (configured.length === 0)
    throw new Error("MESSAGE_SECRET_ENCRYPTION_KEY is missing.");
  const [iv, tag, encrypted] = ciphertext.split(".");
  if (!iv || !tag || !encrypted)
    throw new Error("Invalid encrypted message secret.");

  let lastError: unknown;
  for (const secret of [...new Set(configured)]) {
    try {
      const key = createHash("sha256").update(secret).digest();
      const decipher = createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(iv, "base64url"),
      );
      decipher.setAuthTag(Buffer.from(tag, "base64url"));
      return Buffer.concat([
        decipher.update(Buffer.from(encrypted, "base64url")),
        decipher.final(),
      ]).toString("utf8");
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Unable to decrypt message secret.");
}

async function sendSms(payload: Record<string, unknown>) {
  const mode = smsIrMode(process.env.SMSIR_MODE);
  const templateCode = String(payload.templateCode ?? "");
  const templateKey = `SMSIR_TEMPLATE_${templateCode}`;
  let templateId: number | undefined;
  if (mode === "production" && !isBulkSmsTemplate(templateCode)) {
    templateId = Number(process.env[templateKey]);
    if (!Number.isSafeInteger(templateId) || templateId <= 0) {
      const template = await pool.query<{ providerTemplateId: string | null }>(
        'SELECT "providerTemplateId" FROM notification_templates WHERE code = $1 AND "isActive" = true LIMIT 1',
        [templateCode],
      );
      templateId = Number(template.rows[0]?.providerTemplateId);
    }
  }
  const request = buildSmsIrRequest({
    mode,
    payload,
    templateId,
    lineNumber: Number(process.env.SMSIR_LINE_NUMBER),
    bulkEnabled: process.env.SMSIR_BULK_ENABLED === "true",
    decryptedCode:
      mode !== "disabled" && payload.secretCiphertext
        ? decryptMessageSecret(String(payload.secretCiphertext))
        : undefined,
  });
  if (request.kind === "skip") return request;
  const apiKey = process.env.SMSIR_API_KEY?.trim();
  if (!apiKey) throw new Error("SMSIR_API_KEY is required when SMS is enabled.");
  const response = await fetch(request.endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(request.body),
    signal: AbortSignal.timeout(12_000),
  });
  const body = (await response.json()) as SmsIrResponse;
  if (!response.ok || body.status !== 1) {
    throw new Error(body.message ?? `SMS.ir HTTP ${response.status}`);
  }
  const messageId = providerMessageId(body);
  if (!messageId) throw new Error("SMS.ir response did not include a message ID.");
  return { ...body, providerMessageId: messageId };
}

async function processOutbox() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{
      id: string;
      eventType: string;
      payload: Record<string, unknown>;
    }>(`
      SELECT id, "eventType", payload
      FROM outbox_events
      WHERE "processedAt" IS NULL AND "availableAt" <= NOW()
      ORDER BY "occurredAt"
      LIMIT 50
      FOR UPDATE SKIP LOCKED
    `);
    for (const event of result.rows) {
      await queue.add(
        event.eventType,
        { outboxId: event.id, payload: event.payload },
        {
          jobId: event.id,
          attempts: 5,
          backoff: { type: "exponential", delay: 5_000 },
          removeOnComplete: 500,
          removeOnFail: 500,
        },
      );
      await client.query(
        'UPDATE outbox_events SET "processedAt" = NOW() WHERE id = $1',
        [event.id],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function expireWalletCredits() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const lots = await client.query<{
      id: string;
      walletId: string;
      remainingAmountRial: number;
    }>(`
      SELECT id, "walletId", "remainingAmountRial"
      FROM wallet_credit_lots
      WHERE "expiredAt" IS NULL AND "expiresAt" <= NOW() AND "remainingAmountRial" > 0
      FOR UPDATE SKIP LOCKED
    `);
    for (const lot of lots.rows) {
      const account = await client.query<{ balanceRial: number }>(
        'UPDATE wallet_accounts SET "balanceRial" = GREATEST(0, "balanceRial" - $1), "updatedAt" = NOW() WHERE id = $2 RETURNING "balanceRial"',
        [lot.remainingAmountRial, lot.walletId],
      );
      await client.query(
        'UPDATE wallet_credit_lots SET "remainingAmountRial" = 0, "expiredAt" = NOW() WHERE id = $1',
        [lot.id],
      );
      await client.query(
        `INSERT INTO wallet_transactions (id, "walletId", type, "amountRial", "balanceAfterRial", "idempotencyKey", reason, "createdAt")
         VALUES (gen_random_uuid()::text, $1, 'EXPIRATION', $2, $3, $4, 'انقضای اعتبار', NOW())
         ON CONFLICT ("idempotencyKey") DO NOTHING`,
        [
          lot.walletId,
          -lot.remainingAmountRial,
          account.rows[0]?.balanceRial ?? 0,
          `expiry:${lot.id}`,
        ],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function enqueueBookingReminders() {
  const reminderMinutes = Number(process.env.BOOKING_REMINDER_MINUTES ?? 10);
  await pool.query(
    `INSERT INTO outbox_events
      (id, "aggregateType", "aggregateId", "eventType", payload, "idempotencyKey", "occurredAt", "availableAt", attempts)
     SELECT
       gen_random_uuid()::text,
       'booking',
       b.id,
       'booking.reminder',
       jsonb_build_object(
         'bookingId', b.id,
         'bookingCode', b.code,
         'customerId', b."customerId",
         'mobile', c.mobile,
         'templateCode', 'BOOKING_REMINDER'
       ),
       'booking.reminder:' || b.id,
       NOW(),
       NOW(),
       0
     FROM bookings b
     JOIN customers c ON c.id = b."customerId"
     WHERE b.status = 'CONFIRMED'
       AND b."startsAt" > NOW()
       AND b."startsAt" <= NOW() + ($1::text || ' minutes')::interval
     ON CONFLICT ("idempotencyKey") DO NOTHING`,
    [reminderMinutes],
  );
}

async function rejectExpiredUnreviewedBookings() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const expired = await client.query<{
      id: string;
      code: string;
      customerId: string;
      mobile: string;
      refundRial: number;
    }>(`
      SELECT b.id, b.code, b."customerId", c.mobile,
             (b."walletAmountRial" + b."gatewayAmountRial")::int AS "refundRial"
      FROM bookings b
      JOIN customers c ON c.id = b."customerId"
      WHERE b.status = 'UNDER_REVIEW' AND b."startsAt" <= NOW()
      FOR UPDATE OF b SKIP LOCKED
    `);
    for (const booking of expired.rows) {
      const wallet = await client.query<{ id: string; balanceRial: number }>(
        `
        INSERT INTO wallet_accounts (id, "customerId", "balanceRial", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, $1, 0, NOW(), NOW())
        ON CONFLICT ("customerId") DO UPDATE SET "updatedAt" = NOW()
        RETURNING id, "balanceRial"
      `,
        [booking.customerId],
      );
      const walletId = wallet.rows[0]!.id;
      const credited = await client.query<{ balanceRial: number }>(
        'UPDATE wallet_accounts SET "balanceRial" = "balanceRial" + $1, "updatedAt" = NOW() WHERE id = $2 RETURNING "balanceRial"',
        [booking.refundRial, walletId],
      );
      const transaction = await client.query<{ id: string }>(
        `
        INSERT INTO wallet_transactions
          (id, "walletId", "bookingId", type, "amountRial", "balanceAfterRial", "idempotencyKey", reason, "createdAt")
        VALUES (gen_random_uuid()::text, $1, $2, 'REFUND', $3, $4, $5, $6, NOW())
        ON CONFLICT ("idempotencyKey") DO UPDATE SET reason = EXCLUDED.reason
        RETURNING id
      `,
        [
          walletId,
          booking.id,
          booking.refundRial,
          credited.rows[0]!.balanceRial,
          `auto-rejection:refund:${booking.id}`,
          "تأییدنشدن رزرو توسط مدیر تا زمان مراجعه",
        ],
      );
      if (booking.refundRial > 0) {
        await client.query(
          `
          INSERT INTO wallet_credit_lots
            (id, "walletId", "originalAmountRial", "remainingAmountRial", "sourceTransactionId", "createdAt")
          SELECT gen_random_uuid()::text, $1, $2, $2, $3, NOW()
          WHERE NOT EXISTS (SELECT 1 FROM wallet_credit_lots WHERE "sourceTransactionId" = $3)
        `,
          [walletId, booking.refundRial, transaction.rows[0]!.id],
        );
      }
      await client.query(
        `
        UPDATE payments SET status = 'REFUNDED'
        WHERE "bookingId" = $1 AND status = 'PAID'
      `,
        [booking.id],
      );
      await client.query(
        `
        INSERT INTO refunds
          (id, "paymentId", "amountRial", status, reason, "createdAt", "processedAt")
        SELECT gen_random_uuid()::text, p.id, p."amountRial", 'WALLET_CREDITED',
               'تأییدنشدن رزرو توسط مدیر تا زمان مراجعه', NOW(), NOW()
        FROM payments p
        WHERE p."bookingId" = $1
          AND NOT EXISTS (SELECT 1 FROM refunds r WHERE r."paymentId" = p.id AND r.status = 'WALLET_CREDITED')
      `,
        [booking.id],
      );
      await client.query(
        `
        UPDATE booking_capacity_buckets b
        SET "usedCapacity" = GREATEST(0, b."usedCapacity" - 1), "updatedAt" = NOW()
        FROM booking_capacity_allocations a
        WHERE a."bookingId" = $1 AND a."startsAt" = b."startsAt"
      `,
        [booking.id],
      );
      await client.query(
        `
        UPDATE bookings
        SET status = 'ADMIN_REJECTED', "paymentStatus" = 'REFUNDED',
            "cancelledAt" = NOW(), "cancellationReason" = $2, "updatedAt" = NOW()
        WHERE id = $1
      `,
        [booking.id, "رزرو در مهلت مقرر توسط مدیر تأیید نشد"],
      );
      await client.query(
        `
        INSERT INTO booking_status_history
          (id, "bookingId", "fromStatus", "toStatus", "actorType", reason, "createdAt")
        VALUES (gen_random_uuid()::text, $1, 'UNDER_REVIEW', 'ADMIN_REJECTED', 'SYSTEM', $2, NOW())
      `,
        [booking.id, "پایان مهلت بررسی مدیر"],
      );
      await client.query(
        `
        INSERT INTO notifications
          (id, "customerId", "templateCode", channel, recipient, title, body, "actionUrl", status, "sentAt", "scheduledAt", "createdAt")
        VALUES (gen_random_uuid()::text, $1, 'BOOKING_CANCELLED', 'IN_APP', $1, $2, $3, $4, 'SENT', NOW(), NOW(), NOW())
      `,
        [
          booking.customerId,
          "رزرو توسط مدیر تأیید نشد",
          "مبلغ پرداختی به کیف پول شما بازگردانده شد.",
          `/bookings/${booking.id}`,
        ],
      );
      await client.query(
        `INSERT INTO outbox_events
          (id, "aggregateType", "aggregateId", "eventType", payload, "idempotencyKey", "occurredAt", "availableAt", attempts)
         VALUES (
           gen_random_uuid()::text,
           'booking',
           $1,
           'booking.cancelled',
           jsonb_build_object(
             'bookingId', $1::text,
             'bookingCode', $2::text,
             'customerId', $3::text,
             'mobile', $4::text,
             'templateCode', 'BOOKING_CANCELLED'
           ),
           'booking.cancelled:auto-rejection:' || $1,
           NOW(),
           NOW(),
           0
         )
         ON CONFLICT ("idempotencyKey") DO NOTHING`,
        [booking.id, booking.code, booking.customerId, booking.mobile],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function sendPushNotifications(
  customerId: string,
  payload: Record<string, unknown>,
) {
  if (!vapidPublicKey || !vapidPrivateKey) return { skipped: true };
  const subscriptions = await pool.query<{
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }>(
    `SELECT id, endpoint, p256dh, auth
     FROM push_subscriptions
     WHERE "customerId" = $1 AND "isActive" = true`,
    [customerId],
  );
  const templateCode = String(payload.templateCode ?? "");
  const copy = notificationCopy[templateCode] ?? {
    title: String(payload.title ?? "BestWash"),
    body: String(payload.body ?? "یک اعلان جدید برای شما ثبت شد."),
  };
  const message = JSON.stringify({
    ...copy,
    url: payload.bookingId
      ? `/bookings/${String(payload.bookingId)}`
      : "/notifications",
  });
  for (const subscription of subscriptions.rows) {
    try {
      await webPush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        message,
      );
    } catch (error) {
      const statusCode =
        typeof error === "object" && error && "statusCode" in error
          ? Number(error.statusCode)
          : 0;
      if (statusCode === 404 || statusCode === 410) {
        await pool.query(
          'UPDATE push_subscriptions SET "isActive" = false, "updatedAt" = NOW() WHERE id = $1',
          [subscription.id],
        );
      } else {
        throw error;
      }
    }
  }
  return { sent: subscriptions.rowCount ?? 0 };
}

async function advanceDueBookings() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const due = await client.query<{ id: string; code: string }>(`
      UPDATE bookings
      SET status = 'CHECKED_IN', "updatedAt" = NOW()
      WHERE status = 'CONFIRMED'
        AND "startsAt" <= NOW() + INTERVAL '30 minutes'
      RETURNING id, code
    `);
    for (const booking of due.rows) {
      await client.query(
        `INSERT INTO booking_status_history
          (id, "bookingId", "fromStatus", "toStatus", "actorType", reason, "createdAt")
         VALUES (gen_random_uuid()::text, $1, 'CONFIRMED', 'CHECKED_IN', 'SYSTEM', $2, NOW())`,
        [booking.id, "ورود خودکار به بازه ۳۰ دقیقه‌ای مراجعه"],
      );
      await client.query(
        `INSERT INTO admin_notifications
          (id, type, title, body, "actionUrl", "entityType", "entityId", "createdAt")
         VALUES (gen_random_uuid()::text, 'BOOKING_VISIT_DUE', $1, $2, '/admin/bookings', 'Booking', $3, NOW())`,
        [
          "رزرو وارد بازه مراجعه شد",
          `تا زمان مراجعه رزرو ${booking.code} حداکثر ۳۰ دقیقه باقی مانده است. پس از حضور مشتری، شروع خدمات را ثبت کنید.`,
          booking.id,
        ],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function sendPendingAdminPush() {
  if (!vapidPublicKey || !vapidPrivateKey) return;
  const notifications = await pool.query<{
    id: string;
    adminUserId: string | null;
    title: string;
    body: string;
    actionUrl: string | null;
  }>(`
    SELECT id, "adminUserId", title, body, "actionUrl"
    FROM admin_notifications
    WHERE "pushedAt" IS NULL
    ORDER BY "createdAt"
    LIMIT 50
  `);
  for (const notification of notifications.rows) {
    const subscriptions = await pool.query<{
      id: string;
      endpoint: string;
      p256dh: string;
      auth: string;
    }>(
      `SELECT id, endpoint, p256dh, auth
       FROM admin_push_subscriptions
       WHERE "isActive" = true
         AND ($1::text IS NULL OR "adminUserId" = $1)`,
      [notification.adminUserId],
    );
    for (const subscription of subscriptions.rows) {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify({
            title: notification.title,
            body: notification.body,
            url: notification.actionUrl ?? "/admin",
          }),
        );
      } catch (error) {
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? Number(error.statusCode)
            : 0;
        if (statusCode === 404 || statusCode === 410) {
          await pool.query(
            'UPDATE admin_push_subscriptions SET "isActive" = false, "updatedAt" = NOW() WHERE id = $1',
            [subscription.id],
          );
        } else {
          throw error;
        }
      }
    }
    await pool.query(
      'UPDATE admin_notifications SET "pushedAt" = NOW() WHERE id = $1',
      [notification.id],
    );
  }
}

const bestWashWorker = new Worker(
  "bestwash-platform",
  async (job) => {
    const payload = job.data.payload as Record<string, unknown>;
    if (
      payload.customerId &&
      String(payload.templateCode ?? "") === "BOOKING_REMINDER"
    ) {
      const copy = notificationCopy.BOOKING_REMINDER;
      await pool.query(
        `INSERT INTO notifications
          (id, "customerId", "templateCode", channel, recipient, payload, title, body, "actionUrl", status, "sentAt", "createdAt", "scheduledAt")
         SELECT gen_random_uuid()::text, $1, 'BOOKING_REMINDER', 'IN_APP', $1, $2, $3, $4, $5, 'SENT', NOW(), NOW(), NOW()
         WHERE NOT EXISTS (
           SELECT 1 FROM notifications
           WHERE "customerId" = $1 AND "templateCode" = 'BOOKING_REMINDER'
             AND payload->>'bookingId' = $6
         )`,
        [
          String(payload.customerId),
          payload,
          copy.title,
          copy.body,
          `/bookings/${String(payload.bookingId)}`,
          String(payload.bookingId),
        ],
      );
    }
    let smsResponse: Awaited<ReturnType<typeof sendSms>> | undefined;
    const channels = Array.isArray(payload.channels)
      ? payload.channels.map(String)
      : [];
    const wantsSms = !channels.length || channels.includes("SMS");
    if (
      payload.mobile &&
      wantsSms &&
      smsIrMode(process.env.SMSIR_MODE) !== "disabled"
    ) {
      smsResponse = await sendSms(payload);
      if (!("reason" in smsResponse)) {
        const notification = await pool.query<{ id: string }>(
          `INSERT INTO notifications
            (id, "customerId", "templateCode", channel, recipient, payload, status, "sentAt", "createdAt", "scheduledAt")
           VALUES (gen_random_uuid()::text, $1, $2, 'SMS', $3, $4, 'SENT', NOW(), NOW(), NOW())
           RETURNING id`,
          [
            payload.customerId ? String(payload.customerId) : null,
            String(payload.templateCode ?? job.name),
            String(payload.mobile),
            payload,
          ],
        );
        await pool.query(
          `INSERT INTO sms_attempts
            (id, "notificationId", "providerMessageId", "providerStatus", "attemptedAt")
           VALUES (gen_random_uuid()::text, $1, $2, 'SENT', NOW())`,
          [notification.rows[0]?.id, smsResponse.providerMessageId],
        );
      }
    }
    const wantsPush = !channels.length || channels.includes("PUSH");
    const pushResponse =
      payload.customerId && wantsPush
        ? await sendPushNotifications(String(payload.customerId), payload)
        : { skipped: true };
    return { sms: smsResponse ?? { skipped: true }, push: pushResponse };
  },
  { connection, concurrency: 10 },
);

bestWashWorker.on("error", (error) =>
  reportRuntimeError("bullmq-worker", error),
);

function scheduleTask(
  name: string,
  intervalMillis: number,
  task: () => Promise<void>,
) {
  let running = false;

  const run = async () => {
    if (running) return;
    running = true;
    try {
      await task();
    } catch (error) {
      reportRuntimeError(name, error);
    } finally {
      running = false;
    }
  };

  setInterval(() => void run(), intervalMillis);
  void run();
}

scheduleTask("outbox", 5_000, processOutbox);
scheduleTask("wallet-expiry", 60_000, expireWalletCredits);
scheduleTask(
  "booking-review-expiry",
  60_000,
  rejectExpiredUnreviewedBookings,
);
scheduleTask("booking-reminders", 60_000, enqueueBookingReminders);
scheduleTask("booking-auto-status", 30_000, advanceDueBookings);
scheduleTask("admin-push", 5_000, sendPendingAdminPush);
console.log("BestWash worker started");
