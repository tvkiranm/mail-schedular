import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { fromZonedTime } from 'date-fns-tz';
import { isValidObjectId, Model } from 'mongoose';
import { Template, TemplateDocument } from '../templates/schemas/template.schema';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/create-campaign.dto';
import { Campaign, CampaignDocument, CampaignStatus } from './schemas/campaign.schema';
import { CampaignQueueService } from './queues/campaign-queue.service';
import { UsersService } from '../users/users.service';

export type CampaignEntity = Campaign & { _id: unknown };

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    @InjectModel(Campaign.name)
    private readonly campaignModel: Model<CampaignDocument>,
    @InjectModel(Template.name)
    private readonly templateModel: Model<TemplateDocument>,
    private readonly queueService: CampaignQueueService,
    private readonly usersService: UsersService,
  ) {}

  private buildFilter(userId?: string): Record<string, unknown> {
    const filter: Record<string, unknown> = { deletedAt: null };
    if (userId) {
      filter.userId = userId;
    }
    return filter;
  }

  private resolveScheduleDate(scheduledFor: string, timezone?: string): Date {
    const date = timezone
      ? fromZonedTime(scheduledFor, timezone)
      : new Date(scheduledFor);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid scheduledFor date');
    }
    return date;
  }

  private computeDelayMs(date: Date): number {
    return Math.max(0, date.getTime() - Date.now());
  }

  private async resolveUserTimezone(userId?: string): Promise<string | undefined> {
    if (!userId) {
      return undefined;
    }
    try {
      const user = await this.usersService.findById(userId);
      return user.timezone;
    } catch {
      return undefined;
    }
  }

  async findAll(userId?: string): Promise<CampaignEntity[]> {
    return this.campaignModel.find(this.buildFilter(userId)).lean().exec();
  }

  async create(payload: CreateCampaignDto): Promise<CampaignEntity> {
    if (!isValidObjectId(payload.templateId)) {
      throw new BadRequestException('Invalid template id');
    }

    const template = await this.templateModel
      .findOne({ _id: payload.templateId, deletedAt: null })
      .lean()
      .exec();
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const effectiveTimezone =
      payload.timezone ?? (await this.resolveUserTimezone(payload.userId));
    const scheduledFor = payload.scheduledFor
      ? this.resolveScheduleDate(payload.scheduledFor, effectiveTimezone)
      : null;

    const created = await this.campaignModel.create({
      ...payload,
      timezone: effectiveTimezone,
      scheduledFor,
      status: scheduledFor ? CampaignStatus.SCHEDULED : CampaignStatus.DRAFT,
    });

    if (scheduledFor) {
      const delayMs = this.computeDelayMs(scheduledFor);
      const jobId = await this.queueService.enqueueCampaign(
        created._id.toString(),
        delayMs,
      );
      await this.campaignModel.updateOne(
        { _id: created._id },
        {
          $set: {
            jobId,
            status: delayMs > 0 ? CampaignStatus.SCHEDULED : CampaignStatus.QUEUED,
          },
        },
      );

      const refreshed = await this.campaignModel
        .findById(created._id)
        .lean()
        .exec();
      if (refreshed) {
        this.logger.log(`Campaign created: ${created._id.toString()}`);
        return refreshed;
      }
    }

    this.logger.log(`Campaign created: ${created._id.toString()}`);
    return created.toObject();
  }

  async findOne(id: string, userId?: string): Promise<CampaignEntity> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid campaign id');
    }

    const campaign = await this.campaignModel
      .findOne({ _id: id, ...this.buildFilter(userId) })
      .lean()
      .exec();

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async update(
    id: string,
    payload: UpdateCampaignDto,
    userId?: string,
  ): Promise<CampaignEntity> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid campaign id');
    }

    if (payload.templateId) {
      if (!isValidObjectId(payload.templateId)) {
        throw new BadRequestException('Invalid template id');
      }
      const template = await this.templateModel
        .findOne({ _id: payload.templateId, deletedAt: null })
        .lean()
        .exec();
      if (!template) {
        throw new NotFoundException('Template not found');
      }
    }

    const current = await this.campaignModel
      .findOne({ _id: id, ...this.buildFilter(userId) })
      .exec();

    if (!current) {
      throw new NotFoundException('Campaign not found');
    }

    const updatePayload: Record<string, unknown> = { ...payload };

    if (payload.scheduledFor !== undefined) {
      if (payload.scheduledFor === null) {
        if (current.jobId) {
          await this.queueService.cancelJob(current.jobId);
        }
        updatePayload.scheduledFor = null;
        updatePayload.jobId = null;
        updatePayload.status = CampaignStatus.CANCELLED;
      } else {
        const effectiveTimezone =
          payload.timezone ??
          current.timezone ??
          (await this.resolveUserTimezone(userId));
        const scheduledFor = this.resolveScheduleDate(
          payload.scheduledFor,
          effectiveTimezone,
        );
        const delayMs = this.computeDelayMs(scheduledFor);
        if (current.jobId) {
          await this.queueService.cancelJob(current.jobId);
        }
        const jobId = await this.queueService.enqueueCampaign(id, delayMs);
        updatePayload.scheduledFor = scheduledFor;
        updatePayload.jobId = jobId;
        if (!payload.timezone && effectiveTimezone) {
          updatePayload.timezone = effectiveTimezone;
        }
        updatePayload.status =
          delayMs > 0 ? CampaignStatus.SCHEDULED : CampaignStatus.QUEUED;
      }
    }

    const updated = await this.campaignModel
      .findOneAndUpdate(
        { _id: id, ...this.buildFilter(userId) },
        { $set: updatePayload },
        { returnDocument: 'after' },
      )
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('Campaign not found');
    }

    this.logger.log(`Campaign updated: ${id}`);
    return updated;
  }

  async remove(
    id: string,
    userId?: string,
    soft = true,
  ): Promise<{ deleted: boolean }> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid campaign id');
    }

    const campaign = await this.campaignModel
      .findOne({ _id: id, ...this.buildFilter(userId) })
      .lean()
      .exec();

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.jobId) {
      await this.queueService.cancelJob(campaign.jobId);
    }

    if (soft) {
      await this.campaignModel
        .updateOne(
          { _id: id },
          { $set: { deletedAt: new Date() } },
        )
        .exec();

      this.logger.log(`Campaign soft-deleted: ${id}`);
      return { deleted: true };
    }

    await this.campaignModel.deleteOne({ _id: id }).exec();
    this.logger.log(`Campaign hard-deleted: ${id}`);
    return { deleted: true };
  }

  async sendNow(id: string, userId?: string): Promise<CampaignEntity> {
    const campaign = await this.findOne(id, userId);
    if (campaign.jobId) {
      await this.queueService.cancelJob(campaign.jobId);
    }
    const delayMs = 0;
    const jobId = await this.queueService.enqueueCampaign(id, delayMs);

    const updated = await this.campaignModel
      .findOneAndUpdate(
        { _id: id, ...this.buildFilter(userId) },
        {
          $set: {
            jobId,
            scheduledFor: null,
            status: CampaignStatus.QUEUED,
          },
        },
        { returnDocument: 'after' },
      )
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('Campaign not found');
    }

    this.logger.log(`Campaign queued: ${id}`);
    return updated;
  }

  async cancelSchedule(id: string, userId?: string): Promise<CampaignEntity> {
    const campaign = await this.findOne(id, userId);
    if (campaign.jobId) {
      await this.queueService.cancelJob(campaign.jobId);
    }

    const updated = await this.campaignModel
      .findOneAndUpdate(
        { _id: id, ...this.buildFilter(userId) },
        {
          $set: {
            jobId: null,
            scheduledFor: null,
            status: CampaignStatus.CANCELLED,
          },
        },
        { returnDocument: 'after' },
      )
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('Campaign not found');
    }

    this.logger.log(`Campaign schedule cancelled: ${id}`);
    return updated;
  }
}
