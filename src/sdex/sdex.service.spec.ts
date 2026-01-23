import { Test, TestingModule } from '@nestjs/testing';
import { SdexService } from './sdex.service';
import { StellarConfigService } from '../config/stellar.service';
import { CacheService } from '../cache/cache.service';
import { Asset } from '@stellar/stellar-sdk';

describe('SdexService', () => {
  let service: SdexService;

  const mockStellarConfig = {
    horizonUrl: 'https://horizon-testnet.stellar.org',
  };

  const mockCacheService = {
    get: jest.fn(),
    setWithTTL: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SdexService,
        { provide: StellarConfigService, useValue: mockStellarConfig },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<SdexService>(SdexService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrderbook', () => {
    it('should return cached orderbook if available', async () => {
      const selling = Asset.native();
      const buying = new Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');
      const cachedOrderbook = { assetPair: 'native:USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5' };

      mockCacheService.get.mockResolvedValue(cachedOrderbook);

      const result = await service.getOrderbook(selling, buying);

      expect(result).toEqual(cachedOrderbook);
      expect(mockCacheService.get).toHaveBeenCalled();
    });

    it('should fetch from Horizon and cache if not in cache', async () => {
      const selling = Asset.native();
      const buying = new Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');

      const mockOrderbookResponse = {
        bids: [{ price: '1.2', amount: '100' }],
        asks: [{ price: '1.3', amount: '100' }],
      };

      // Mock Horizon.Server.orderbook().call()
      const callMock = jest.fn().mockResolvedValue(mockOrderbookResponse);
      const orderbookBuilderMock = { call: callMock };
      const orderbookMock = jest.fn().mockReturnValue(orderbookBuilderMock);
      (service as any).horizonServer.orderbook = orderbookMock;

      mockCacheService.get.mockResolvedValue(null);

      const result = await service.getOrderbook(selling, buying);

      expect(result.assetPair).toBe('native:USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');
      expect(result.midPrice).toBe('1.2500000');
      expect(result.spread).toBeCloseTo(0.0769, 4);
      expect(mockCacheService.setWithTTL).toHaveBeenCalledWith(expect.any(String), expect.any(Object), 30);
    });
  });

  describe('estimatePriceQuote', () => {
    it('should estimate price impact correctly', async () => {
      const selling = Asset.native();
      const buying = new Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');

      const mockOrderbook = {
        assetPair: 'native:USDC:GBBD',
        bids: [
          { price: '1.2', amount: '10' },
          { price: '1.1', amount: '10' },
        ],
        asks: [],
        midPrice: '1.25',
        spread: 0.1,
        lastUpdate: new Date(),
      };

      jest.spyOn(service, 'getOrderbook').mockResolvedValue(mockOrderbook as any);

      const result = await service.estimatePriceQuote(selling, buying, '15');

      // 10 * 1.2 + 5 * 1.1 = 12 + 5.5 = 17.5
      // Average price = 17.5 / 15 = 1.1666667
      expect(result.estimatedPrice).toBe('1.1666667');
      expect(result.totalValue).toBe('17.5000000');
      expect(result.priceImpact).toBeGreaterThan(0);
    });

    it('should throw error if insufficient liquidity', async () => {
      const selling = Asset.native();
      const buying = new Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');

      const mockOrderbook = {
        assetPair: 'native:USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
        bids: [{ price: '1.2', amount: '10' }],
        midPrice: '1.25',
      };

      jest.spyOn(service, 'getOrderbook').mockResolvedValue(mockOrderbook as any);

      await expect(service.estimatePriceQuote(selling, buying, '15')).rejects.toThrow('Insufficient liquidity');
    });

    it('should throw error for non-positive amount', async () => {
      const selling = Asset.native();
      const buying = new Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');

      await expect(service.estimatePriceQuote(selling, buying, '0')).rejects.toThrow('Amount must be greater than zero');
      await expect(service.estimatePriceQuote(selling, buying, '-1')).rejects.toThrow('Amount must be greater than zero');
    });
  });

  describe('updateCache', () => {
    it('should invalidate cache and refetch', async () => {
      const selling = Asset.native();
      const buying = new Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');
      const assetPair = 'native:USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

      const getOrderbookSpy = jest.spyOn(service, 'getOrderbook').mockResolvedValue({} as any);

      await service.updateCache(selling, buying);

      expect(mockCacheService.del).toHaveBeenCalledWith(expect.stringContaining(assetPair));
      expect(getOrderbookSpy).toHaveBeenCalledWith(selling, buying);
    });
  });
});
