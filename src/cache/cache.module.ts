import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FeedCacheStrategy } from './strategies/feed-cache.strategy';
import { ProviderCacheStrategy } from './strategies/provider-cache.strategy';
import { PriceCacheStrategy } from './strategies/price-cache.strategy';
import { CacheInvalidatorService } from './invalidation/cache-invalidator.service';
import { CacheMetricsService } from './monitoring/cache-metrics.service';
import { CacheController } from './cache.controller';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: 'memory',
        max: 1000, // Maximum number of items in cache
        ttl: 300, // Default TTL in seconds
      }),
    }),
  ],
  providers: [
    FeedCacheStrategy,
    ProviderCacheStrategy,
    PriceCacheStrategy,
    CacheInvalidatorService,
    CacheMetricsService,
  ],
  controllers: [CacheController],
  exports: [
    FeedCacheStrategy,
    ProviderCacheStrategy,
    PriceCacheStrategy,
    CacheInvalidatorService,
    CacheMetricsService,
  ],
})
export class CacheModule {}