import { Injectable, Inject, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class RateLimitService {
    private readonly logger = new Logger(RateLimitService.name);
    private readonly MAX_EXPORTS_PER_DAY = 5;

    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }

    async checkRateLimit(userId: string): Promise<void> {
        const today = new Date().toISOString().split('T')[0];
        const key = `export_count:${userId}:${today}`;

        const count = (await this.cacheManager.get<number>(key)) || 0;

        if (count >= this.MAX_EXPORTS_PER_DAY) {
            this.logger.warn(`User ${userId} reached export rate limit`);
            throw new HttpException(
                'Rate limit exceeded. You can only perform 5 exports per day.',
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }
    }

    async incrementCount(userId: string): Promise<void> {
        const today = new Date().toISOString().split('T')[0];
        const key = `export_count:${userId}:${today}`;

        const count = (await this.cacheManager.get<number>(key)) || 0;
        await this.cacheManager.set(key, count + 1, 86400 * 1000); // 24 hours
    }
}
