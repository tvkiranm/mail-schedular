import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Queue, Worker, Job } from 'bullmq';
import { Model } from 'mongoose';
import { EmailsService } from '../../emails/emails.service';
import { EmailStatus } from '../../emails/schemas/email-log.schema';
import { Template, TemplateDocument } from '../../templates/schemas/template.schema';
import { Campaign, CampaignDocument, CampaignStatus } from '../schemas/campaign.schema';
import { createRedisConnection } from './redis.connection';

const CAMPAIGN_QUEUE_NAME = 'campaigns';

@Injectable()
export class CampaignQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CampaignQueueService.name);
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    @InjectModel(Campaign.name)
    private readonly campaignModel: Model<CampaignDocument>,
    @InjectModel(Template.name)
    private readonly templateModel: Model<TemplateDocument>,
    private readonly emailsService: EmailsService,
  ) {}

  onModuleInit(): void {
    this.logger.log('Initializing campaign queue');
    const connection = createRedisConnection();
    this.queue = new Queue(CAMPAIGN_QUEUE_NAME, { connection });
    this.worker = new Worker(
      CAMPAIGN_QUEUE_NAME,
      async (job) => this.processJob(job),
      { connection },
    );
    this.logger.log('Campaign queue initialized');

    this.worker.on('failed', (job, err) => {
      const jobId = job?.id ? job.id.toString() : 'unknown';
      this.logger.error(`Campaign job failed: ${jobId} - ${err.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }

  async enqueueCampaign(campaignId: string, delayMs = 0): Promise<string> {
    if (!this.queue) {
      throw new Error('Campaign queue not initialized');
    }

    const job = await this.queue.add(
      'send-campaign',
      { campaignId },
      {
        delay: delayMs > 0 ? delayMs : 0,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return job.id?.toString() ?? '';
  }

  getQueue(): Queue {
    if (!this.queue) {
      throw new Error('Campaign queue not initialized');
    }
    return this.queue;
  }

  async cancelJob(jobId: string): Promise<void> {
    if (!this.queue) {
      throw new Error('Campaign queue not initialized');
    }
    if (!jobId) {
      return;
    }
    await this.queue.remove(jobId);
  }

  private async processJob(job: Job): Promise<void> {
    const campaignId = (job.data?.campaignId as string | undefined) ?? '';
    if (!campaignId) {
      this.logger.warn('Campaign job missing campaignId');
      return;
    }

    const campaign = await this.campaignModel.findOne({ _id: campaignId }).exec();
    if (!campaign || campaign.deletedAt) {
      this.logger.warn(`Campaign not found or deleted: ${campaignId}`);
      return;
    }

    await this.campaignModel.updateOne(
      { _id: campaignId },
      {
        $set: {
          status: CampaignStatus.SENDING,
          jobId: null,
          scheduledFor: null,
        },
      },
    );

    const template = await this.templateModel
      .findOne({ _id: campaign.templateId, deletedAt: null })
      .lean()
      .exec();

    if (!template) {
      await this.campaignModel.updateOne(
        { _id: campaignId },
        { $set: { status: CampaignStatus.FAILED } },
      );
      throw new Error('Template not found for campaign');
    }

    const recipients = campaign.recipients ?? [];
    let failedCount = 0;

    for (const recipient of recipients) {
      const result = await this.emailsService.sendCampaignEmail({
        template,
        to: recipient,
        subject: campaign.subject,
        from: campaign.from,
      });
      if (result.status === EmailStatus.FAILED) {
        failedCount += 1;
      }
    }

    await this.campaignModel.updateOne(
      { _id: campaignId },
      {
        $set: {
          status: failedCount > 0 ? CampaignStatus.FAILED : CampaignStatus.SENT,
          lastSentAt: new Date(),
        },
      },
    );
  }
}
