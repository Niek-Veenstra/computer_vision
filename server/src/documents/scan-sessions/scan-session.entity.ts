import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ScanSessionStatus {
  Active = 'active',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

@Entity('scan_sessions')
export class ScanSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Column({ name: 'scanner_id', type: 'uuid' })
  scannerId: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdById: string;

  @Column({ type: 'varchar', length: 20 })
  status: ScanSessionStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
