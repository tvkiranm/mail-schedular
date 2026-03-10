import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { TemplateStatus } from '../schemas/template.schema';

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsObject()
  designJson?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  htmlContent?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  variables?: string[];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  userId?: string;

  @IsOptional()
  @IsEnum(TemplateStatus)
  status?: TemplateStatus;
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsObject()
  designJson?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  htmlContent?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  variables?: string[];

  @IsOptional()
  @IsEnum(TemplateStatus)
  status?: TemplateStatus;
}
