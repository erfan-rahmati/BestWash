# راه‌اندازی امن SMS.ir برای BestWash

## معماری نهایی

- کلید خصوصی SMS.ir فقط در محیط `Worker` نگهداری می‌شود.
- Web و API هیچ دسترسی مستقیمی به کلید پیامک ندارند.
- پیام‌های تراکنشی با `Verify` و پیام‌های آزاد (لینک پرداخت و پیام همگانی مدیر) با `Bulk` ارسال می‌شوند.
- مقدار هر پارامتر Verify حداکثر ۲۵ نویسه است؛ Worker قبل از ارسال این محدودیت را بررسی می‌کند.
- حالت پیش‌فرض `disabled` است تا نصب ناقص باعث مصرف اعتبار یا صف ناموفق نشود.

## اطلاعاتی که باید از پنل بگیرید

1. یک کلید `Sandbox` برای تست اولیه.
2. پس از تأیید قالب‌ها، یک کلید `Production` مستقل برای محیط واقعی.
3. شماره خط ارسال (`Line Number`) برای لینک پرداخت و پیام همگانی.
4. شناسه عددی ۱۳ قالب تأییدشده زیر.

کلید خصوصی را در پیام‌رسان، اسکرین‌شات، Git یا پنل Web قرار ندهید. آن را فقط در فایل محلی `apps/worker/.env` و Secretهای سرویس میزبان Worker ثبت کنید.

## قالب‌هایی که باید در پنل ساخته شوند

نام پارامترها را دقیقاً با همین حروف و بدون تغییر ثبت کنید.

| کد داخلی | متن قالب در SMS.ir | پارامترها |
|---|---|---|
| `AUTH_OTP` | `کد ورود شما به BestWash: #Code#` | `Code` |
| `ADMIN_LOGIN_OTP` | `کد ورود مدیریت BestWash: #Code#` | `Code` |
| `WELCOME` | `#Name# عزیز، کد #Coupon# برای #Discount# درصد تخفیف رزرو بعدی شما فعال شد.` سپس خط بعد `BestWash` | `Name`, `Coupon`, `Discount` |
| `BOOKING_CONFIRMED` | `رزرو #Booking# با موفقیت ثبت و تأیید شد.` سپس خط بعد `BestWash` | `Booking` |
| `BOOKING_REMINDER` | `یادآوری: زمان مراجعه رزرو #Booking# نزدیک است.` سپس خط بعد `BestWash` | `Booking` |
| `BOOKING_CANCELLED` | `رزرو #Booking# لغو شد. جزئیات بازپرداخت در برنامه قابل مشاهده است.` سپس خط بعد `BestWash` | `Booking` |
| `CAR_CHECKED_IN` | `خودروی رزرو #Booking# در مجموعه پذیرش شد.` سپس خط بعد `BestWash` | `Booking` |
| `CAR_IN_PROGRESS` | `خدمات خودروی رزرو #Booking# آغاز شد.` سپس خط بعد `BestWash` | `Booking` |
| `PICKUP_CODE_OWNER` | `خودروی رزرو #Booking# آماده تحویل است. کد تحویل: #Code#` سپس خط بعد `BestWash` | `Booking`, `Code` |
| `PICKUP_CODE_DELEGATE` | `خودروی رزرو #Booking# آماده تحویل است. کد تحویل: #Code#` سپس خط بعد `BestWash` | `Booking`, `Code` |
| `PICKUP_DELEGATE_CHANGED` | `کد تحویل رزرو #Booking# تغییر کرد: #Code#` سپس خط بعد `BestWash` | `Booking`, `Code` |
| `PICKUP_REMINDER_OWNER` | `خودروی رزرو #Booking# آماده تحویل است. لطفاً مراجعه کنید.` سپس خط بعد `BestWash` | `Booking` |
| `BOOKING_COMPLETED` | `رزرو #Booking# با موفقیت تکمیل شد. از انتخاب شما متشکریم.` سپس خط بعد `BestWash` | `Booking` |

برای `PAYMENT_LINK` و `ADMIN_BROADCAST` قالب Verify نسازید. این دو پیام متن یا لینک بلند دارند و از متد Bulk و خط ارسال پنل استفاده می‌کنند.

