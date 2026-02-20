import { Injectable } from '@nestjs/common';

interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  avgResponseTime: number;
}

interface CacheStats {
  l1: CacheMetrics;
  l2: CacheMetrics;
  overall: CacheMetrics;
  memoryUsage: {
    l1Size: number;
    l1MaxSize: number;
  };
}

@Injectable()
export class CacheMetricsService {
  private metrics = {
    l1: { hits: 0, misses: 0, sets: 0, deletes: 0, responseTimes: [] as number[] },
    l2: { hits: 0, misses: 0, sets: 0, deletes: 0, responseTimes: [] as number[] },
  };

  recordL1Hit(responseTime: number): void {
    this.metrics.l1.hits++;
    this.metrics.l1.responseTimes.push(responseTime);
    this.trimResponseTimes('l1');
  }

  recordL1Miss(): void {
    this.metrics.l1.misses++;
  }

  recordL2Hit(responseTime: number): void {
    this.metrics.l2.hits++;
    this.metrics.l2.responseTimes.push(responseTime);
    this.trimResponseTimes('l2');
  }

  recordL2Miss(): void {
    this.metrics.l2.misses++;
  }

  recordSet(layer: 'l1' | 'l2'): void {
    this.metrics[layer].sets++;
  }

  recordDelete(layer: 'l1' | 'l2'): void {
    this.metrics[layer].deletes++;
  }

  getStats(): CacheStats {
    const l1Metrics = this.calculateMetrics('l1');
    const l2Metrics = this.calculateMetrics('l2');

    const overallHits = this.metrics.l1.hits + this.metrics.l2.hits;
    const overallMisses = this.metrics.l1.misses + this.metrics.l2.misses;
    const overallTotal = overallHits + overallMisses;

    return {
      l1: l1Metrics,
      l2: l2Metrics,
      overall: {
        hits: overallHits,
        misses: overallMisses,
        sets: this.metrics.l1.sets + this.metrics.l2.sets,
        deletes: this.metrics.l1.deletes + this.metrics.l2.deletes,
        hitRate: overallTotal > 0 ? (overallHits / overallTotal) * 100 : 0,
        avgResponseTime: this.calculateAvgResponseTime([
          ...this.metrics.l1.responseTimes,
          ...this.metrics.l2.responseTimes,
        ]),
      },
      memoryUsage: {
        l1Size: 0, // Would need actual implementation
        l1MaxSize: 1000,
      },
    };
  }

  resetStats(): void {
    this.metrics = {
      l1: { hits: 0, misses: 0, sets: 0, deletes: 0, responseTimes: [] },
      l2: { hits: 0, misses: 0, sets: 0, deletes: 0, responseTimes: [] },
    };
  }

  private calculateMetrics(layer: 'l1' | 'l2'): CacheMetrics {
    const { hits, misses, sets, deletes, responseTimes } = this.metrics[layer];
    const total = hits + misses;

    return {
      hits,
      misses,
      sets,
      deletes,
      hitRate: total > 0 ? (hits / total) * 100 : 0,
      avgResponseTime: this.calculateAvgResponseTime(responseTimes),
    };
  }

  private calculateAvgResponseTime(times: number[]): number {
    if (times.length === 0) return 0;
    const sum = times.reduce((a, b) => a + b, 0);
    return sum / times.length;
  }

  private trimResponseTimes(layer: 'l1' | 'l2'): void {
    // Keep only last 1000 response times
    if (this.metrics[layer].responseTimes.length > 1000) {
      this.metrics[layer].responseTimes = this.metrics[layer].responseTimes.slice(-1000);
    }
  }

  // Alert if hit rate is below threshold
  checkHitRateThreshold(threshold: number = 80): boolean {
    const stats = this.getStats();
    return stats.overall.hitRate >= threshold;
  }

  getPerformanceReport(): string {
    const stats = this.getStats();
    return `
Cache Performance Report:
========================
L1 Cache:
  Hit Rate: ${stats.l1.hitRate.toFixed(2)}%
  Hits: ${stats.l1.hits}
  Misses: ${stats.l1.misses}
  Avg Response: ${stats.l1.avgResponseTime.toFixed(2)}ms

L2 Cache:
  Hit Rate: ${stats.l2.hitRate.toFixed(2)}%
  Hits: ${stats.l2.hits}
  Misses: ${stats.l2.misses}
  Avg Response: ${stats.l2.avgResponseTime.toFixed(2)}ms

Overall:
  Hit Rate: ${stats.overall.hitRate.toFixed(2)}%
  Total Hits: ${stats.overall.hits}
  Total Misses: ${stats.overall.misses}
  Avg Response: ${stats.overall.avgResponseTime.toFixed(2)}ms
    `.trim();
  }
}