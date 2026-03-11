import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import dotenv from 'dotenv';
import { AppModule } from './app.module';
import { CampaignQueueService } from './campaigns/queues/campaign-queue.service';

async function bootstrap() {
  dotenv.config();
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  await app.listen(process.env.PORT ?? 3000);

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  const campaignQueue = app.get(CampaignQueueService);

  createBullBoard({
    queues: [new BullMQAdapter(campaignQueue.getQueue())],
    serverAdapter,
  });

  app.use('/admin/queues', serverAdapter.getRouter());

  logger.log('Bull Board mounted at http://localhost:3000/admin/queues');
}
bootstrap();