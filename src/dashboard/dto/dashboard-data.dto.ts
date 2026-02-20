import { PortfolioSummaryDto } from '../../portfolio/dto/portfolio-summary.dto';
import { PositionDetailDto } from '../../portfolio/dto/position-detail.dto';
import { Trade } from '../../trades/entities/trade.entity';
import { Signal } from '../../signals/entities/signal.entity';

export class DashboardStatsDto {
  todayPnL!: number;
  weekPnL!: number;
  totalTrades!: number;
}

export class DashboardDataDto {
  portfolio!: PortfolioSummaryDto;
  positions!: PositionDetailDto[];
  recentTrades!: Trade[];
  followedSignals!: Signal[];
  stats!: DashboardStatsDto;
}