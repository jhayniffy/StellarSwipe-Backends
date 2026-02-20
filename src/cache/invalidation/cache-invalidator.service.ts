import { Injectable } from '@nestjs/common';
import { FeedCacheStrategy } from '../strategies/feed-cache.strategy';
import { ProviderCacheStrategy } from '../strategies/provider-cache.strategy';
import { PriceCacheStrategy } from '../strategies/price-cache.strategy';

export enum InvalidationEvent {
  SIGNAL_CREATED = 'signal.created',
  SIGNAL_UPDATED = 'signal.updated',
  SIGNAL_CLOSED = 'signal.closed',
  TRADE_EXECUTED = 'trade.executed',
  PROVIDER_STATS_CHANGED = 'provider.stats.changed',
  PRICE_UPDATED = 'price.updated',
}

@Injectable()
export class CacheInvalidatorService {
  constructor(
    private feedCache: FeedCacheStrategy,
    private providerCache: ProviderCacheStrategy,
    private priceCache: PriceCacheStrategy,
  ) {}

  async invalidateOnEvent(event: InvalidationEvent, data: any): Promise<void> {
    switch (event) {
      case InvalidationEvent.SIGNAL_CREATED:
        await this.onSignalCreated(data);
        break;
      case InvalidationEvent.SIGNAL_UPDATED:
        await this.onSignalUpdated(data);
        break;
      case InvalidationEvent.SIGNAL_CLOSED:
        await this.onSignalClosed(data);
        break;
      case InvalidationEvent.TRADE_EXECUTED:
        await this.onTradeExecuted(data);
        break;
      case InvalidationEvent.PROVIDER_STATS_CHANGED:
        await this.onProviderStatsChanged(data);
        break;
      case InvalidationEvent.PRICE_UPDATED:
        await this.onPriceUpdated(data);
        break;
    }
  }

  private async onSignalCreated(data: { providerId: string }): Promise<void> {
    // Invalidate all feeds (new signal should appear)
    await this.feedCache.invalidateAllFeeds();
    
    // Invalidate provider stats
    await this.providerCache.invalidateProviderStats(data.providerId);
    
    // Invalidate leaderboard
    await this.providerCache.invalidateLeaderboard();
  }

  private async onSignalUpdated(data: { signalId: string; providerId: string }): Promise<void> {
    // Invalidate provider stats
    await this.providerCache.invalidateProviderStats(data.providerId);
  }

  private async onSignalClosed(data: { providerId: string }): Promise<void> {
    // Invalidate provider stats (success rate changed)
    await this.providerCache.invalidateProviderStats(data.providerId);
    
    // Invalidate leaderboard
    await this.providerCache.invalidateLeaderboard();
  }

  private async onTradeExecuted(data: { userId: string }): Promise<void> {
    // Invalidate user's feed
    await this.feedCache.invalidateUserFeed(data.userId);
  }

  private async onProviderStatsChanged(data: { providerId: string }): Promise<void> {
    await this.providerCache.invalidateProviderStats(data.providerId);
    await this.providerCache.invalidateLeaderboard();
  }

  private async onPriceUpdated(data: { assetPair: string }): Promise<void> {
    await this.priceCache.invalidatePrice(data.assetPair);
  }

  // Bulk invalidation
  async invalidateAll(): Promise<void> {
    await Promise.all([
      this.feedCache.invalidateAllFeeds(),
      this.priceCache.invalidateAllPrices(),
      this.providerCache.invalidateLeaderboard(),
    ]);
  }
}