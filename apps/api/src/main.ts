import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  configureApp(app);

  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3001);

  await app.listen(port, '0.0.0.0');

  logger.log(`BestWash API: http://localhost:${port}/api/v1`);
}

void bootstrap();
