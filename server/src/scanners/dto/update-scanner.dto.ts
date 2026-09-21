import { Equals, IsBoolean } from 'class-validator';

export class UpdateScannerDto {
  @IsBoolean()
  @Equals(true)
  revoked!: true;
}
