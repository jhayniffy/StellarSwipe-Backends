import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PortfolioService } from '../portfolio/portfolio.service';
import { Trade, TradeStatus } from '../trades/entities/trade.entity';
import { Signal, SignalStatus } from '../signals/entities/signal.entity';
import { DashboardDataDto, DashboardStatsDto } from './dto/dashboard-data.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Trade)
    private tradeRepository: Repository<Trade>,
    @InjectRepository(Signal)
    private signalRepository: Repository<Signal>,
    private portfolioService: PortfolioService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getDashboardData(userId: string): Promise<DashboardDataDto> {
    const cacheKey = `dashboard_${userId}`;
    const cachedData = await this.cacheManager.get<DashboardDataDto>(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    const [portfolio, positions, recentTrades, followedSignals, stats] = await Promise.all([
      this.portfolioService.getPerformance(userId),
      this.portfolioService.getPositions(userId),
      this.getRecentTrades(userId),
      this.getFollowedSignals(userId),
      this.getDashboardStats(userId),
    ]);

    const dashboardData: DashboardDataDto = {
      portfolio,
      positions: positions.slice(0, 5), // Top 5 positions
      recentTrades,
      followedSignals,
      stats,
    };

    await this.cacheManager.set(cacheKey, dashboardData, 30000); // 30s TTL
    return dashboardData;
  }

  private async getRecentTrades(userId: string): Promise<Trade[]> {
    return this.tradeRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 10,
    });
  }

  private async getFollowedSignals(userId: string): Promise<Signal[]> {
    return this.signalRepository.find({
      where: { 
        status: SignalStatus.ACTIVE,
      },
      order: { createdAt: 'DESC' },
      take: 5,
      relations: ['provider'],
    });
  }

  private async getDashboardStats(userId: string): Promise<DashboardStatsDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [todayTrades, weekTrades, totalTrades] = await Promise.all([
      this.tradeRepository.find({
        where: {
          userId,
          status: TradeStatus.COMPLETED,
          closedAt: MoreThanOrEqual(today),
        },
      }),
      this.tradeRepository.find({
        where: {
          userId,
          status: TradeStatus.COMPLETED,
          closedAt: MoreThanOrEqual(weekAgo),
        },
      }),
      this.tradeRepository.count({
        where: { userId, status: TradeStatus.COMPLETED },
      }),
    ]);

    const todayPnL = todayTrades.reduce((sum, trade) => sum + Number(trade.profitLoss || 0), 0);
    const weekPnL = weekTrades.reduce((sum, trade) => sum + Number(trade.profitLoss || 0), 0);

    return {
      todayPnL,
      weekPnL,
      totalTrades,
    };
  }

  async invalidateCache(userId: string): Promise<void> {
    await this.cacheManager.del(`dashboard_${userId}`);
  }
}