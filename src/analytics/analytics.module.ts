import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { UserEvent } from './entities/user-event.entity';
import { MetricSnapshot } from './entities/metric-snapshot.entity';
import { RiskMetricsService } from './services/risk-metrics.service';
import { StatisticalAnalysisService } from './services/statistical-analysis.service';
import { AttributionService } from './services/attribution.service';
import { Trade } from '../trades/entities/trade.entity';
import { Signal } from '../signals/entities/signal.entity';
import { PriceService } from '../shared/price.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEvent, MetricSnapshot, Trade, Signal]),
    ScheduleModule.forRoot(),
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    RiskMetricsService,
    StatisticalAnalysisService,
    AttributionService,
    PriceService,
  ],
  exports: [AnalyticsService, RiskMetricsService, AttributionService],
})
export class AnalyticsModule {}
