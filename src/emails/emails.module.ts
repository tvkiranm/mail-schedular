import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailsController } from './emails.controller';
import { EmailsService } from './emails.service';
import { EmailLog, EmailLogSchema } from './schemas/email-log.schema';
import { Template, TemplateSchema } from '../templates/schemas/template.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmailLog.name, schema: EmailLogSchema },
      { name: Template.name, schema: TemplateSchema },
    ]),
  ],
  controllers: [EmailsController],
  providers: [EmailsService],
})
export class EmailsModule {}
