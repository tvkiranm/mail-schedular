import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { render } from '@react-email/render';
import Handlebars from 'handlebars';
import mjml2html from 'mjml';
import { Resend } from 'resend';
import React from 'react';
import { isValidObjectId, Model, Types } from 'mongoose';
import { SendTestDto } from './dto/send-test.dto';
import { EmailLog, EmailLogDocument, EmailStatus } from './schemas/email-log.schema';
import { Template, TemplateDocument } from '../templates/schemas/template.schema';

export type EmailSendResult = {
  status: EmailStatus;
  logId: string;
  providerId?: string;
};

@Injectable()
export class EmailsService {
  private readonly logger = new Logger(EmailsService.name);

  constructor(
    @InjectModel(Template.name)
    private readonly templateModel: Model<TemplateDocument>,
    @InjectModel(EmailLog.name)
    private readonly emailLogModel: Model<EmailLogDocument>,
  ) {}

  private buildTestVariables(content: string): Record<string, string> {
    const variables: Record<string, string> = {};
    const regex = /{{\s*([\w.-]+)\s*}}/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      variables[match[1]] = 'Test User';
    }

    return variables;
  }

  private async renderHtml(rawHtml: string): Promise<string> {
    const component = React.createElement('div', {
      dangerouslySetInnerHTML: { __html: rawHtml },
    });

    return render(component, { pretty: true });
  }

  async sendTest(payload: SendTestDto): Promise<EmailSendResult> {
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

    const htmlSource = template.htmlContent ?? '';
    if (!htmlSource.trim()) {
      throw new BadRequestException('Template has no htmlContent');
    }

    const defaults = this.buildTestVariables(htmlSource);
    const compiled = Handlebars.compile(htmlSource)(defaults);

    const mjmlResult = mjml2html(compiled, { validationLevel: 'soft' });
    const emailSafeHtml = mjmlResult.errors?.length
      ? compiled
      : mjmlResult.html;

    const finalHtml = await this.renderHtml(emailSafeHtml);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new BadRequestException('RESEND_API_KEY is not set');
    }

    const resend = new Resend(apiKey);
    const subject = payload.subject ?? `Test Email: ${template.name}`;
    const from = process.env.RESEND_FROM ?? 'onboarding@resend.dev';

    try {
      const response = await resend.emails.send({
        from,
        to: payload.to,
        subject,
        html: finalHtml,
      });

      const log = await this.emailLogModel.create({
        templateId: new Types.ObjectId(payload.templateId),
        to: payload.to,
        subject,
        status: EmailStatus.SENT,
        providerId: response.data?.id,
        meta: response,
      });

      this.logger.log(`Test email sent: ${log._id.toString()}`);

      return {
        status: EmailStatus.SENT,
        logId: log._id.toString(),
        providerId: response.data?.id,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Send failed';

      const log = await this.emailLogModel.create({
        templateId: new Types.ObjectId(payload.templateId),
        to: payload.to,
        subject,
        status: EmailStatus.FAILED,
        errorMessage: message,
      });

      this.logger.error(`Test email failed: ${log._id.toString()} - ${message}`);

      return {
        status: EmailStatus.FAILED,
        logId: log._id.toString(),
      };
    }
  }
}
