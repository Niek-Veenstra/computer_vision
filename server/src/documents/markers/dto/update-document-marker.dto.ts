import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export type DocumentMarkerContentType = 'text' | 'inlineMath';

export class DocumentMarkerContentDto {
  @IsIn(['text', 'inlineMath'])
  type: DocumentMarkerContentType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10_000)
  value: string;
}

export class UpdateDocumentMarkerDto {
  @IsUUID()
  operationId: string;

  @IsInt()
  @IsPositive()
  version: number;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => DocumentMarkerContentDto)
  content: DocumentMarkerContentDto[];
}
