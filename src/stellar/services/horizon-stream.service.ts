import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Server } from 'stellar-sdk';
import { StellarConfigService } from '../../config/stellar.service';
import { CacheService } from '../../cache/cache.service';
import { HorizonStreamEvent, StreamCursor } from '../interfaces/horizon-event.interface';

@Injectable()
export class HorizonStreamService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HorizonStreamService.name);
  private server: Server;
  private eventEmitter: EventEmitter2;
  private activeStreams = new Map<string, any>();
  private reconnectTimeouts = new Map<string, NodeJS.Timeout>();
  private watchedAccounts = new Set<string>();
  private streamCursors = new Map<string, StreamCursor>();
  
  private readonly MAX_RECONNECT_DELAY = 60000; // 1 minute
  private readonly INITIAL_RECONNECT_DELAY = 1000; // 1 second
  private readonly CURSOR_CACHE_KEY = 'horizon_stream_cursors';

  constructor(
    private stellarConfig: StellarConfigService,
    private cacheService: CacheService,
    eventEmitter: EventEmitter2,
  ) {
    this.server = new Server(this.stellarConfig.horizonUrl);
    this.eventEmitter = eventEmitter;
  }

  async onModuleInit() {
    await this.loadStreamCursors();
    this.logger.log('Horizon Stream Service initialized');
  }

  async onModuleDestroy() {
    await this.stopAllStreams();
    this.logger.log('Horizon Stream Service destroyed');
  }

  async addWatchedAccount(publicKey: string): Promise<void> {
    if (this.watchedAccounts.has(publicKey)) {
      this.logger.debug(`Account ${publicKey} already being watched`);
      return;
    }

    this.watchedAccounts.add(publicKey);
    this.logger.log(`Added account to watch list: ${publicKey}`);
    
    // Start streams for this account if not already running
    await this.startAccountStreams(publicKey);
  }

  async removeWatchedAccount(publicKey: string): Promise<void> {
    this.watchedAccounts.delete(publicKey);
    this.logger.log(`Removed account from watch list: ${publicKey}`);
    
    // Stop streams for this account if no longer needed
    await this.stopAccountStreams(publicKey);
  }

  private async startAccountStreams(publicKey: string): Promise<void> {
    // Start transaction stream for the account
    await this.startTransactionStream(publicKey);
    
    // Start effects stream for the account
    await this.startEffectsStream(publicKey);
  }

  private async startTransactionStream(publicKey: string): Promise<void> {
    const streamKey = `transactions_${publicKey}`;
    
    if (this.activeStreams.has(streamKey)) {
      this.logger.debug(`Transaction stream already active for ${publicKey}`);
      return;
    }

    try {
      const cursor = this.streamCursors.get(streamKey);
      let streamBuilder = this.server.transactions().forAccount(publicKey);
      
      if (cursor?.cursor) {
        streamBuilder = streamBuilder.cursor(cursor.cursor);
        this.logger.debug(`Resuming transaction stream from cursor: ${cursor.cursor}`);
      }

      const stream = streamBuilder
        .stream({
          onmessage: (event: any) => this.handleTransactionEvent(publicKey, event),
          onerror: (error: any) => this.handleStreamError(streamKey, publicKey, error),
          reconnectTimeout: this.INITIAL_RECONNECT_DELAY,
        });

      this.activeStreams.set(streamKey, stream);
      this.logger.log(`Started transaction stream for account: ${publicKey}`);
      
    } catch (error) {
      this.logger.error(`Failed to start transaction stream for ${publicKey}:`, error);
      this.scheduleReconnect(streamKey, publicKey, 'transaction');
    }
  }

  private async startEffectsStream(publicKey: string): Promise<void> {
    const streamKey = `effects_${publicKey}`;
    
    if (this.activeStreams.has(streamKey)) {
      this.logger.debug(`Effects stream already active for ${publicKey}`);
      return;
    }

    try {
      const cursor = this.streamCursors.get(streamKey);
      let streamBuilder = this.server.effects().forAccount(publicKey);
      
      if (cursor?.cursor) {
        streamBuilder = streamBuilder.cursor(cursor.cursor);
        this.logger.debug(`Resuming effects stream from cursor: ${cursor.cursor}`);
      }

      const stream = streamBuilder
        .stream({
          onmessage: (event: any) => this.handleEffectEvent(publicKey, event),
          onerror: (error: any) => this.handleStreamError(streamKey, publicKey, error),
          reconnectTimeout: this.INITIAL_RECONNECT_DELAY,
        });

      this.activeStreams.set(streamKey, stream);
      this.logger.log(`Started effects stream for account: ${publicKey}`);
      
    } catch (error) {
      this.logger.error(`Failed to start effects stream for ${publicKey}:`, error);
      this.scheduleReconnect(streamKey, publicKey, 'effects');
    }
  }

  private handleTransactionEvent(accountId: string, event: any): void {
    try {
      this.updateStreamCursor(`transactions_${accountId}`, event.paging_token);
      
      const streamEvent: HorizonStreamEvent = {
        id: event.id,
        paging_token: event.paging_token,
        successful: event.successful,
        hash: event.hash,
        ledger: event.ledger,
        created_at: event.created_at,
        source_account: event.source_account,
        type: 'transaction',
        data: event,
      };

      // Emit event for processing
      this.eventEmitter.emit('horizon.transaction', {
        accountId,
        event: streamEvent,
      });

      this.logger.debug(`Transaction event processed for ${accountId}: ${event.hash}`);
      
    } catch (error) {
      this.logger.error(`Error processing transaction event for ${accountId}:`, error);
    }
  }

  private handleEffectEvent(accountId: string, event: any): void {
    try {
      this.updateStreamCursor(`effects_${accountId}`, event.paging_token);
      
      const streamEvent: HorizonStreamEvent = {
        id: event.id,
        paging_token: event.paging_token,
        successful: true,
        hash: event.transaction_hash || '',
        ledger: 0, // Effects don't have ledger directly
        created_at: event.created_at,
        source_account: event.account,
        type: 'effect',
        data: event,
      };

      // Emit event for processing
      this.eventEmitter.emit('horizon.effect', {
        accountId,
        event: streamEvent,
      });

      this.logger.debug(`Effect event processed for ${accountId}: ${event.type}`);
      
    } catch (error) {
      this.logger.error(`Error processing effect event for ${accountId}:`, error);
    }
  }

  private handleStreamError(streamKey: string, accountId: string, error: any): void {
    this.logger.error(`Stream error for ${streamKey}:`, error);
    
    // Close the current stream
    const stream = this.activeStreams.get(streamKey);
    if (stream && typeof stream.close === 'function') {
      stream.close();
    }
    this.activeStreams.delete(streamKey);
    
    // Schedule reconnection
    const streamType = streamKey.startsWith('transactions_') ? 'transaction' : 'effects';
    this.scheduleReconnect(streamKey, accountId, streamType);
  }

  private scheduleReconnect(streamKey: string, accountId: string, streamType: 'transaction' | 'effects'): void {
    // Clear existing timeout
    const existingTimeout = this.reconnectTimeouts.get(streamKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Calculate reconnect delay with exponential backoff
    const cursor = this.streamCursors.get(streamKey);
    const reconnectCount = cursor?.reconnectCount || 0;
    const delay = Math.min(
      this.INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectCount),
      this.MAX_RECONNECT_DELAY
    );

    this.logger.log(`Scheduling reconnect for ${streamKey} in ${delay}ms (attempt ${reconnectCount + 1})`);

    const timeout = setTimeout(async () => {
      this.reconnectTimeouts.delete(streamKey);
      
      // Update reconnect count
      this.updateReconnectCount(streamKey);
      
      // Attempt to reconnect
      if (streamType === 'transaction') {
        await this.startTransactionStream(accountId);
      } else {
        await this.startEffectsStream(accountId);
      }
    }, delay);

    this.reconnectTimeouts.set(streamKey, timeout);
  }

  private updateStreamCursor(streamKey: string, pagingToken: string): void {
    const existing = this.streamCursors.get(streamKey) || {
      cursor: '',
      lastEventTime: new Date(),
      reconnectCount: 0,
    };

    this.streamCursors.set(streamKey, {
      ...existing,
      cursor: pagingToken,
      lastEventTime: new Date(),
      reconnectCount: 0, // Reset on successful event
    });

    // Periodically save cursors to cache
    this.saveStreamCursors();
  }

  private updateReconnectCount(streamKey: string): void {
    const existing = this.streamCursors.get(streamKey) || {
      cursor: '',
      lastEventTime: new Date(),
      reconnectCount: 0,
    };

    this.streamCursors.set(streamKey, {
      ...existing,
      reconnectCount: existing.reconnectCount + 1,
    });
  }

  private async loadStreamCursors(): Promise<void> {
    try {
      const cached = await this.cacheService.get(this.CURSOR_CACHE_KEY);
      if (cached) {
        const cursors = JSON.parse(cached);
        for (const [key, value] of Object.entries(cursors)) {
          this.streamCursors.set(key, {
            ...(value as any),
            lastEventTime: new Date((value as any).lastEventTime),
          });
        }
        this.logger.log(`Loaded ${Object.keys(cursors).length} stream cursors from cache`);
      }
    } catch (error) {
      this.logger.error('Failed to load stream cursors:', error);
    }
  }

  private async saveStreamCursors(): Promise<void> {
    try {
      const cursors = Object.fromEntries(this.streamCursors.entries());
      await this.cacheService.set(this.CURSOR_CACHE_KEY, JSON.stringify(cursors), 3600); // 1 hour TTL
    } catch (error) {
      this.logger.error('Failed to save stream cursors:', error);
    }
  }

  private async stopAccountStreams(publicKey: string): Promise<void> {
    const transactionStreamKey = `transactions_${publicKey}`;
    const effectsStreamKey = `effects_${publicKey}`;

    // Stop transaction stream
    const transactionStream = this.activeStreams.get(transactionStreamKey);
    if (transactionStream && typeof transactionStream.close === 'function') {
      transactionStream.close();
      this.activeStreams.delete(transactionStreamKey);
    }

    // Stop effects stream
    const effectsStream = this.activeStreams.get(effectsStreamKey);
    if (effectsStream && typeof effectsStream.close === 'function') {
      effectsStream.close();
      this.activeStreams.delete(effectsStreamKey);
    }

    // Clear reconnect timeouts
    [transactionStreamKey, effectsStreamKey].forEach(key => {
      const timeout = this.reconnectTimeouts.get(key);
      if (timeout) {
        clearTimeout(timeout);
        this.reconnectTimeouts.delete(key);
      }
    });

    this.logger.log(`Stopped streams for account: ${publicKey}`);
  }

  private async stopAllStreams(): Promise<void> {
    // Close all active streams
    for (const [key, stream] of this.activeStreams.entries()) {
      if (stream && typeof stream.close === 'function') {
        stream.close();
      }
    }
    this.activeStreams.clear();

    // Clear all timeouts
    for (const timeout of this.reconnectTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.reconnectTimeouts.clear();

    // Save final cursor state
    await this.saveStreamCursors();

    this.logger.log('All streams stopped');
  }

  getStreamStatus(): {
    activeStreams: string[];
    watchedAccounts: string[];
    cursors: Record<string, StreamCursor>;
  } {
    return {
      activeStreams: Array.from(this.activeStreams.keys()),
      watchedAccounts: Array.from(this.watchedAccounts),
      cursors: Object.fromEntries(this.streamCursors.entries()),
    };
  }
}