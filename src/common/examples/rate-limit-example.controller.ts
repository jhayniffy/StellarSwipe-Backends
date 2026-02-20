import { Controller, Post, Get, Body } from '@nestjs/common';
import { RateLimit, RateLimitTier } from '../decorators/rate-limit.decorator';

/**
 * Example controller demonstrating rate limit usage
 */
@Controller('examples')
export class RateLimitExampleController {
  // Public endpoint - 100 req/15min per IP
  @Get('public')
  @RateLimit({ tier: RateLimitTier.PUBLIC })
  getPublicData() {
    return { message: 'Public data' };
  }

  // Authenticated endpoint - 1000 req/15min per user
  @Get('authenticated')
  @RateLimit({ tier: RateLimitTier.AUTHENTICATED })
  getAuthenticatedData() {
    return { message: 'Authenticated data' };
  }

  // Trade execution - 10 req/min per user
  @Post('trade')
  @RateLimit({ tier: RateLimitTier.TRADE })
  executeTrade(@Body() tradeData: any) {
    return { message: 'Trade executed', data: tradeData };
  }

  // Signal submission - 10 req/day per user
  @Post('signal')
  @RateLimit({ tier: RateLimitTier.SIGNAL })
  createSignal(@Body() signalData: any) {
    return { message: 'Signal created', data: signalData };
  }

  // Custom limit - 50 req/5min
  @Get('custom')
  @RateLimit({ 
    tier: RateLimitTier.AUTHENTICATED,
    limit: 50,
    window: 300 
  })
  customLimit() {
    return { message: 'Custom rate limit' };
  }

  // Admin endpoint - 10000 req/15min
  @Get('admin')
  @RateLimit({ tier: RateLimitTier.ADMIN })
  adminEndpoint() {
    return { message: 'Admin data' };
  }
}