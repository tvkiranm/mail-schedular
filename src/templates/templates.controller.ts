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
import { CreateTemplateDto, UpdateTemplateDto } from './dto/create-template.dto';
import { TemplateEntity, TemplatesService } from './templates.service';

@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  async findAll(@Query('userId') userId?: string): Promise<TemplateEntity[]> {
    return this.templatesService.findAll(userId);
  }

  @Post()
  async create(@Body() payload: CreateTemplateDto): Promise<TemplateEntity> {
    return this.templatesService.create(payload);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Query('userId') userId?: string,
  ): Promise<TemplateEntity> {
    return this.templatesService.findOne(id, userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() payload: UpdateTemplateDto,
    @Query('userId') userId?: string,
  ): Promise<TemplateEntity> {
    return this.templatesService.update(id, payload, userId);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Query('userId') userId?: string,
    @Query('soft') soft?: string,
  ): Promise<{ deleted: boolean }> {
    const softDelete = soft !== 'false';
    return this.templatesService.remove(id, userId, softDelete);
  }
}
