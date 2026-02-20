# Rate Limiting System

## Overview
Comprehensive rate limiting with different tiers for various endpoint categories, Redis-based distributed counters, and proper 429 responses.

## Rate Limit Tiers

```typescript
{
  PUBLIC: {
    limit: 100,           // requests
    window: 900           // 15 minutes
  },
  AUTHENTICATED: {
    limit: 1000,
    window: 900           // 15 minutes
  },
  TRADE: {
    limit: 10,
    window: 60            // 1 minute
  },
  SIGNAL: {
    limit: 10,
    window: 86400         // 24 hours
  },
  ADMIN: {
    limit: 10000,
    window: 900           // 15 minutes
  }
}
```

## Usage

### Apply Rate Limit to Controller

```typescript
import { Controller, Post, Get } from '@nestjs/common';
import { RateLimit, RateLimitTier } from '../common/decorators/rate-limit.decorator';

@Controller('trades')
export class TradesController {
  // Trade execution - 10 req/min per user
  @Post()
  @RateLimit({ tier: RateLimitTier.TRADE })
  async executeTrade() {
    // ...
  }

  // View trades - authenticated tier
  @Get()
  @RateLimit({ tier: RateLimitTier.AUTHENTICATED })
  async getTrades() {
    // ...
  }
}
```

### Signal Submission

```typescript
@Controller('signals')
export class SignalsController {
  // Signal submission - 10 req/day per user
  @Post()
  @RateLimit({ tier: RateLimitTier.SIGNAL })
  async createSignal() {
    // ...
  }

  // View signals - public tier
  @Get()
  @RateLimit({ tier: RateLimitTier.PUBLIC })
  async getSignals() {
    // ...
  }
}
```

### Custom Limits

```typescript
@Controller('api')
export class ApiController {
  // Custom limit: 50 requests per 5 minutes
  @Get('custom')
  @RateLimit({ 
    tier: RateLimitTier.AUTHENTICATED,
    limit: 50,
    window: 300 
  })
  async customEndpoint() {
    // ...
  }
}
```

## Response Headers

### Successful Request
```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1737562800000
```

### Rate Limited Request
```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1737562800000
Retry-After: 45

{
  "statusCode": 429,
  "message": "Too many requests",
  "retryAfter": 45
}
```

## Identifier Strategy

### Public Endpoints
- Uses IP address as identifier
- Handles X-Forwarded-For for proxies
- Format: `ip:192.168.1.1`

### Authenticated Endpoints
- Uses user ID as identifier
- Format: `user:uuid`
- Falls back to IP if no user

## Redis Storage

### Key Format
```
rate_limit:{tier}:{identifier}
```

### Examples
```
rate_limit:public:ip:192.168.1.1
rate_limit:authenticated:user:123e4567-e89b-12d3-a456-426614174000
rate_limit:trade:user:123e4567-e89b-12d3-a456-426614174000
rate_limit:signal:user:123e4567-e89b-12d3-a456-426614174000
```

### Data Structure
```typescript
{
  count: 5,              // Current request count
  resetTime: 1737562800000  // Unix timestamp when window resets
}
```

## Global Rate Limit

Applied to all requests via middleware:
- **Limit**: 100 requests per 15 minutes per IP
- **Purpose**: Prevent DDoS and abuse
- **Applies**: Before route-specific limits

## Edge Cases Handled

### 1. Shared IP Addresses (NAT)
```typescript
// Authenticated users bypass IP-based limits
if (request.user?.id) {
  identifier = `user:${request.user.id}`;
} else {
  identifier = `ip:${ip}`;
}
```

### 2. Rate Limit Reset Timing
```typescript
// Automatic reset when window expires
if (info.resetTime <= now) {
  info.count = 0;
  info.resetTime = now + windowMs;
}
```

### 3. Burst Traffic
```typescript
// Sliding window prevents burst abuse
// Each request increments counter
// Counter resets only after full window
```

### 4. Distributed Systems
```typescript
// Redis ensures consistency across instances
// All servers share same rate limit counters
```

## Monitoring

### Rate Limit Violations
```typescript
{
  type: 'rate_limit_violation',
  identifier: 'user:123',
  tier: 'trade',
  limit: 10,
  timestamp: '2024-01-19T10:00:00Z'
}
```

### Metrics to Track
- Total violations per tier
- Most violated endpoints
- Top violating IPs/users
- Average requests per window

## Testing

### Test Rate Limit
```bash
# Send 11 requests in 1 minute (trade limit is 10)
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/v1/trades \
    -H "Authorization: Bearer token" \
    -H "Content-Type: application/json"
  sleep 5
done
```

### Expected Response (11th request)
```json
{
  "statusCode": 429,
  "message": "Too many requests",
  "retryAfter": 45
}
```

## Configuration

### Environment Variables
```env
# Rate limit settings
RATE_LIMIT_PUBLIC=100
RATE_LIMIT_AUTHENTICATED=1000
RATE_LIMIT_TRADE=10
RATE_LIMIT_SIGNAL=10

# Redis for distributed rate limiting
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Best Practices

1. **Use Appropriate Tiers**
   - PUBLIC: Read-only, non-sensitive data
   - AUTHENTICATED: General API usage
   - TRADE: High-value operations
   - SIGNAL: Limited daily actions

2. **Set Realistic Limits**
   - Consider normal usage patterns
   - Allow burst traffic
   - Prevent abuse without blocking legitimate users

3. **Monitor Violations**
   - Track frequent violators
   - Adjust limits based on data
   - Alert on unusual patterns

4. **Communicate Limits**
   - Document in API docs
   - Include in response headers
   - Provide clear error messages

## Integration with App Module

```typescript
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { RateLimitModule } from './common/rate-limit.module';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';

@Module({
  imports: [
    RateLimitModule,
    // ... other modules
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes('*');
  }
}
```

## Bypass for Testing

```typescript
// In development, you can bypass rate limits
if (process.env.NODE_ENV === 'development' && request.headers['x-bypass-rate-limit']) {
  return true;
}
```

## Error Handling

```typescript
try {
  await makeRequest();
} catch (error) {
  if (error.status === 429) {
    const retryAfter = error.response.retryAfter;
    console.log(`Rate limited. Retry after ${retryAfter} seconds`);
    await sleep(retryAfter * 1000);
    return makeRequest();
  }
  throw error;
}
```