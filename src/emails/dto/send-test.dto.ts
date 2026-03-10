import { IsEmail, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendTestDto {
  @IsMongoId()
  @IsNotEmpty()
  templateId: string;

  @IsEmail()
  @IsNotEmpty()
  to: string;

  @IsOptional()
  @IsString()
  subject?: string;
}
