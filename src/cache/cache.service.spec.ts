import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { createMockCache, createMockConfigService } from '../../test/utils/test-helpers';

describe('CacheService', () => {
  let service: CacheService;
  let mockCache: ReturnType<typeof createMockCache>;
  let mockConfig: ReturnType<typeof createMockConfigService>;

  beforeEach(async () => {
    mockCache = createMockCache();
    mockConfig = createMockConfigService({ 'cache.ttl': 3600 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: 'CACHE_MANAGER', useValue: mockCache },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should get cached value', async () => {
    mockCache.get.mockResolvedValue('cached-value');

    const result = await service.get('key');

    expect(result).toBe('cached-value');
  });

  it('should set cache value', async () => {
    mockCache.set.mockResolvedValue(undefined);

    await service.set('key', 'value', 3600);

    expect(mockCache.set).toHaveBeenCalledWith('key', 'value', 3600);
  });

  it('should delete cache value', async () => {
    mockCache.del.mockResolvedValue(undefined);

    await service.del('key');

    expect(mockCache.del).toHaveBeenCalledWith('key');
  });

  it('should reset cache', async () => {
    mockCache.reset.mockResolvedValue(undefined);

    await service.reset();

    expect(mockCache.reset).toHaveBeenCalled();
  });
});
