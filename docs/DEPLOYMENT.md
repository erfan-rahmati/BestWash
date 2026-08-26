# راهنمای استقرار و عملیات

## پیش از انتشار

1. دامنه و HTTPS را آماده کنید و `WEB_ORIGIN`، `NEXT_PUBLIC_WEB_URL`، `NEXT_PUBLIC_API_BASE_URL` و `PAYMENT_CALLBACK_URL` را دقیق تنظیم کنید.
2. برای JWT مشتری، JWT ادمین، OTP pepper و رمزنگاری پیام‌های حساس چهار Secret مستقل حداقل ۶۴ کاراکتری بسازید.
3. `ADMIN_TOTP_SECRET` را تنظیم و در نرم‌افزار Authenticator مالک ثبت کنید.
4. شناسه پذیرنده زرین‌پال و کلید/قالب‌های SMS.ir را وارد کنید.
5. رمز اولیه مدیر را فقط برای Seed اول استفاده و بلافاصله تعویض کنید.

## انتشار بدون از دست رفتن داده

```bash
docker compose -f docker/compose.prod.yml build
docker compose -f docker/compose.prod.yml run --rm migrate
docker compose -f docker/compose.prod.yml up -d
docker compose -f docker/compose.prod.yml ps
```

Migrationها افزایشی‌اند. پیش از Migration از دیتابیس نسخه پشتیبان بگیرید. Rollback دیتابیس باید با Restore نسخه پشتیبان و بازگرداندن Image قبلی انجام شود؛ Migration تولیدی را ویرایش نکنید.

## بررسی سلامت

- `GET /api/v1/health`
- Swagger و OpenAPI فقط در محیط توسعه فعال‌اند و در production باید `404` باشند.
- لاگ‌های API، Worker و Nginx را به سامانه متمرکز ارسال کنید.

## امنیت محیط واقعی

- Cookieها Secure/HttpOnly هستند؛ دامنه باید HTTPS باشد.
- پورت PostgreSQL و Redis به اینترنت منتشر نشود.
- دسترسی پنل مدیر به VPN/IP allowlist محدود شود.
- Secretها داخل فایل پروژه یا Git نگهداری نشوند و دوره‌ای rotate شوند.
- نرخ خطاهای OTP، ورود مدیر، Callback پرداخت و تلاش کد تحویل هشدار داشته باشد.
