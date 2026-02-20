import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateNotificationsTables1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create notifications table
    await queryRunner.createTable(
      new Table({
        name: 'notifications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'varchar',
          },
          {
            name: 'type',
            type: 'enum',
            enum: [
              'TRADE_EXECUTED',
              'TRADE_CLOSED',
              'SIGNAL_TARGET_HIT',
              'SIGNAL_STOP_LOSS',
              'MARKETING',
              'SYSTEM_ALERT',
            ],
          },
          {
            name: 'title',
            type: 'varchar',
          },
          {
            name: 'message',
            type: 'text',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED'],
            default: "'PENDING'",
          },
          {
            name: 'channel',
            type: 'enum',
            enum: ['EMAIL', 'PUSH', 'BOTH'],
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'emailMessageId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'pushMessageId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'sentAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'deliveredAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'errorMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'retryCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    // Create indexes for notifications
    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'IDX_notifications_userId_createdAt',
        columnNames: ['userId', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'IDX_notifications_status_createdAt',
        columnNames: ['status', 'createdAt'],
      }),
    );

    // Create user_push_subscriptions table
    await queryRunner.createTable(
      new Table({
        name: 'user_push_subscriptions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'varchar',
          },
          {
            name: 'endpoint',
            type: 'text',
          },
          {
            name: 'p256dh',
            type: 'text',
          },
          {
            name: 'auth',
            type: 'text',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'userAgent',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'lastUsedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    // Create indexes for push subscriptions
    await queryRunner.createIndex(
      'user_push_subscriptions',
      new TableIndex({
        name: 'IDX_push_subscriptions_userId_isActive',
        columnNames: ['userId', 'isActive'],
      }),
    );

    // Create user_notification_preferences table
    await queryRunner.createTable(
      new Table({
        name: 'user_notification_preferences',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'tradeUpdatesEnabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'tradeUpdatesChannel',
            type: 'enum',
            enum: ['EMAIL', 'PUSH', 'BOTH'],
            default: "'BOTH'",
          },
          {
            name: 'signalPerformanceEnabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'signalPerformanceChannel',
            type: 'enum',
            enum: ['EMAIL', 'PUSH', 'BOTH'],
            default: "'BOTH'",
          },
          {
            name: 'marketingEnabled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'marketingChannel',
            type: 'enum',
            enum: ['EMAIL', 'PUSH', 'BOTH'],
            default: "'EMAIL'",
          },
          {
            name: 'systemAlertsEnabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'systemAlertsChannel',
            type: 'enum',
            enum: ['EMAIL', 'PUSH', 'BOTH'],
            default: "'BOTH'",
          },
          {
            name: 'emailEnabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'pushEnabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'quietHoursStart',
            type: 'time',
            isNullable: true,
          },
          {
            name: 'quietHoursEnd',
            type: 'time',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    // Create index for preferences
    await queryRunner.createIndex(
      'user_notification_preferences',
      new TableIndex({
        name: 'IDX_preferences_userId',
        columnNames: ['userId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_notification_preferences');
    await queryRunner.dropTable('user_push_subscriptions');
    await queryRunner.dropTable('notifications');
  }
}