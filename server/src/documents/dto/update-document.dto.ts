import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsPositive,
  IsString,
  ValidateIf,
} from 'class-validator';

export class UpdateDocumentDto {
  @IsInt()
  @IsPositive()
  version: number;

  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsObject()
  content?: Record<string, unknown>;
}
