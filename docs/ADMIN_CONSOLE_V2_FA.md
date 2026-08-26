# راهنمای پنل مدیریت BestWash نسخه ۲

این نسخه بازطراحی کامل پنل مدیریت BestWash را شامل می‌شود. برنامه مشتری همچنان موبایل‌محور است و تنظیم پرداخت نیز طبق درخواست پروژه روی زرین‌پال Sandbox باقی مانده است.

## قابلیت‌های تکمیل‌شده

1. پوسته مدیریتی واکنش‌گرا، هدر حساب مدیر، میانبرها، اعلان‌ها، سایدبار جدید و منوی «بیشتر» موبایل
2. داشبورد فارسی با شاخص‌های روز، رزروهای منتظر بررسی، اقدامات سریع، پرداخت‌ها، تیکت‌ها و نمودارهای زنده
3. واژه‌ها، وضعیت‌ها، خطاها و داده‌های قابل مشاهده مدیر به زبان فارسی
4. گردش کامل رزرو: بررسی، تأیید، رد و بازپرداخت، زمان مراجعه، شروع شست‌وشو، آماده تحویل، یادآوری، تحویل و تکمیل
5. رزرو دستی با تاریخ، ساعت، ظرفیت واقعی و پلاک ملی؛ رزرو پس از پرداخت مستقیماً تأیید می‌شود
6. نمایش سطح مشتری به صورت نشان و امکان تغییر دستی سطح توسط مدیر
7. جدول مالی خوانا با وضعیت، درگاه، سهم کیف پول و کد پیگیری فارسی
8. مدیریت اسلایدر و بنر با انتخاب تصویر از کتابخانه رسانه
9. کاتالوگ فرم‌محور برای خودرو، خدمات، پکیج، خدمات افزوده، باشگاه، قالب پیامک و اتوماسیون
10. کمپین‌های تخفیف با بازه اعتبار، محدودیت مصرف، سابقه رزرو، امتیاز، سطح باشگاه و کانال اطلاع‌رسانی
11. مدیریت جداگانه مقاله با فهرست، ساخت و ویرایش؛ تصویر شاخص و بلوک‌های تیتر، متن، تصویر و جدول
12. کتابخانه رسانه با بارگذاری امن، پیش‌نمایش، نشانی قابل کپی، ویرایش و حذف
13. تیکت پشتیبانی رشته‌ای؛ تمام پاسخ‌های مشتری و مدیر داخل همان تیکت نگهداری می‌شوند
14. پیامک گروهی و تاریخچه خوانا با اتصال Worker به SMS.ir
15. تنظیم ساعت هفتگی و استثناهای روزانه، تعطیلی، دلیل تعطیلی و بازه‌های نیم‌ساعته
16. لاگ مجزای مدیر، برنامه و امنیت در بازه‌های ۲۴ ساعت، ۳ روز، ۷ روز و ۳۰ روز با کپی یک‌کلیکی

## پیش‌نیازها

- Node.js مطابق `.nvmrc`
- pnpm مطابق `packageManager` در `package.json`
- Docker Desktop با Docker Compose
- پورت‌های آزاد `3000`، `3001`، `5434` و `6380`

## اعمال نسخه روی پایگاه داده فعلی

در PowerShell و از ریشه پروژه اجرا کنید:

```powershell
docker compose -f docker/compose.dev.yml up -d
pnpm install --frozen-lockfile
pnpm --filter api db:generate
pnpm --filter api exec prisma migrate deploy
pnpm --filter api exec prisma migrate status
pnpm --filter api db:seed
pnpm --filter api db:seed:services
pnpm --filter api db:seed:schedule
```

مهاجرت جدید پنل `20260822120000_admin_console_v2` است. این مهاجرت ستون‌های هدف‌گیری کمپین و جدول‌های اعلان مدیر، اشتراک Push و محدودیت‌های نیم‌ساعته برنامه کاری را اضافه می‌کند. پیش از `migrate deploy` از PostgreSQL نسخه پشتیبان بگیرید.

## متغیرهای محیطی ضروری

فایل‌های زیر را از نمونه مربوط به خودشان بسازید:

- `apps/api/.env`
- `apps/web/.env.local`
- `apps/worker/.env`

رمزها و کلیدهای نمونه را در محیط واقعی استفاده نکنید. حداقل موارد زیر باید مقدار واقعی و مستقل داشته باشند:

```dotenv
JWT_ACCESS_SECRET=
JWT_ADMIN_SECRET=
OTP_PEPPER=
MESSAGE_SECRET_ENCRYPTION_KEY=
ADMIN_INITIAL_USERNAME=bestwash_owner
ADMIN_INITIAL_MOBILE=09xxxxxxxxx
ADMIN_INITIAL_EMAIL=admin@example.com
ADMIN_INITIAL_PASSWORD=
```

