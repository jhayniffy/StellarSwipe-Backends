import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { GeoBlockService } from './geo-blocking/geo-block.service';
import { SanctionsScreeningService } from './geo-blocking/sanctions-screening.service';
import { GeoBlockMiddleware } from './geo-blocking/middleware/geo-block.middleware';
import { ComplianceReportingService } from './compliance-reporting.service';
import { ComplianceController } from './compliance.controller';
import { ComplianceLog } from './entities/compliance-log.entity';
import { SuspiciousActivity } from './aml/entities/suspicious-activity.entity';
import { AmlMonitoringService } from './aml/aml-monitoring.service';
import { PatternDetectionService } from './aml/pattern-detection.service';
import { AmlScanJob, AML_QUEUE } from './aml/jobs/aml-scan.job';
import { Trade } from '../trades/entities/trade.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ComplianceLog, SuspiciousActivity, Trade, User]),
    BullModule.registerQueue({ name: AML_QUEUE }),
  ],
  providers: [
    GeoBlockService,
    SanctionsScreeningService,
    ComplianceReportingService,
    AmlMonitoringService,
    PatternDetectionService,
    AmlScanJob,
  ],
  controllers: [ComplianceController],
  exports: [
    GeoBlockService,
    SanctionsScreeningService,
    ComplianceReportingService,
    AmlMonitoringService,
  ],
})
export class ComplianceModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply geo-blocking to all routes except health checks
    consumer
      .apply(GeoBlockMiddleware)
      .exclude('health', 'health/(.*)')
      .forRoutes('*');
  }
}
