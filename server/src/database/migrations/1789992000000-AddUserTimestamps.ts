import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserTimestamps1789992000000 implements MigrationInterface {
  name = 'AddUserTimestamps1789992000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
        ADD COLUMN "created_at" timestamptz NOT NULL DEFAULT now(),
        ADD COLUMN "updated_at" timestamptz NOT NULL DEFAULT now()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
        DROP COLUMN "updated_at",
        DROP COLUMN "created_at"
    `);
  }
}
