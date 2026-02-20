import { TradeSide } from '../../trades/entities/trade.entity';

export class TradeDetail {
  id!: string;
  side!: TradeSide;
  baseAsset!: string;
  counterAsset!: string;
  amount!: number;
  entryPrice!: number;
  exitPrice?: number;
  profitLoss!: number;
  profitLossPercentage?: number;
  executedAt?: Date;
  closedAt?: Date;
}

export class PortfolioSummaryDto {
  totalValue!: number;
  unrealizedPnL!: number;
  realizedPnL!: number;
  openPositions!: number;
  winRate!: number;
  bestTrade?: TradeDetail;
  worstTrade?: TradeDetail;
}
