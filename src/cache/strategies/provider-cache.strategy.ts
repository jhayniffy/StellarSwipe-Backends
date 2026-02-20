import { Injectable } from '@nestjs/common';
import { BaseCacheStrategy } from './base-cache.strategy';

interface ProviderStats {
  totalSignals: number;
  successRate: number;
  avgReturn: number;
  followers: number;
  rating: number;
}

@Injectable()
export class ProviderCacheStrategy extends BaseCacheStrategy {
  private readonly TTL = {
    stats: 600, // 10 minutes
    profile: 300, // 5 minutes
    leaderboard: 300, // 5 minutes
  };

  async getProviderStats(providerId: string): Promise<ProviderStats | null> {
    const key = `provider:${providerId}:stats`;
    return this.get<ProviderStats>(key, { ttl: this.TTL.stats, useL1: false });
  }

  async setProviderStats(providerId: string, stats: ProviderStats): Promise<void> {
    const key = `provider:${providerId}:stats`;
    await this.set(key, stats, { ttl: this.TTL.stats, useL1: false });
  }

  async invalidateProviderStats(providerId: string): Promise<void> {
    await this.delete(`provider:${providerId}:stats`);
  }

  async getLeaderboard(): Promise<any[] | null> {
    return this.get<any[]>('leaderboard:top', { ttl: this.TTL.leaderboard, useL1: true });
  }

  async setLeaderboard(data: any[]): Promise<void> {
    await this.set('leaderboard:top', data, { ttl: this.TTL.leaderboard, useL1: true });
  }

  async invalidateLeaderboard(): Promise<void> {
    await this.delete('leaderboard:top');
  }

  async getOrFetchStats(
    providerId: string,
    fetchFn: () => Promise<ProviderStats>,
  ): Promise<ProviderStats> {
    const key = `provider:${providerId}:stats`;
    return this.getOrSet(key, fetchFn, { ttl: this.TTL.stats, useL1: false });
  }
}