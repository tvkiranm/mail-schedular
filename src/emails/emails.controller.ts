import { Body, Controller, Post } from '@nestjs/common';
import { SendTestDto } from './dto/send-test.dto';
import { EmailsService, EmailSendResult } from './emails.service';

@Controller('api/email')
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

  @Post('send-test')
  async sendTest(@Body() payload: SendTestDto): Promise<EmailSendResult> {
    return this.emailsService.sendTest(payload);
  }
}
