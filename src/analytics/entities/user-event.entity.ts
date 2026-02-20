import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum UserEventType {
  SIGNAL_VIEW = 'SIGNAL_VIEW',
  SWIPE_RIGHT = 'SWIPE_RIGHT',
  SWIPE_LEFT = 'SWIPE_LEFT',
  TRADE_EXECUTED = 'TRADE_EXECUTED',
}

@Entity('user_events')
@Index(['occurredAt'])
@Index(['userId', 'occurredAt'])
@Index(['eventType', 'occurredAt'])
@Index('idx_user_events_event_id', ['eventId'], { unique: true, where: '"event_id" IS NOT NULL' })
export class UserEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'event_id', type: 'varchar', length: 128, nullable: true })
  eventId?: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  @Column({ name: 'session_id', type: 'varchar', length: 128, nullable: true })
  sessionId?: string;

  @Column({ name: 'event_type', type: 'enum', enum: UserEventType })
  eventType!: UserEventType;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt!: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
