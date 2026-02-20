# Multi-Layer Caching Strategy

## Overview
Comprehensive caching system with L1 (in-memory) and L2 (Redis) layers, smart invalidation, and performance monitoring.

## Architecture

### Cache Layers

**L1 Cache (In-Memory)**
- Hot data with high access frequency
- TTL: 1-5 minutes
- Fast access (<1ms)
- Limited size (1000 items)

**L2 Cache (Redis)**
- Warm data with moderate access
- TTL: 5-60 minutes
- Network latency (~5-10ms)
- Larger capacity

## Cache-Aside Pattern

```typescript
async getData(key: string) {
  // 1. Check L1 cache
  const l1Data = l1Cache.get(key);
  if (l1Data) return l1Data;

  // 2. Check L2 cache
  const l2Data = await redis.get(key);
  if (l2Data) {
    l1Cache.set(key, l2Data); // Populate L1
    return l2Data;
  }

  // 3. Fetch from database
  const dbData = await database.query(key);
  
  // 4. Store in both caches
  await redis.set(key, dbData);
  l1Cache.set(key, dbData);
  
  return dbData;
}
```

## TTL Strategy

```typescript
{
  // Real-time data
  prices: 60,              // 1 minute
  signalFeed: 30,          // 30 seconds
  
  // Frequently accessed
  portfolio: 180,          // 3 minutes
  activeSignals: 180,      // 3 minutes
  
  // Moderate updates
  signalDetails: 300,      // 5 minutes
  leaderboard: 300,        // 5 minutes
  providerProfile: 300,    // 5 minutes
  
  // Stable data
  providerStats: 600,      // 10 minutes
  priceHistory: 600,       // 10 minutes
}
```

## Cache Key Patterns

```
feed:{userId}:{cursor}           - User feed pagination
signal:{id}                      - Signal details
signals:active:{providerId}      - Active signals
provider:{id}:stats              - Provider statistics
provider:{id}:profile            - Provider profile
price:{assetPair}                - Current price
leaderboard:top                  - Top providers
portfolio:{userId}               - Portfolio summary
```

## Invalidation Patterns

### Event-Based Invalidation

```typescript
// Signal created
signal.created → {
  invalidate: feed:*
  invalidate: provider:{id}:stats
  invalidate: leaderboard:top
}

// Signal closed
signal.closed → {
  invalidate: signal:{id}
  invalidate: provider:{id}:stats
  invalidate: leaderboard:top
}

// Trade executed
trade.executed → {
  invalidate: feed:{userId}:*
  invalidate: portfolio:{userId}
}

// Price updated
price.updated → {
  invalidate: price:{assetPair}
}
```

### Write-Through Pattern

```typescript
async updateProviderStats(providerId: string, stats: Stats) {
  // 1. Update database
  await db.update(stats);
  
  // 2. Update cache immediately
  await cache.set(`provider:${providerId}:stats`, stats);
}
```

## API Endpoints

### Cache Statistics
```http
GET /cache/stats
```

**Response:**
```json
{
  "l1": {
    "hits": 8500,
    "misses": 1500,
    "hitRate": 85.0,
    "avgResponseTime": 0.5
  },
  "l2": {
    "hits": 1200,
    "misses": 300,
    "hitRate": 80.0,
    "avgResponseTime": 8.2
  },
  "overall": {
    "hits": 9700,
    "misses": 1800,
    "hitRate": 84.3,
    "avgResponseTime": 1.8
  }
}
```

### Performance Report
```http
GET /cache/report
```

### Health Check
```http
GET /cache/health
```

**Response:**
```json
{
  "healthy": true,
  "hitRate": 84.3,
  "threshold": 80,
  "message": "Cache performance is optimal"
}
```

### Manual Invalidation
```http
POST /cache/invalidate?event=signal.created&data={"providerId":"123"}
```

### Clear All Caches
```http
DELETE /cache/clear
```

## Usage Examples

### Feed Caching

```typescript
@Injectable()
export class FeedService {
  constructor(private feedCache: FeedCacheStrategy) {}

  async getUserFeed(userId: string, cursor?: string) {
    return this.feedCache.getOrFetchFeed(
      userId,
      cursor,
      () => this.fetchFeedFromDB(userId, cursor)
    );
  }
}
```

### Provider Stats Caching

```typescript
@Injectable()
export class ProviderService {
  constructor(private providerCache: ProviderCacheStrategy) {}

  async getProviderStats(providerId: string) {
    return this.providerCache.getOrFetchStats(
      providerId,
      () => this.calculateStats(providerId)
    );
  }
}
```

### Price Caching

```typescript
@Injectable()
export class PriceService {
  constructor(private priceCache: PriceCacheStrategy) {}

  async getPrice(assetPair: string) {
    return this.priceCache.getOrFetchPrice(
      assetPair,
      () => this.fetchPriceFromAPI(assetPair)
    );
  }
}
```

## Performance Targets

- ✅ **Hit Rate**: >80% for hot data
- ✅ **Response Time**: <2s for feed load
- ✅ **L1 Response**: <1ms
- ✅ **L2 Response**: <10ms
- ✅ **Cache Miss**: <100ms (with DB fetch)

## Monitoring

### Metrics Tracked
- Cache hit/miss rates (L1, L2, overall)
- Average response times
- Cache size and memory usage
- Invalidation frequency
- Cache stampede detection

### Alerts
- Hit rate below 80%
- Response time above 2s
- Memory usage above 80%
- High invalidation rate

## Cache Stampede Prevention

```typescript
// Use mutex/lock for expensive operations
private locks = new Map<string, Promise<any>>();

async getOrFetchWithLock(key: string, fetchFn: () => Promise<any>) {
  // Check if fetch is already in progress
  if (this.locks.has(key)) {
    return this.locks.get(key);
  }

  // Create new fetch promise
  const promise = this.getOrSet(key, fetchFn, options);
  this.locks.set(key, promise);

  try {
    const result = await promise;
    return result;
  } finally {
    this.locks.delete(key);
  }
}
```

## Best Practices

1. **Use L1 for hot data**: Feed, prices, active signals
2. **Use L2 for warm data**: Stats, profiles, history
3. **Set appropriate TTLs**: Balance freshness vs performance
4. **Invalidate on writes**: Keep data consistent
5. **Monitor hit rates**: Adjust strategy based on metrics
6. **Handle cache misses**: Graceful degradation
7. **Prevent stampedes**: Use locks for expensive operations

## Configuration

```typescript
// cache.config.ts
export const cacheConfig = {
  l1: {
    maxSize: 1000,
    defaultTTL: 300,
  },
  l2: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    defaultTTL: 600,
  },
  monitoring: {
    hitRateThreshold: 80,
    alertOnLowHitRate: true,
  },
};
```

## Testing

```typescript
describe('FeedCacheStrategy', () => {
  it('should return cached data on hit', async () => {
    await feedCache.setUserFeed('user-1', undefined, mockFeed);
    const result = await feedCache.getUserFeed('user-1');
    expect(result).toEqual(mockFeed);
  });

  it('should fetch from DB on miss', async () => {
    const result = await feedCache.getOrFetchFeed(
      'user-1',
      undefined,
      () => Promise.resolve(mockFeed)
    );
    expect(result).toEqual(mockFeed);
  });
});
```