import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateScanSessions1790000000004 implements MigrationInterface {
  name = 'CreateScanSessions1790000000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "scan_sessions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "document_id" uuid NOT NULL,
        "scanner_id" uuid NOT NULL,
        "created_by" uuid NOT NULL,
        "status" varchar(20) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "completed_at" timestamptz,
        CONSTRAINT "FK_scan_sessions_document"
          FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_scan_sessions_scanner"
          FOREIGN KEY ("scanner_id") REFERENCES "scanners"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_scan_sessions_created_by_user"
          FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_scan_sessions_status"
          CHECK ("status" IN ('active', 'completed', 'cancelled'))
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_scan_sessions_active_scanner"
      ON "scan_sessions" ("scanner_id") WHERE "status" = 'active'
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_scan_sessions_document"
      ON "scan_sessions" ("document_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "scan_sessions"');
  }
}
