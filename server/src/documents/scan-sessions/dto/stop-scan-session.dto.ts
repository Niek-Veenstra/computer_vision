import { Equals } from 'class-validator';
import { ScanSessionStatus } from '../scan-session.entity';

export class StopScanSessionDto {
  @Equals(ScanSessionStatus.Completed)
  status: ScanSessionStatus.Completed;
}
