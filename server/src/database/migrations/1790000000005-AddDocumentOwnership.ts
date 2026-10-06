import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentOwnership1790000000005 implements MigrationInterface {
  name = 'AddDocumentOwnership1790000000005';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "documents" ADD COLUMN "owner_id" uuid
    `);
    await queryRunner.query(`
      UPDATE "documents" SET "owner_id" = "updated_by"
    `);
    await queryRunner.query(`
      ALTER TABLE "documents" ALTER COLUMN "owner_id" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "documents"
      ADD CONSTRAINT "FK_documents_owner_user"
      FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_documents_owner" ON "documents" ("owner_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_documents_owner"');
    await queryRunner.query(
      'ALTER TABLE "documents" DROP CONSTRAINT "FK_documents_owner_user"',
    );
    await queryRunner.query('ALTER TABLE "documents" DROP COLUMN "owner_id"');
  }
}
