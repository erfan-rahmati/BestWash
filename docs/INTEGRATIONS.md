# راهنمای درگاه و پیامک

## زرین‌پال

برای محیط توسعه `PAYMENT_PROVIDER=zarinpal` و `ZARINPAL_SANDBOX=true` است. در Sandbox یک UUID دلخواه برای `ZARINPAL_MERCHANT_ID` قابل استفاده است. مبلغ مرجع پروژه ریال است. رزرو فقط پس از Verify موفق و Claim اتمیک پرداخت ایجاد می‌شود؛ Callbackهای تکراری رزرو دوم نمی‌سازند.

برای درگاه واقعی، Sandbox را خاموش و Merchant ID واقعی را فقط در Secretهای محیط عملیاتی وارد کنید.

## SMS.ir

کلید `SMSIR_API_KEY` و شناسه قالب هر رویداد را تنظیم کنید. Worker رویدادهای Outbox را به BullMQ منتقل می‌کند و با backoff نمایی تلاش مجدد انجام می‌دهد. قالب‌های حداقلی:

- `SMSIR_TEMPLATE_AUTH_OTP`
- `SMSIR_TEMPLATE_BOOKING_CONFIRMED`
- `SMSIR_TEMPLATE_PICKUP_READY`

مقدار OTP یا کد تحویل نباید در لاگ برنامه ثبت شود. دسترسی به لاگ و Outbox باید فقط برای سرویس‌های داخلی باشد.
