import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PortfolioService } from './portfolio.service';
import { Trade, TradeStatus, TradeSide } from '../trades/entities/trade.entity';
import { Position } from './entities/position.entity';
import { PriceService } from '../shared/price.service';

describe('PortfolioService', () => {
  let service: PortfolioService;
  let mockTradeRepository: any;
  let mockPositionRepository: any;
  let mockPriceService: any;
  let mockCacheManager: any;

  beforeEach(async () => {
    mockTradeRepository = {
      find: jest.fn(),
      findAndCount: jest.fn(),
    };

    mockPositionRepository = {
      find: jest.fn(),
      save: jest.fn(),
    };

    mockPriceService = {
      getMultiplePrices: jest.fn(),
    };

    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioService,
        {
          provide: getRepositoryToken(Trade),
          useValue: mockTradeRepository,
        },
        {
          provide: getRepositoryToken(Position),
          useValue: mockPositionRepository,
        },
        {
          provide: PriceService,
          useValue: mockPriceService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<PortfolioService>(PortfolioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPositions', () => {
    it('should return positions with calculated P&L', async () => {
      const mockTrade = {
        id: 'trade-1',
        baseAsset: 'XLM',
        counterAsset: 'USDC',
        amount: '100',
        entryPrice: '0.1',
        side: TradeSide.BUY,
        createdAt: new Date(),
      };
      
      mockTradeRepository.find.mockResolvedValue([mockTrade]);
      mockPriceService.getMultiplePrices.mockResolvedValue({
        'XLM/USDC': 0.12,
      });
      
      const result = await service.getPositions('user-id');
      
      expect(result[0].unrealizedPnL).toBe(2); // (0.12 - 0.1) * 100
    });
  });

  describe('getPerformance', () => {
    it('should calculate performance metrics', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      
      const mockTrades = [
        {
          status: TradeStatus.COMPLETED,
          profitLoss: '50',
          side: TradeSide.BUY,
          baseAsset: 'XLM',
          counterAsset: 'USDC',
        },
      ];
      
      mockTradeRepository.find.mockResolvedValue(mockTrades);
      mockPriceService.getMultiplePrices.mockResolvedValue({});
      
      const result = await service.getPerformance('user-id');
      
      expect(result.realizedPnL).toBe(50);
      expect(result.winRate).toBe(100);
    });
  });
});
