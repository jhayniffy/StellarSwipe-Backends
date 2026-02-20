import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { DashboardService } from './dashboard.service';
import { Trade } from '../trades/entities/trade.entity';
import { Signal } from '../signals/entities/signal.entity';
import { PortfolioService } from '../portfolio/portfolio.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockTradeRepository: any;
  let mockSignalRepository: any;
  let mockPortfolioService: any;
  let mockCacheManager: any;

  beforeEach(async () => {
    mockTradeRepository = {
      find: jest.fn(),
      count: jest.fn(),
    };

    mockSignalRepository = {
      find: jest.fn(),
    };

    mockPortfolioService = {
      getPerformance: jest.fn(),
      getPositions: jest.fn(),
    };

    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: getRepositoryToken(Trade),
          useValue: mockTradeRepository,
        },
        {
          provide: getRepositoryToken(Signal),
          useValue: mockSignalRepository,
        },
        {
          provide: PortfolioService,
          useValue: mockPortfolioService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardData', () => {
    it('should return cached data if available', async () => {
      const cachedData = {
        portfolio: { totalValue: 1000 },
        positions: [],
        recentTrades: [],
        followedSignals: [],
        stats: { todayPnL: 50, weekPnL: 200, totalTrades: 10 },
      };

      mockCacheManager.get.mockResolvedValue(cachedData);

      const result = await service.getDashboardData('user-id');

      expect(result).toEqual(cachedData);
      expect(mockCacheManager.get).toHaveBeenCalledWith('dashboard_user-id');
    });

    it('should fetch and cache data when not cached', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockPortfolioService.getPerformance.mockResolvedValue({ totalValue: 1000 });
      mockPortfolioService.getPositions.mockResolvedValue([]);
      mockTradeRepository.find.mockResolvedValue([]);
      mockTradeRepository.count.mockResolvedValue(5);
      mockSignalRepository.find.mockResolvedValue([]);

      const result = await service.getDashboardData('user-id');

      expect(result).toBeDefined();
      expect(result.portfolio.totalValue).toBe(1000);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'dashboard_user-id',
        expect.any(Object),
        30000,
      );
    });
  });

  describe('invalidateCache', () => {
    it('should delete cache for user', async () => {
      await service.invalidateCache('user-id');

      expect(mockCacheManager.del).toHaveBeenCalledWith('dashboard_user-id');
    });
  });
});