قالب‌های `PAYMENT_SUCCESS`، `BOOKING_RESCHEDULED`، `CAR_READY`، `REVIEW_REQUEST`، `CASHBACK_EARNED`، `WALLET_CREDIT_EXPIRY_REMINDER`، `LOYALTY_POINTS_EARNED`، `LOYALTY_TIER_UPGRADE` و کمپین‌های بازاریابی در وضعیت فعلی پیامک عملیاتی ارسال نمی‌کنند؛ کانال آن‌ها In-App/Push است. برای جلوگیری از هزینه و قالب‌های بلااستفاده فعلاً در SMS.ir ساخته نشوند.

## تنظیم Sandbox

SMS.ir در Sandbox فقط قالب پیش‌فرض `123456` با پارامتر `Code` را شبیه‌سازی می‌کند. در `apps/worker/.env`:

```env
SMSIR_MODE=sandbox
SMSIR_API_KEY=کلید_خصوصی_Sandbox
SMSIR_LINE_NUMBER=
```

در این حالت فقط OTP مشتری و مدیر آزمایش می‌شود و پیام واقعی یا هزینه‌ای ثبت نمی‌شود. سایر رویدادهای پیامکی عمداً Skip می‌شوند تا صف خطا تولید نشود.

## تنظیم Production

پس از تأیید همه قالب‌ها، مقادیر زیر را فقط در `apps/worker/.env` قرار دهید:

```env
SMSIR_MODE=production
SMSIR_API_KEY=کلید_خصوصی_Production
SMSIR_BULK_ENABLED=true
SMSIR_LINE_NUMBER=شماره_خط_ارسال
SMSIR_TEMPLATE_AUTH_OTP=شناسه_قالب
SMSIR_TEMPLATE_ADMIN_LOGIN_OTP=شناسه_قالب
SMSIR_TEMPLATE_WELCOME=شناسه_قالب
SMSIR_TEMPLATE_BOOKING_CONFIRMED=شناسه_قالب
SMSIR_TEMPLATE_BOOKING_REMINDER=شناسه_قالب
SMSIR_TEMPLATE_BOOKING_CANCELLED=شناسه_قالب
SMSIR_TEMPLATE_CAR_CHECKED_IN=شناسه_قالب
SMSIR_TEMPLATE_CAR_IN_PROGRESS=شناسه_قالب
SMSIR_TEMPLATE_PICKUP_CODE_OWNER=شناسه_قالب
SMSIR_TEMPLATE_PICKUP_CODE_DELEGATE=شناسه_قالب
SMSIR_TEMPLATE_PICKUP_DELEGATE_CHANGED=شناسه_قالب
SMSIR_TEMPLATE_PICKUP_REMINDER_OWNER=شناسه_قالب
SMSIR_TEMPLATE_BOOKING_COMPLETED=شناسه_قالب
```

شناسه قالب Secret نیست و می‌تواند به‌جای env از بخش «پیامک‌ها» در پنل مدیریت BestWash و فیلد شناسه قالب SMS.ir ثبت شود. مقدار env بر مقدار دیتابیس اولویت دارد.

اگر هنوز خط ارسال فعال ندارید، تنظیمات زیر را قرار دهید تا پیامک‌های Verify فعال بمانند اما لینک پرداخت و پیام همگانی بدون ایجاد Retry و صف خطا موقتاً Skip شوند:

```env
SMSIR_BULK_ENABLED=false
SMSIR_LINE_NUMBER=
```

بعد از فعال‌شدن خط، شماره را قرار دهید و `SMSIR_BULK_ENABLED=true` کنید.

## کنترل قبل از محیط واقعی

```powershell
Set-Location "C:\Users\ERFAN\Desktop\bestwash"

pnpm --filter worker lint
pnpm --filter worker typecheck
pnpm --filter worker test
pnpm --filter worker build

pnpm --filter api typecheck
pnpm --filter api test
pnpm --filter api build
```

برای Production، `EXPOSE_TEST_OTP` باید `false` باشد. پس از انتقال Worker به میزبان نهایی، محدودیت IP کلید را فقط با IP خروجی ثابت همان میزبان فعال کنید. در محیطی با IP خروجی متغیر، فعال‌سازی زودهنگام IP Restriction ارسال را قطع می‌کند.

## واکنش به افشای کلید

اگر کلید در Console، Git، Screenshot یا پیام‌رسان منتشر شد، آن را فوراً از پنل SMS.ir غیرفعال و یک کلید جدید ایجاد کنید؛ حذف متن از Git به‌تنهایی کلید قبلی را امن نمی‌کند.
