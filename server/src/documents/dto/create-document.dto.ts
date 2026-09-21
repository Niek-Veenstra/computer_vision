import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsObject()
  content: Record<string, unknown>;
}
