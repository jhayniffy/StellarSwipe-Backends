import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { DashboardGateway } from './dashboard.gateway';
import { DashboardCacheService } from './dashboard-cache.service';
import { Trade } from '../trades/entities/trade.entity';
import { Signal } from '../signals/entities/signal.entity';
import { PortfolioModule } from '../portfolio/portfolio.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trade, Signal]),
    CacheModule.register(),
    PortfolioModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardGateway, DashboardCacheService],
  exports: [DashboardService, DashboardCacheService],
})
export class DashboardModule {}