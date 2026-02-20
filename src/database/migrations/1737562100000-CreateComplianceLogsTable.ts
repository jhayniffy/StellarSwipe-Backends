import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateComplianceLogsTable1737562100000 implements MigrationInterface {
  name = 'CreateComplianceLogsTable1737562100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'compliance_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: false,
          },
          {
            name: 'country_code',
            type: 'varchar',
            length: '2',
            isNullable: true,
          },
          {
            name: 'reason',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'path',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'method',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'wallet_address',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_compliance_logs_type" ON "compliance_logs" ("type")`
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_compliance_logs_ip_address" ON "compliance_logs" ("ip_address")`
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_compliance_logs_user_id" ON "compliance_logs" ("user_id")`
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_compliance_logs_wallet_address" ON "compliance_logs" ("wallet_address")`
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_compliance_logs_created_at" ON "compliance_logs" ("created_at")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('compliance_logs');
  }
}