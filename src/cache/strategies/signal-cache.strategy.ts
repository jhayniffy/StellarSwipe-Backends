import { Injectable } from '@nestjs/common';
import { BaseCacheStrategy } from './base-cache.strategy';

interface SignalDetails {
  id: string;
  providerId: string;
  type: string;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  status: string;
}

@Injectable()
export class SignalCacheStrategy extends BaseCacheStrategy {
  private readonly TTL = {
    signalDetails: 300, // 5 minutes
    activeSignals: 180, // 3 minutes
  };

  async getSignalDetails(signalId: string): Promise<SignalDetails | null> {
    const key = `signal:${signalId}`;
    return this.get<SignalDetails>(key, { ttl: this.TTL.signalDetails, useL1: false });
  }

  async setSignalDetails(signalId: string, details: SignalDetails): Promise<void> {
    const key = `signal:${signalId}`;
    await this.set(key, details, { ttl: this.TTL.signalDetails, useL1: false });
  }

  async invalidateSignal(signalId: string): Promise<void> {
    await this.delete(`signal:${signalId}`);
  }

  async getOrFetchSignal(
    signalId: string,
    fetchFn: () => Promise<SignalDetails>,
  ): Promise<SignalDetails> {
    const key = `signal:${signalId}`;
    return this.getOrSet(key, fetchFn, { ttl: this.TTL.signalDetails, useL1: false });
  }

  async getActiveSignals(providerId: string): Promise<SignalDetails[] | null> {
    const key = `signals:active:${providerId}`;
    return this.get<SignalDetails[]>(key, { ttl: this.TTL.activeSignals, useL1: false });
  }

  async setActiveSignals(providerId: string, signals: SignalDetails[]): Promise<void> {
    const key = `signals:active:${providerId}`;
    await this.set(key, signals, { ttl: this.TTL.activeSignals, useL1: false });
  }

  async invalidateActiveSignals(providerId: string): Promise<void> {
    await this.delete(`signals:active:${providerId}`);
  }
}