import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('compliance_logs')
export class ComplianceLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  type!: 'access_blocked' | 'access_allowed' | 'sanctions_hit';

  @Column({ name: 'ip_address', type: 'varchar', length: 45 })
  @Index()
  ipAddress!: string;

  @Column({ name: 'country_code', type: 'varchar', length: 2, nullable: true })
  countryCode?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  path?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  method?: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  @Index()
  userId?: string;

  @Column({ name: 'wallet_address', type: 'varchar', length: 100, nullable: true })
  @Index()
  walletAddress?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt!: Date;
}