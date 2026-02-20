import { Injectable } from '@nestjs/common';
import { BaseCacheStrategy } from './base-cache.strategy';

interface PriceData {
  price: number;
  change24h: number;
  volume: number;
  timestamp: Date;
}

@Injectable()
export class PriceCacheStrategy extends BaseCacheStrategy {
  private readonly TTL = {
    price: 60, // 1 minute - frequently updated
    priceHistory: 300, // 5 minutes
  };

  async getPrice(assetPair: string): Promise<PriceData | null> {
    const key = `price:${assetPair}`;
    return this.get<PriceData>(key, { ttl: this.TTL.price, useL1: true });
  }

  async setPrice(assetPair: string, data: PriceData): Promise<void> {
    const key = `price:${assetPair}`;
    await this.set(key, data, { ttl: this.TTL.price, useL1: true });
  }

  async invalidatePrice(assetPair: string): Promise<void> {
    await this.delete(`price:${assetPair}`);
  }

  async invalidateAllPrices(): Promise<void> {
    await this.deletePattern('price:*');
  }

  async getOrFetchPrice(
    assetPair: string,
    fetchFn: () => Promise<PriceData>,
  ): Promise<PriceData> {
    const key = `price:${assetPair}`;
    return this.getOrSet(key, fetchFn, { ttl: this.TTL.price, useL1: true });
  }

  async getMultiplePrices(assetPairs: string[]): Promise<Map<string, PriceData>> {
    const results = new Map<string, PriceData>();
    
    await Promise.all(
      assetPairs.map(async (pair) => {
        const price = await this.getPrice(pair);
        if (price) {
          results.set(pair, price);
        }
      })
    );

    return results;
  }

  async setMultiplePrices(prices: Map<string, PriceData>): Promise<void> {
    await Promise.all(
      Array.from(prices.entries()).map(([pair, data]) =>
        this.setPrice(pair, data)
      )
    );
  }
}