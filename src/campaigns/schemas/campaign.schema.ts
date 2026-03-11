import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CampaignDocument = HydratedDocument<Campaign>;

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  QUEUED = 'QUEUED',
  SENDING = 'SENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true })
export class Campaign {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'Template', required: true, index: true })
  templateId: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  recipients: string[];

  @Prop()
  subject?: string;

  @Prop()
  from?: string;

  @Prop()
  timezone?: string;

  @Prop({ type: Date, default: null })
  scheduledFor?: Date | null;

  @Prop({ enum: CampaignStatus, default: CampaignStatus.DRAFT })
  status: CampaignStatus;

  @Prop({ type: Date, default: null })
  lastSentAt?: Date | null;

  @Prop()
  jobId?: string;

  @Prop({ index: true })
  userId?: string;

  @Prop({ type: Date, default: null })
  deletedAt?: Date | null;

  _id: Types.ObjectId;
}

export const CampaignSchema = SchemaFactory.createForClass(Campaign);
