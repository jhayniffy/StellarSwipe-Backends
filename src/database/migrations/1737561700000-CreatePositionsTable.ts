import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreatePositionsTable1737561700000 implements MigrationInterface {
  name = 'CreatePositionsTable1737561700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'positions',
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
            name: 'trade_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'base_asset',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'counter_asset',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'side',
            type: 'enum',
            enum: ['buy', 'sell'],
            isNullable: false,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 18,
            scale: 8,
            isNullable: false,
          },
          {
            name: 'entry_price',
            type: 'decimal',
            precision: 18,
            scale: 8,
            isNullable: false,
          },
          {
            name: 'current_price',
            type: 'decimal',
            precision: 18,
            scale: 8,
            isNullable: false,
          },
          {
            name: 'unrealized_pnl',
            type: 'decimal',
            precision: 18,
            scale: 8,
            default: '0',
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
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
      `CREATE INDEX "IDX_positions_user_id" ON "positions" ("user_id")`
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_positions_trade_id" ON "positions" ("trade_id")`
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_positions_is_active" ON "positions" ("is_active")`
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_positions_user_active" ON "positions" ("user_id", "is_active")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('positions');
  }
}