import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocuments1726900000000 implements MigrationInterface {
  name = 'CreateDocuments1726900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" text NOT NULL,
        "content" jsonb NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "updated_by" uuid NOT NULL,
        CONSTRAINT "FK_documents_updated_by_user"
          FOREIGN KEY ("updated_by") REFERENCES "user"("id") ON DELETE RESTRICT
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "documents"');
  }
}