شماره موبایل مدیر از رابط عمومی پنل قابل تغییر نیست. این شماره فقط از محیط امن استقرار/Seed یا عملیات مستقیم و کنترل‌شده پایگاه داده مدیریت می‌شود. ورود مدیر با نام کاربری و رمز عبور آغاز می‌شود و مرحله دوم همیشه کد شش‌رقمی SMS است.

## SMS.ir

کلید و شناسه قالب‌های زیر باید هم در API و هم در Worker تنظیم شوند:

```dotenv
SMSIR_API_KEY=
SMSIR_TEMPLATE_AUTH_OTP=
SMSIR_TEMPLATE_ADMIN_LOGIN_OTP=
SMSIR_TEMPLATE_ADMIN_BROADCAST=
SMSIR_TEMPLATE_PAYMENT_LINK=
SMSIR_TEMPLATE_BOOKING_CONFIRMED=
SMSIR_TEMPLATE_PICKUP_CODE_OWNER=
SMSIR_TEMPLATE_PICKUP_CODE_DELEGATE=
SMSIR_TEMPLATE_PICKUP_DELEGATE_CHANGED=
SMSIR_TEMPLATE_PICKUP_REMINDER_OWNER=
```

نام پارامترهای قالب را با نگاشت Worker هماهنگ نگه دارید: `Code` برای کدها، `Link` برای لینک پرداخت و `Message` برای پیام آزاد. کدهای محرمانه قبل از ورود به Outbox با AES-256-GCM رمز می‌شوند.

## اعلان لحظه‌ای مدیر و مشتری

یک جفت کلید VAPID بسازید و مقادیر زیر را قرار دهید:

```dotenv
# apps/web/.env.local
NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY=

# apps/api/.env
WEB_PUSH_PUBLIC_KEY=

# apps/worker/.env
WEB_PUSH_PUBLIC_KEY=
WEB_PUSH_PRIVATE_KEY=
WEB_PUSH_SUBJECT=mailto:support@example.com
```

کلید عمومی در هر سه محل باید یکسان باشد. کلید خصوصی فقط در Worker قرار می‌گیرد. Push در مرورگر به اجازه کاربر و در محیط واقعی به HTTPS نیاز دارد.

## پرداخت

این مقادیر مطابق تصمیم پروژه تغییر نکرده‌اند:

```dotenv
PAYMENT_PROVIDER=zarinpal
ZARINPAL_SANDBOX=true
```

برای محیط Sandbox شناسه پذیرنده تست و Callback درست را قرار دهید. تغییر به محیط واقعی فقط پس از دریافت پذیرنده واقعی و انجام تست‌های مالی مجاز است.

## اجرای توسعه

چهار ترمینال VS Code باز کنید:

```powershell
# ترمینال ۱
docker compose -f docker/compose.dev.yml up -d

# ترمینال ۲
pnpm --filter api dev

# ترمینال ۳
pnpm --filter worker dev

# ترمینال ۴
pnpm --filter web dev
```

- برنامه: `http://localhost:3000`
- پنل مدیریت: `http://localhost:3000/admin`
- سلامت API: `http://localhost:3001/api/v1/health`
- مستندات API: `http://localhost:3001/api/v1/docs`

## کنترل نهایی کد

پس از تولید Prisma Client اجرا کنید:

```powershell
pnpm --filter api typecheck
pnpm --filter api test
pnpm --filter api build
pnpm --filter worker typecheck
pnpm --filter worker test
pnpm --filter worker build
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web build
```

## سناریوهای تست پذیرش

1. ورود مدیر با نام کاربری/رمز و دریافت کد مرحله دوم روی موبایل تعریف‌شده
2. ثبت رزرو مشتری، اعلان مدیر، تأیید و رد همراه با بازپرداخت
3. رسیدن خودکار رزرو تأییدشده به «زمان مراجعه»، سپس شروع عملیات و صدور کد تحویل
4. یادآوری عدم تحویل فقط برای مالک و تکمیل نهایی رزرو
5. ثبت رزرو دستی، دریافت لینک پرداخت توسط مشتری و تأیید خودکار بعد از پرداخت
6. تغییر سطح مشتری و مشاهده نشان جدید
7. ساخت کمپین محدود و اطمینان از عدم ارسال به مشتری فاقد شرایط یا بیش از سقف مصرف
8. بارگذاری تصویر، کپی نشانی، استفاده در اسلایدر و مقاله، سپس مشاهده در برنامه مشتری
9. ساخت مقاله پیش‌نویس، افزودن جدول و تصویر، انتشار و مشاهده صفحه جزئیات
10. رفت‌وبرگشت چند پاسخ داخل یک تیکت واحد
11. تعطیل‌کردن یک روز با دلیل و مشاهده دلیل قرمز در انتخاب زمان مشتری و رزرو دستی
12. انتخاب هر بازه لاگ و کپی کامل محتوای همان بخش

در پایان تست، تعداد Jobهای Failed در Redis و رویدادهای پردازش‌نشده Outbox را نیز بررسی کنید.
