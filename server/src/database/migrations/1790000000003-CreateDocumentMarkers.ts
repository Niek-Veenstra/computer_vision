import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocumentMarkers1790000000003 implements MigrationInterface {
  name = 'CreateDocumentMarkers1790000000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "document_markers" (
        "id" uuid PRIMARY KEY,
        "document_id" uuid NOT NULL,
        "label" varchar(200),
        "last_operation_id" uuid UNIQUE,
        "last_request_hash" char(64),
        "result_version" integer,
        "updated_by" uuid,
        "scanner_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_document_markers_document"
          FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_document_markers_updated_by_user"
          FOREIGN KEY ("updated_by") REFERENCES "user"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_document_markers_scanner"
          FOREIGN KEY ("scanner_id") REFERENCES "scanners"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_document_markers_document"
      ON "document_markers" ("document_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "document_markers"');
  }
}
