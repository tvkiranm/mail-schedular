import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/create-campaign.dto';
import { CampaignEntity, CampaignsService } from './campaigns.service';

@Controller('api/campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  async findAll(@Query('userId') userId?: string): Promise<CampaignEntity[]> {
    return this.campaignsService.findAll(userId);
  }

  @Post()
  async create(@Body() payload: CreateCampaignDto): Promise<CampaignEntity> {
    return this.campaignsService.create(payload);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ): Promise<CampaignEntity> {
    return this.campaignsService.findOne(id, userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() payload: UpdateCampaignDto,
    @Query('userId') userId?: string,
  ): Promise<CampaignEntity> {
    return this.campaignsService.update(id, payload, userId);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Query('userId') userId?: string,
    @Query('soft') soft?: string,
  ): Promise<{ deleted: boolean }> {
    const softDelete = soft !== 'false';
    return this.campaignsService.remove(id, userId, softDelete);
  }

  @Post(':id/send')
  async sendNow(
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ): Promise<CampaignEntity> {
    return this.campaignsService.sendNow(id, userId);
  }

  @Delete(':id/schedule')
  async cancelSchedule(
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ): Promise<CampaignEntity> {
    return this.campaignsService.cancelSchedule(id, userId);
  }
}
