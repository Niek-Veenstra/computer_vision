import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateScanners1790000000001 implements MigrationInterface {
  name = 'CreateScanners1790000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "scanners" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "owner_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "name" varchar(100) NOT NULL,
        "key_hash" char(64) NOT NULL UNIQUE,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "last_seen_at" timestamptz,
        "revoked_at" timestamptz
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_scanners_owner_id" ON "scanners" ("owner_id")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "scanners"');
  }
}
