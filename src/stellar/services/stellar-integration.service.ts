import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { HorizonStreamService } from './horizon-stream.service';
import { TrustlineService } from '../trustlines/trustline.service';
import { TradeEvent, PaymentEvent, TrustlineEvent, AccountMergeEvent } from '../interfaces/horizon-event.interface';

@Injectable()
export class StellarIntegrationService {
  private readonly logger = new Logger(StellarIntegrationService.name);

  constructor(
    private horizonStreamService: HorizonStreamService,
    private trustlineService: TrustlineService,
  ) {}

  async startWatchingUserAccount(publicKey: string): Promise<void> {
    await this.horizonStreamService.addWatchedAccount(publicKey);
    this.logger.log(`Started monitoring account: ${publicKey}`);
  }

  async stopWatchingUserAccount(publicKey: string): Promise<void> {
    await this.horizonStreamService.removeWatchedAccount(publicKey);
    this.logger.log(`Stopped monitoring account: ${publicKey}`);
  }

  @OnEvent('stellar.trade')
  async handleTradeConfirmation(event: TradeEvent): Promise<void> {
    this.logger.log(`Trade confirmed for ${event.accountId}: ${event.data.soldAmount} ${event.data.soldAsset.code || 'XLM'} → ${event.data.boughtAmount} ${event.data.boughtAsset.code || 'XLM'}`);
    
    // Here you could:
    // 1. Update trade status in database
    // 2. Calculate and update portfolio
    // 3. Send push notifications
    // 4. Update user's trading history
    // 5. Trigger any post-trade actions
    
    try {
      // Example: Log trade details for audit
      this.logTradeForAudit(event);
      
      // Example: Update user's trading statistics
      await this.updateTradingStats(event);
      
    } catch (error) {
      this.logger.error(`Error processing trade confirmation:`, error);
    }
  }

  @OnEvent('stellar.payment')
  async handlePaymentConfirmation(event: PaymentEvent): Promise<void> {
    this.logger.log(`Payment confirmed for ${event.accountId}: ${event.data.amount} ${event.data.asset.code || 'XLM'}`);
    
    try {
      // Update user balance if this is a deposit/withdrawal
      await this.updateUserBalance(event);
      
    } catch (error) {
      this.logger.error(`Error processing payment confirmation:`, error);
    }
  }

  @OnEvent('stellar.trustline')
  async handleTrustlineChange(event: TrustlineEvent): Promise<void> {
    this.logger.log(`Trustline ${event.data.action} for ${event.accountId}: ${event.data.asset.code}`);
    
    try {
      // Update user's available assets
      await this.updateUserAssets(event);
      
      // If trustline was created, might need to refresh portfolio
      if (event.data.action === 'created') {
        await this.refreshUserPortfolio(event.accountId);
      }
      
    } catch (error) {
      this.logger.error(`Error processing trustline change:`, error);
    }
  }

  @OnEvent('stellar.account_merge')
  async handleAccountMerge(event: AccountMergeEvent): Promise<void> {
    this.logger.warn(`SECURITY ALERT: Account merge detected for ${event.accountId}`);
    
    try {
      // This is a security-critical event
      await this.handleSecurityAlert(event);
      
      // Stop watching the merged account
      await this.stopWatchingUserAccount(event.accountId);
      
    } catch (error) {
      this.logger.error(`Error processing account merge:`, error);
    }
  }

  @OnEvent('stellar.transaction.confirmed')
  async handleTransactionConfirmation(event: any): Promise<void> {
    this.logger.log(`Transaction confirmed: ${event.transactionHash} for ${event.accountId}`);
    
    try {
      // Update transaction status in database
      await this.updateTransactionStatus(event.transactionHash, 'confirmed');
      
    } catch (error) {
      this.logger.error(`Error updating transaction status:`, error);
    }
  }

  // Helper methods for processing events
  private logTradeForAudit(event: TradeEvent): void {
    const auditLog = {
      timestamp: event.timestamp,
      accountId: event.accountId,
      transactionHash: event.transactionHash,
      tradeType: 'SDEX',
      soldAsset: `${event.data.soldAsset.code || 'XLM'}${event.data.soldAsset.issuer ? ':' + event.data.soldAsset.issuer : ''}`,
      soldAmount: event.data.soldAmount,
      boughtAsset: `${event.data.boughtAsset.code || 'XLM'}${event.data.boughtAsset.issuer ? ':' + event.data.boughtAsset.issuer : ''}`,
      boughtAmount: event.data.boughtAmount,
      price: event.data.price,
      offerId: event.data.offerId,
    };
    
    // In a real implementation, you'd save this to an audit log table
    this.logger.debug('Trade audit log:', JSON.stringify(auditLog));
  }

  private async updateTradingStats(event: TradeEvent): Promise<void> {
    // In a real implementation, you'd update user trading statistics
    // This could include:
    // - Total trades count
    // - Volume traded
    // - P&L calculations
    // - Asset-specific trading history
    
    this.logger.debug(`Updating trading stats for ${event.accountId}`);
  }

  private async updateUserBalance(event: PaymentEvent): Promise<void> {
    // In a real implementation, you'd update user balance in database
    // This would be important for deposits/withdrawals
    
    this.logger.debug(`Updating balance for ${event.accountId}: ${event.data.amount} ${event.data.asset.code || 'XLM'}`);
  }

  private async updateUserAssets(event: TrustlineEvent): Promise<void> {
    // In a real implementation, you'd update the user's available assets
    // This affects what they can trade
    
    this.logger.debug(`Updating available assets for ${event.accountId}`);
  }

  private async refreshUserPortfolio(accountId: string): Promise<void> {
    // In a real implementation, you'd trigger a portfolio recalculation
    // This is important when new assets become available
    
    this.logger.debug(`Refreshing portfolio for ${accountId}`);
  }

  private async handleSecurityAlert(event: AccountMergeEvent): Promise<void> {
    // In a real implementation, you'd:
    // 1. Send immediate security alerts
    // 2. Disable account access
    // 3. Log security event
    // 4. Notify security team
    
    this.logger.warn(`Security alert processed for account merge: ${event.accountId} → ${event.data.destination}`);
  }

  private async updateTransactionStatus(transactionHash: string, status: string): Promise<void> {
    // In a real implementation, you'd update the transaction status in database
    // This is crucial for showing users when their transactions are confirmed
    
    this.logger.debug(`Transaction ${transactionHash} status updated to: ${status}`);
  }

  // Utility method to check if an account needs trustlines before trading
  async ensureTrustlinesForTrade(publicKey: string, secretKey: string, assetCode: string, assetIssuer: string): Promise<boolean> {
    try {
      if (assetCode === 'XLM') {
        return true; // No trustline needed for native asset
      }

      const asset = new (await import('stellar-sdk')).Asset(assetCode, assetIssuer);
      const result = await this.trustlineService.autoCreateTrustlineForTrade(publicKey, secretKey, asset);
      
      if (!result.success) {
        this.logger.error(`Failed to ensure trustline for ${assetCode}: ${result.error}`);
        return false;
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Error ensuring trustlines for trade:`, error);
      return false;
    }
  }
}