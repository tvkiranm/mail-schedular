import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import dotenv from 'dotenv';
import { AppModule } from './app.module';

async function bootstrap() {
  dotenv.config();
  const logger = new Logger('Bootstrap');
  if (process.env.MONGODB_URI || process.env.DATABASE_URL) {
    const rawUri = process.env.MONGODB_URI ?? process.env.DATABASE_URL ?? '';
    const scheme = rawUri.split(':')[0] ?? '';
    logger.log(`MongoDB URI scheme: ${scheme}`);
  }
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
