# بروزرسانی Sandbox زرین‌پال و SMS.ir

این بروزرسانی Provider مستقل `ZARINPAL`، Callback امن، Migration جدید و نگاشت دقیق قالب‌های SMS.ir را اضافه می‌کند.

## تنظیم توسعه API

مقادیر زیر در `apps/api/.env` قرار گیرند:

```env
PAYMENT_PROVIDER=zarinpal
ZARINPAL_SANDBOX=true
ZARINPAL_MERCHANT_ID=YOUR_RANDOM_UUID
PAYMENT_CALLBACK_URL=http://localhost:3001/api/v1/payments/zarinpal/callback
```

در Sandbox طبق مستندات زرین‌پال یک UUID دلخواه معتبر است.

## تنظیم Worker پیامک

مقادیر زیر در `apps/worker/.env` قرار گیرند:

```env
SMSIR_API_KEY=YOUR_PRIVATE_API_KEY
SMSIR_TEMPLATE_AUTH_OTP=0
SMSIR_TEMPLATE_BOOKING_CONFIRMED=0
SMSIR_TEMPLATE_PICKUP_CODE_OWNER=0
SMSIR_TEMPLATE_PICKUP_CODE_DELEGATE=0
SMSIR_TEMPLATE_PICKUP_DELEGATE_CHANGED=0
```

پارامتر قالب OTP باید `Code`، قالب تأیید رزرو باید `Booking` و قالب‌های تحویل باید `Code` و `Booking` باشند. نام پارامترها حساس به حروف است.
