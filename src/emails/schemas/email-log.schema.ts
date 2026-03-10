import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EmailLogDocument = HydratedDocument<EmailLog>;

export enum EmailStatus {
  SENT = 'SENT',
  FAILED = 'FAILED',
}

@Schema({ timestamps: true })
export class EmailLog {
  @Prop({ type: Types.ObjectId, ref: 'Template', required: true, index: true })
  templateId: Types.ObjectId;

  @Prop({ required: true, index: true })
  to: string;

  @Prop({ enum: EmailStatus, required: true })
  status: EmailStatus;

  @Prop()
  subject?: string;

  @Prop()
  providerId?: string;

  @Prop()
  errorMessage?: string;

  @Prop({ type: Object })
  meta?: Record<string, unknown>;
}

export const EmailLogSchema = SchemaFactory.createForClass(EmailLog);
