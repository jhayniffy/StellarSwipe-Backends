import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';
import { MetricPeriod } from '../entities/metric-snapshot.entity';

export class AnalyticsQueryDto {
  @IsOptional()
  @IsEnum(MetricPeriod)
  period?: MetricPeriod;

  @IsISO8601()
  startDate!: string;

  @IsISO8601()
  endDate!: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
