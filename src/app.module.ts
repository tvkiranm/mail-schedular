import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import dotenv from 'dotenv';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { EmailsModule } from './emails/emails.module';
import { TemplatesModule } from './templates/templates.module';
import { UsersModule } from './users/users.module';

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
    UsersModule,
    AuthModule,
    CampaignsModule,
    EmailsModule,
    TemplatesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
