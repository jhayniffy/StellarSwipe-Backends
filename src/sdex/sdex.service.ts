import { Injectable, Logger } from '@nestjs/common';
import { StellarConfigService } from '../config/stellar.service';
import { CacheService, CachePrefix } from '../cache/cache.service';
import { OrderbookDto, OrderbookEntryDto } from './dto/orderbook.dto';
import { PriceQuoteDto } from './dto/price-quote.dto';
import { Horizon, Asset } from '@stellar/stellar-sdk';
import Big from 'big.js';

@Injectable()
export class SdexService {
  private readonly logger = new Logger(SdexService.name);
  private readonly horizonServer: Horizon.Server;

  constructor(
    private readonly stellarConfig: StellarConfigService,
    private readonly cacheService: CacheService,
  ) {
    this.horizonServer = new Horizon.Server(this.stellarConfig.horizonUrl);
  }

  /**
   * Fetches and caches orderbook data from Stellar Horizon
   * @param selling The asset being sold
   * @param buying The asset being bought
   * @returns Orderbook data
   */
  async getOrderbook(selling: Asset, buying: Asset): Promise<OrderbookDto> {
    const assetPair = `${this.getAssetId(selling)}:${this.getAssetId(buying)}`;
    const cacheKey = this.getCacheKey(assetPair);

    const cached = await this.cacheService.get<OrderbookDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Returning cached orderbook for ${assetPair}`);
      return cached;
    }

    try {
      this.logger.debug(`Fetching orderbook from Horizon for ${assetPair}`);
      const orderbook = await this.horizonServer.orderbook(selling, buying).call();

      const bids: OrderbookEntryDto[] = orderbook.bids.map((b) => ({
        price: b.price,
        amount: b.amount,
      }));

      const asks: OrderbookEntryDto[] = orderbook.asks.map((a) => ({
        price: a.price,
        amount: a.amount,
      }));

      const bestBid = bids.length > 0 ? new Big(bids[0].price) : null;
      const bestAsk = asks.length > 0 ? new Big(asks[0].price) : null;

      let midPrice = '0';
      let spread = 0;

      if (bestBid && bestAsk) {
        midPrice = bestBid.plus(bestAsk).div(2).toFixed(7);
        spread = bestAsk.minus(bestBid).div(bestAsk).toNumber();
      } else if (bestBid) {
        midPrice = bestBid.toFixed(7);
      } else if (bestAsk) {
        midPrice = bestAsk.toFixed(7);
      }

      const orderbookDto: OrderbookDto = {
        assetPair,
        bids,
        asks,
        spread,
        midPrice,
        lastUpdate: new Date(),
      };

      // Cache for 30s as requested
      await this.cacheService.setWithTTL(cacheKey, orderbookDto, 30);
      return orderbookDto;
    } catch (error) {
      this.logger.error(`Failed to fetch orderbook for ${assetPair}:`, error);
      throw error;
    }
  }

  /**
   * Estimates price impact for a given trade size (selling 'selling' for 'buying')
   * @param selling The asset being sold
   * @param buying The asset being bought
   * @param amount The amount of 'selling' to sell
   * @returns Price quote with impact estimation
   */
  async estimatePriceQuote(selling: Asset, buying: Asset, amount: string): Promise<PriceQuoteDto> {
    const amountBig = new Big(amount);

    if (amountBig.lte(0)) {
      throw new Error('Amount must be greater than zero');
    }

    const orderbook = await this.getOrderbook(selling, buying);


    let remaining = new Big(amount);
    let totalValue = new Big(0);

    // To sell 'selling', we take invitations to buy 'selling' (bids)
    const relevantEntries = orderbook.bids;

    if (relevantEntries.length === 0) {
      throw new Error('Insufficient liquidity: no bids available');
    }

    for (const entry of relevantEntries) {
      const entryPrice = new Big(entry.price);
      const entryAmount = new Big(entry.amount);

      const take = remaining.lt(entryAmount) ? remaining : entryAmount;
      totalValue = totalValue.plus(take.times(entryPrice));
      remaining = remaining.minus(take);

      if (remaining.lte(0)) break;
    }

    if (remaining.gt(0)) {
      throw new Error(`Insufficient liquidity: only ${amountBig.minus(remaining).toFixed(7)} available`);
    }

    const estimatedPrice = totalValue.div(amountBig);
    const marketPrice = new Big(orderbook.midPrice);

    const priceImpact = marketPrice.gt(0)
      ? marketPrice.minus(estimatedPrice).abs().div(marketPrice).toNumber()
      : 0;

    return {
      assetPair: orderbook.assetPair,
      amount,
      estimatedPrice: estimatedPrice.toFixed(7),
      priceImpact,
      marketPrice: orderbook.midPrice,
      totalValue: totalValue.toFixed(7),
    };
  }

  /**
   * Invalidates the cache for a specific asset pair. 
   * Should be called on trade execution.
   */
  async updateCache(selling: Asset, buying: Asset): Promise<void> {
    const assetPair = `${this.getAssetId(selling)}:${this.getAssetId(buying)}`;
    this.logger.debug(`Invalidating cache for ${assetPair} due to trade execution`);
    await this.cacheService.del(this.getCacheKey(assetPair));
    // Optionally refetch to prime the cache
    await this.getOrderbook(selling, buying);
  }

  private getAssetId(asset: Asset): string {
    if (asset.isNative()) return 'native';
    return `${asset.getCode()}:${asset.getIssuer()}`;
  }

  private getCacheKey(assetPair: string): string {
    return `${CachePrefix.SDEX}${assetPair}`;
  }
}
