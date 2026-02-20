import { Injectable } from '@nestjs/common';
import { BaseCacheStrategy } from './base-cache.strategy';

interface FeedItem {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
}

@Injectable()
export class FeedCacheStrategy extends BaseCacheStrategy {
  private readonly TTL = {
    feed: 30, // 30 seconds - hot data
    feedPage: 60, // 1 minute
  };

  async getUserFeed(userId: string, cursor?: string): Promise<FeedItem[] | null> {
    const key = this.getFeedKey(userId, cursor);
    return this.get<FeedItem[]>(key, { ttl: this.TTL.feed, useL1: true });
  }

  async setUserFeed(userId: string, cursor: string | undefined, feed: FeedItem[]): Promise<void> {
    const key = this.getFeedKey(userId, cursor);
    await this.set(key, feed, { ttl: this.TTL.feed, useL1: true });
  }

  async invalidateUserFeed(userId: string): Promise<void> {
    await this.deletePattern(`feed:${userId}:*`);
  }

  async invalidateAllFeeds(): Promise<void> {
    await this.deletePattern('feed:*');
  }

  async getOrFetchFeed(
    userId: string,
    cursor: string | undefined,
    fetchFn: () => Promise<FeedItem[]>,
  ): Promise<FeedItem[]> {
    const key = this.getFeedKey(userId, cursor);
    return this.getOrSet(key, fetchFn, { ttl: this.TTL.feed, useL1: true });
  }

  private getFeedKey(userId: string, cursor?: string): string {
    return `feed:${userId}:${cursor || 'initial'}`;
  }
}