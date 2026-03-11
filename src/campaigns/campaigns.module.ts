import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailsModule } from '../emails/emails.module';
import { Template, TemplateSchema } from '../templates/schemas/template.schema';
import { UsersModule } from '../users/users.module';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { CampaignQueueService } from './queues/campaign-queue.service';
import { Campaign, CampaignSchema } from './schemas/campaign.schema';

@Module({
  imports: [
    EmailsModule,
    UsersModule,
    MongooseModule.forFeature([
      { name: Campaign.name, schema: CampaignSchema },
      { name: Template.name, schema: TemplateSchema },
    ]),
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignQueueService],
})
export class CampaignsModule {}
