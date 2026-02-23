import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LeaderboardService } from './leaderboard.service';
import { createMockRepository, createMockCache } from '../../test/utils/test-helpers';

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  let mockCache: ReturnType<typeof createMockCache>;

  beforeEach(async () => {
    mockCache = createMockCache();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderboardService,
        { provide: 'CACHE_MANAGER', useValue: mockCache },
      ],
    }).compile();

    service = module.get<LeaderboardService>(LeaderboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should get top providers from cache', async () => {
    const cached = [{ id: '1', score: 100 }];
    mockCache.get.mockResolvedValue(cached);

    const result = await service.getTopProviders(10);

    expect(result).toEqual(cached);
    expect(mockCache.get).toHaveBeenCalled();
  });

  it('should calculate leaderboard if not cached', async () => {
    mockCache.get.mockResolvedValue(null);
    mockCache.set.mockResolvedValue(undefined);

    const result = await service.getTopProviders(10);

    expect(mockCache.set).toHaveBeenCalled();
  });

  it('should get user rank', async () => {
    const result = await service.getUserRank('user-123');

    expect(result).toHaveProperty('rank');
  });
});
