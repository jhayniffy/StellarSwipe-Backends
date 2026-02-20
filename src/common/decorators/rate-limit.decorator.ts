import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rate_limit';

export enum RateLimitTier {
  PUBLIC = 'public',
  AUTHENTICATED = 'authenticated',
  TRADE = 'trade',
  SIGNAL = 'signal',
  ADMIN = 'admin',
}

export interface RateLimitConfig {
  tier: RateLimitTier;
  limit?: number;
  window?: number; // seconds
}

export const RateLimit = (config: RateLimitConfig) => 
  SetMetadata(RATE_LIMIT_KEY, config);