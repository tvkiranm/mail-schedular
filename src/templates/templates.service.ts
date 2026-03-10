import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/create-template.dto';
import { Template, TemplateDocument } from './schemas/template.schema';

export type TemplateEntity = Template & { _id: unknown };

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    @InjectModel(Template.name)
    private readonly templateModel: Model<TemplateDocument>,
  ) {}

  private buildFilter(userId?: string): Record<string, unknown> {
    const filter: Record<string, unknown> = { deletedAt: null };
    if (userId) {
      filter.userId = userId;
    }
    return filter;
  }

  async findAll(userId?: string): Promise<TemplateEntity[]> {
    return this.templateModel
      .find(this.buildFilter(userId))
      .lean()
      .exec();
  }

  async create(payload: CreateTemplateDto): Promise<TemplateEntity> {
    const created = await this.templateModel.create(payload);
    this.logger.log(`Template created: ${created._id.toString()}`);
    return created.toObject();
  }

  async findOne(id: string, userId?: string): Promise<TemplateEntity> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid template id');
    }

    const template = await this.templateModel
      .findOne({ _id: id, ...this.buildFilter(userId) })
      .lean()
      .exec();

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async update(
    id: string,
    payload: UpdateTemplateDto,
    userId?: string,
  ): Promise<TemplateEntity> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid template id');
    }

    const updated = await this.templateModel
      .findOneAndUpdate(
        { _id: id, ...this.buildFilter(userId) },
        { $set: payload },
        { returnDocument: 'after' },
      )
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('Template not found');
    }

    this.logger.log(`Template updated: ${id}`);
    return updated;
  }

  async remove(
    id: string,
    userId?: string,
    soft = true,
  ): Promise<{ deleted: boolean }>
  {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid template id');
    }

    if (soft) {
      const result = await this.templateModel
        .findOneAndUpdate(
          { _id: id, ...this.buildFilter(userId) },
          { $set: { deletedAt: new Date() } },
          { returnDocument: 'after' },
        )
        .lean()
        .exec();

      if (!result) {
        throw new NotFoundException('Template not found');
      }

      this.logger.log(`Template soft-deleted: ${id}`);
      return { deleted: true };
    }

    const result = await this.templateModel
      .deleteOne({ _id: id, ...(userId ? { userId } : {}) })
      .exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Template not found');
    }

    this.logger.log(`Template hard-deleted: ${id}`);
    return { deleted: true };
  }
}
