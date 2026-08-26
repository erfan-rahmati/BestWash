import { BadRequestException } from '@nestjs/common';

export function normalizeIranianMobile(value: string): string {
  const digits = value
    .trim()
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[\s()-]/g, '');
  const national = digits
    .replace(/^0098/, '0')
    .replace(/^\+98/, '0')
    .replace(/^98/, '0')
    .replace(/^9(?=\d{9}$)/, '09');

  if (!/^09\d{9}$/.test(national)) {
    throw new BadRequestException({
      code: 'MOBILE_INVALID',
      message: 'شماره موبایل معتبر ایرانی وارد کنید.',
    });
  }

  return `+98${national.slice(1)}`;
}

export function maskMobile(mobile: string): string {
  return `${mobile.slice(0, 5)}***${mobile.slice(-3)}`;
}
