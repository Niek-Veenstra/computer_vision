import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserLogo1790000000002 implements MigrationInterface {
  name = 'AddUserLogo1790000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "user" ADD COLUMN "logo_data_url" text',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "user" DROP COLUMN "logo_data_url"');
  }
}
