import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('document_markers')
export class DocumentMarker {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  label: string | null;

  @Column({
    name: 'last_operation_id',
    type: 'uuid',
    nullable: true,
    unique: true,
  })
  lastOperationId: string | null;

  @Column({
    name: 'last_request_hash',
    type: 'char',
    length: 64,
    nullable: true,
  })
  lastRequestHash: string | null;

  @Column({ name: 'result_version', type: 'integer', nullable: true })
  resultVersion: number | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedById: string | null;

  @Column({ name: 'scanner_id', type: 'uuid', nullable: true })
  scannerId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
