import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorBody {
  code?: string;
  message?: string | string[];
  error?: string;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request & { requestId?: string }>();
    const response = http.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'خطای پیش‌بینی‌نشده‌ای در سرور رخ داد.' };
    const body: ErrorBody = typeof raw === 'string' ? { message: raw } : raw;
    const rawMessage = Array.isArray(body.message)
      ? body.message.join('، ')
      : (body.message ?? 'خطای پیش‌بینی‌نشده‌ای در سرور رخ داد.');
    const commonTranslations: Array<[RegExp, string]> = [
      [
        /password must be longer than or equal to 8 characters/i,
        'رمز عبور باید حداقل ۸ نویسه داشته باشد.',
      ],
      [/must be an email/i, 'نشانی ایمیل واردشده معتبر نیست.'],
      [/must be a valid ISO 8601 date string/i, 'تاریخ واردشده معتبر نیست.'],
      [/should not be empty|is required/i, 'تکمیل فیلدهای الزامی لازم است.'],
      [/must be a string/i, 'مقدار واردشده باید متنی باشد.'],
      [/must be an array/i, 'ساختار فهرست ارسال‌شده معتبر نیست.'],
      [/not found/i, 'اطلاعات موردنظر پیدا نشد.'],
      [/expired/i, 'مهلت این درخواست به پایان رسیده است.'],
      [/invalid/i, 'اطلاعات واردشده معتبر نیست.'],
    ];
    const translated = commonTranslations.find(([pattern]) =>
      pattern.test(rawMessage),
    );
    const isTechnicalEnglishMessage = Array.from(rawMessage).every(
      (character) =>
        character.charCodeAt(0) <= 127 ||
        character === '،' ||
        character === '؛',
    );
    const message =
      translated?.[1] ??
      (isTechnicalEnglishMessage
        ? status >= 500
          ? 'خطای داخلی سرور رخ داد. لطفاً دوباره تلاش کنید.'
          : 'اطلاعات درخواست معتبر نیست. لطفاً داده‌ها را بررسی کنید.'
        : rawMessage);
    const code =
      body.code ??
      body.error?.toUpperCase().replace(/\s+/g, '_') ??
      (status === 500 ? 'INTERNAL_SERVER_ERROR' : `HTTP_${status}`);

    if (status >= 500) {
      this.logger.error(
        JSON.stringify({
          requestId: request.requestId,
          method: request.method,
          route: request.originalUrl,
          error:
            exception instanceof Error ? exception.message : String(exception),
        }),
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      error: { code, message, requestId: request.requestId ?? null },
    });
  }
}
