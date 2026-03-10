import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import dotenv from 'dotenv';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmailsModule } from './emails/emails.module';
import { TemplatesModule } from './templates/templates.module';

dotenv.config();

const mongoUri = (process.env.MONGODB_URI ?? process.env.DATABASE_URL ?? '').trim();

if (!mongoUri) {
  throw new Error(
    'Missing MongoDB connection string. Set MONGODB_URI or DATABASE_URL in .env',
  );
}

@Module({
  imports: [
    MongooseModule.forRoot(mongoUri),
    EmailsModule,
    TemplatesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
