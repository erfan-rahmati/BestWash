import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { requestIdMiddleware } from './common/request-id.middleware';

export function allowedWebOrigins(
  environment = process.env.NODE_ENV,
  configuredOrigins = process.env.WEB_ORIGIN,
): string[] {
  const origins = (configuredOrigins ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (environment !== 'production') {
    origins.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }

  return [...new Set(origins)];
}

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api/v1');

  app.use(requestIdMiddleware);
  app.use(cookieParser());
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (/^\/api\/v1\/(?:auth|admin|customers\/me)(?:\/|$)/.test(request.path)) {
      response.setHeader(
        'Cache-Control',
        'private, no-store, max-age=0, must-revalidate',
      );
      response.setHeader('Pragma', 'no-cache');
      response.setHeader('Expires', '0');
    }
    next();
  });
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());

  app.enableCors({
    // Exact allow-list only. Both loopback spellings are accepted in local
    // development; production remains restricted to validated HTTPS origins.
    origin: allowedWebOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'content-type',
      'authorization',
      'idempotency-key',
      'x-request-id',
    ],
  });

  // API discovery is useful locally, but publishing the complete operation
  // catalogue in production unnecessarily increases the exposed surface.
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('BestWash API')
      .setDescription(
        'Versioned API for the BestWash single-branch booking platform',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(
      'api/v1/docs',
      app,
      SwaggerModule.createDocument(app, swaggerConfig),
      {
        jsonDocumentUrl: 'api/v1/openapi.json',
      },
    );
  }
}
