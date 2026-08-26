# BestWash

سامانه کامل رزرو آنلاین کارواش شامل PWA مشتری، پنل مدیریت واکنش‌گرا، API، PostgreSQL، صف Redis/BullMQ، پرداخت آنلاین، کیف پول، وفاداری، پیامک و گردش‌کار تحویل خودرو است.

## اجزای پروژه

- `apps/web`: رابط مشتری موبایل‌محور (حداکثر عرض ۴۴۰ پیکسل)، PWA و پنل مدیریت دسکتاپ/موبایل
- `apps/api`: REST API نسخه‌بندی‌شده NestJS در مسیر `/api/v1` و مستندات Swagger در `/api/v1/docs`
- `apps/worker`: پردازش Outbox، صف پیامک و انقضای اعتبار کیف پول
- `apps/api/prisma`: مدل داده، Migrationهای افزایشی و Seed اولیه
- `docker`: محیط توسعه و استقرار Production با Nginx، PostgreSQL و Redis
- `docs`: راهنمای عملیات، استقرار، پرداخت، پیامک، پشتیبان‌گیری و امنیت

## راه‌اندازی توسعه

پیش‌نیازها: Node.js 24، pnpm 11 و Docker Compose.

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/worker/.env.example apps/worker/.env
docker compose -f docker/compose.dev.yml up -d
pnpm install --frozen-lockfile
pnpm --filter api db:generate
pnpm --filter api exec prisma migrate deploy
pnpm --filter api exec prisma db seed
pnpm dev
```

وب روی `http://localhost:3000`، پنل مدیر روی `http://localhost:3000/admin` و API روی `http://localhost:3001/api/v1` اجرا می‌شود. مدیر توسعه از متغیرهای `ADMIN_INITIAL_MOBILE`، `ADMIN_INITIAL_EMAIL` و `ADMIN_INITIAL_PASSWORD` در اولین Seed ساخته می‌شود؛ این مقادیر را برای محیط واقعی عوض کنید. پرداخت پروژه طبق درخواست فعلی فقط با زرین‌پال در حالت Sandbox تنظیم شده است.

## گردش رزرو

1. مشتری خودرو، خدمت و زمان را انتخاب می‌کند و Hold محدود زمانی می‌گیرد.
2. Checkout قطعی و مبلغ روی سرور محاسبه می‌شود.
3. پرداخت تمام‌پیش‌پرداخت از درگاه یا ترکیب کیف پول و درگاه انجام می‌شود.
4. رزرو فقط پس از Verify مبلغ و شناسه پرداخت ساخته می‌شود.
5. وضعیت‌ها با State Machine و تاریخچه غیرقابل حذف جلو می‌روند.
6. در `READY_FOR_PICKUP` کد تصادفی ۶ رقمی صادر و برای مالک/نماینده ارسال می‌شود.
7. پس از تحویل و تکمیل، کش‌بک و امتیاز وفاداری به‌شکل idempotent ثبت می‌شوند.

رزرو دستی مدیر نیز از همان Hold، Checkout و درگاه استفاده می‌کند و در فهرست رزروها Badge جداگانه `ADMIN_MANUAL` دارد؛ رزرو اپ با `CUSTOMER_APP` مشخص می‌شود.

## کنترل کیفیت

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## استقرار

فایل `.env.example` ریشه را به `.env` کپی کنید، تمام Secretها و آدرس دامنه را تغییر دهید و سپس دستور زیر را اجرا کنید:

```bash
docker compose -f docker/compose.prod.yml up -d --build
```

برای TLS واقعی، گواهی‌ها را در مسیر `TLS_CERT_DIR` قرار دهید و بلاک SSL دامنه را به `docker/nginx.conf` اضافه کنید. جزئیات در [راهنمای استقرار](docs/DEPLOYMENT.md) آمده است.
