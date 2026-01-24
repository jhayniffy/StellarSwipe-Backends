import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioService } from './portfolio.service';
import { PortfolioController } from './portfolio.controller';
import { Trade } from '../trades/entities/trade.entity';
import { Position } from './entities/position.entity';
import { User } from '../users/entities/user.entity';
import { PriceService } from '../shared/price.service';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trade, Position, User]),
    CacheModule.register(),
  ],
  controllers: [PortfolioController],
  providers: [PortfolioService, PriceService],
  exports: [PortfolioService],
})
export class PortfolioModule {}
