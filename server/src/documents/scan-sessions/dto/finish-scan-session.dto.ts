import { IsIn } from 'class-validator';
import { ScanSessionStatus } from '../scan-session.entity';

export class FinishScanSessionDto {
  @IsIn([ScanSessionStatus.Completed, ScanSessionStatus.Cancelled])
  status: ScanSessionStatus.Completed | ScanSessionStatus.Cancelled;
}
