import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

@Entity('provider_earnings')
@Index(['providerId', 'createdAt'])
@Index(['signalId'])
@Index(['tradeId'], { unique: true })
export class ProviderEarning {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  providerId: string;

  @Column({ type: 'uuid' })
  signalId: string;

  @Column({ type: 'uuid' })
  tradeId: string;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  tradedAmount: number;

  @Column({ type: 'varchar', length: 10 })
  asset: string;

  @Column({ type: 'boolean', default: false })
  isPaidOut: boolean;

  @Column({ type: 'uuid', nullable: true })
  payoutId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
