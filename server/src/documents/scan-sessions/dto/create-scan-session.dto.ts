import { IsUUID } from 'class-validator';

export class CreateScanSessionDto {
  @IsUUID()
  scannerId: string;
}
