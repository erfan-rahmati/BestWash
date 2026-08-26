# گزارش سخت‌سازی امنیتی مرورگر و خروجی تولید BestWash

## نتیجه بررسی شواهد

- در متن Console فقط پاسخ‌های `401 Unauthorized` مربوط به مسیرهای حساب مشتری دیده شد. هیچ داده خصوصی، رمز، Secret، رشته اتصال دیتابیس یا Token در متن ارسالی وجود نداشت.
- پوشه‌های `apps/web/src`، React، Next و `node_modules` در تب Sources نتیجه اجرای `next dev` و Source Map توسعه هستند. این نما فقط کد سمت مرورگر را نشان می‌دهد و در Build تولیدی نباید Source Map مرورگر منتشر شود.
- نام درخواست‌های API و مسیرهای Next/RSC در Network قابل مشاهده است و مخفی‌کردن کامل آن‌ها ممکن یا معیار امنیت نیست. سرور باید برای هر مسیر خصوصی احراز هویت و مجوز را مستقل اجرا کند؛ پاسخ‌های `401` نشان می‌دادند این کنترل فعال بوده است.
- در تصاویر، سورس Backend شامل `apps/api`، Prisma، فایل‌های `.env` یا Worker در مرورگر دیده نشد.

## ریسک‌های واقعی که اصلاح شدند

1. Token مشتری و مدیر دیگر داخل JSON پاسخ Login برنمی‌گردد و فقط در Cookie با `HttpOnly` نگهداری می‌شود.
2. Token مدیر از `sessionStorage` حذف شد و پنل مدیریت کاملاً Cookie-only شد.
3. خروج امن مدیر نشست سمت سرور را revoke و Cookie را پاک می‌کند.
4. Swagger و OpenAPI در `production` ساخته/منتشر نمی‌شوند و Nginx نیز مسیرهایشان را `404` می‌کند.
5. Source Map مرورگر در Build تولیدی صریحاً غیرفعال شد؛ Source Map و declarationهای API نیز از خروجی تولید حذف شدند.
6. Docker imageهای Web، API و Worker دیگر سورس خام اختصاصی پروژه را به runtime منتقل نمی‌کنند.
7. Service Worker فقط assetهای عمومی allowlistشده را cache می‌کند و صفحات حساب، ادمین، پرداخت و API را cache نمی‌کند. نام Cache به `v4` تغییر کرد تا Cache قدیمی حذف شود؛ Clone پاسخ نیز پیش از تحویل Body انجام می‌شود تا race مرورگر رخ ندهد.
8. پاسخ‌های Auth، Admin و Customer دارای `no-store` هستند.
9. نرخ درخواست OTP و Login محدود شد و production با Secret کوتاه/تکراری، OTP آزمایشی یا Origin غیر HTTPS بالا نمی‌آید.
10. Headerهای امنیتی مرورگر و Nginx تقویت و ارائه فایل‌های `.map` و dotfileها توسط Nginx مسدود شد.
11. درخواست‌های GET دیگر `Content-Type: application/json` بی‌دلیل ارسال نمی‌کنند؛ Preflightهای اضافی Network کاهش می‌یابد.
12. صفحه اصلی قبل از ورود، اعلان‌ها و رزرو خصوصی را بی‌دلیل درخواست نمی‌کند.
13. کل Web از یک resolver مشترک API استفاده می‌کند؛ در توسعه، `localhost` و `127.0.0.1` همسان‌سازی می‌شوند تا CORS و SameSite Cookie بدون بازکردن Originهای تولید کار کنند.
14. مسیر عمومی `auth/session` وضعیت نشست را همیشه با پاسخ `200` و `no-store` برمی‌گرداند. کلاینت پیش از endpoint خصوصی از همین وضعیت Cacheشده استفاده می‌کند؛ بنابراین مهمان باعث درخواست‌های تکراری `401` در Console/Network نمی‌شود، درحالی‌که Guard سرور همچنان مرجع نهایی مجوز است.
15. Allowlist تولید CORS فقط Originهای HTTPS اعتبارسنجی‌شده را قبول می‌کند؛ دو نام loopback صرفاً خارج از `production` افزوده می‌شوند.
16. خروجی Standalone فقط هنگام Docker build فعال است. Build محلی استاندارد است و با `pnpm --filter web start` بدون هشدار اجرا می‌شود.

## تفاوت اجرای توسعه و تولید

در حالت توسعه:

```powershell
pnpm --filter web dev
```

نمایش نام فایل‌ها، stackهای React، HMR، Turbopack و Source Map طبیعی است. برای ارزیابی چیزی که کاربر واقعی می‌بیند باید Build تولیدی اجرا شود:

```powershell
pnpm --filter web build
pnpm --filter web start
```

## کنترل‌های الزامی بعد از اعمال

```powershell
pnpm --filter api typecheck
pnpm --filter api test
pnpm --filter api build

pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web build

Get-ChildItem "apps\web\.next\static" -Recurse -Filter "*.map"
Get-ChildItem "apps\api\dist" -Recurse -Include "*.map","*.d.ts"
```

دو فرمان آخر باید خروجی خالی داشته باشند.

پس از Deploy تولیدی، این دو مسیر باید `404` باشند:

```text
/api/v1/docs
/api/v1/openapi.json
```

تمام endpointهای خصوصی بدون Cookie معتبر باید همچنان `401` و بدون داده خصوصی پاسخ دهند.

برای تشخیص بی‌سروصدای مهمان، مسیر زیر باید `200` و
`{"data":{"authenticated":false}}` برگرداند:

```text
/api/v1/auth/session
```

وجود نام chunkهای minifyشده، فونت، تصویر، `sw.js` و `(index)` در Sources و
وجود نام endpointهای عمومی در Network اجتناب‌ناپذیر و عادی است. معیار کنترل،
نبودن Source Map، سورس خام Backend/Frontend، Secret و داده خصوصی است؛ نه خالی
بودن این دو تب.
