import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type TemplateDocument = HydratedDocument<Template>;

export enum TemplateStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

@Schema({ timestamps: true })
export class Template {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  designJson?: Record<string, unknown>;

  @Prop({ default: '' })
  htmlContent?: string;

  @Prop({ type: [String], default: [] })
  variables?: string[];

  @Prop({ index: true })
  userId?: string;

  @Prop({ enum: TemplateStatus, default: TemplateStatus.DRAFT })
  status: TemplateStatus;

  @Prop({ type: Date, default: null })
  deletedAt?: Date | null;

  _id: Types.ObjectId;
}

export const TemplateSchema = SchemaFactory.createForClass(Template);
