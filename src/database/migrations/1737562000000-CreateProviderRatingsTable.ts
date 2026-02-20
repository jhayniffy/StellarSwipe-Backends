import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateProviderRatingsTable1737562000000 implements MigrationInterface {
  name = 'CreateProviderRatingsTable1737562000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'provider_ratings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'provider_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'stars',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'review',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_provider_ratings_user_id" ON "provider_ratings" ("user_id")`
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_provider_ratings_provider_id" ON "provider_ratings" ("provider_id")`
    );

    // Create unique constraint on user_id + provider_id
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_provider_ratings_user_provider" ON "provider_ratings" ("user_id", "provider_id")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('provider_ratings');
  }
}