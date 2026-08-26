import { BadRequestException } from '@nestjs/common';
import { maskMobile, normalizeIranianMobile } from './mobile';

describe('Iranian mobile normalization', () => {
  it.each([
    ['09121234567', '+989121234567'],
    ['+98 912 123 4567', '+989121234567'],
    ['00989121234567', '+989121234567'],
    ['۹۱۲۱۲۳۴۵۶۷', '+989121234567'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeIranianMobile(input)).toBe(expected);
  });

  it('rejects invalid numbers', () => {
    expect(() => normalizeIranianMobile('12345')).toThrow(BadRequestException);
  });

  it('masks stored canonical numbers', () => {
    expect(maskMobile('+989121234567')).toBe('+9891***567');
  });
});
