# گزارش کنترل کیفیت سورس نهایی

تاریخ بسته‌بندی: ۲۰۲۶-۰۸-۲۲

## کنترل‌های انجام‌شده در محیط بسته‌بندی

| کنترل                                        | نتیجه                                          |
| -------------------------------------------- | ---------------------------------------------- |
| TypeScript برنامه Web                        | موفق، بدون خطا                                 |
| TypeScript برنامه Worker                     | موفق، بدون خطا                                 |
| Transpile نحوی ۷۱ فایل TypeScript API و Seed | موفق، بدون خطای نحوی                           |
| فرمت TypeScript/TSX/CSS و مستندات            | موفق                                           |
| تطبیق Prisma Client داخل فایل‌های ورودی      | نیازمند اجرای `db:generate` پس از دریافت پروژه |

وابستگی‌های استخراج‌شده در محیط بسته‌بندی کامل نبودند؛ در نتیجه Build نهایی Next و Typecheck وابسته به Prisma در این محیط اجراشدنی نبود. این محدودیت مربوط به پوشه‌های موقت `node_modules` است و این پوشه‌ها داخل بسته نهایی قرار نمی‌گیرند.

## کنترل کامل الزامی روی سیستم مقصد

پس از `pnpm install --frozen-lockfile` و اعمال Migration اجرا کنید:

```powershell
pnpm --filter api db:generate
pnpm --filter api exec prisma validate
pnpm --filter api exec prisma migrate status
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

انتظار پروژه موجود ۷ Suite و ۲۲ تست API موفق است. سناریوهای پذیرش ویژگی‌های جدید در `ADMIN_CONSOLE_V2_FA.md` فهرست شده‌اند و باید با PostgreSQL، Redis، API، Worker و Web هم‌زمان اجرا شوند.

تست E2E مخرب فقط باید با دیتابیس جداگانه‌ای به نام دقیق `bestwash_test` اجرا شود؛ اسکریپت Reset روی نام دیگری متوقف می‌شود.
