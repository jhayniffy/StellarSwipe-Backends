import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

interface SanctionsCheckResult {
  isBlocked: boolean;
  reason?: string;
  matchedEntity?: string;
}

interface BlockedEntity {
  id: string;
  name: string;
  type: 'individual' | 'entity' | 'address';
  identifier: string; // wallet address, email, etc.
  reason: string;
  addedAt: Date;
}

@Injectable()
export class SanctionsScreeningService {
  private blockedWallets: Set<string> = new Set();
  private blockedEmails: Set<string> = new Set();

  constructor() {
    this.initializeBlockedLists();
  }

  private initializeBlockedLists(): void {
    // OFAC SDN (Specially Designated Nationals) addresses
    // These are example addresses - in production, sync with OFAC API
    const knownSanctionedAddresses = [
      // Tornado Cash addresses (sanctioned by OFAC)
      '0x8589427373D6D84E98730D7795D8f6f8731FDA16',
      '0x722122dF12D4e14e13Ac3b6895a86e84145b6967',
      // Add more sanctioned addresses
    ];

    knownSanctionedAddresses.forEach(addr => 
      this.blockedWallets.add(addr.toLowerCase())
    );
  }

  async screenWalletAddress(address: string): Promise<SanctionsCheckResult> {
    const normalized = address.toLowerCase();

    if (this.blockedWallets.has(normalized)) {
      return {
        isBlocked: true,
        reason: 'Wallet address appears on OFAC sanctions list',
        matchedEntity: address,
      };
    }

    return { isBlocked: false };
  }

  async screenEmail(email: string): Promise<SanctionsCheckResult> {
    const normalized = email.toLowerCase();

    if (this.blockedEmails.has(normalized)) {
      return {
        isBlocked: true,
        reason: 'Email associated with sanctioned entity',
        matchedEntity: email,
      };
    }

    return { isBlocked: false };
  }

  async screenUser(data: {
    walletAddress?: string;
    email?: string;
    name?: string;
  }): Promise<SanctionsCheckResult> {
    if (data.walletAddress) {
      const walletCheck = await this.screenWalletAddress(data.walletAddress);
      if (walletCheck.isBlocked) return walletCheck;
    }

    if (data.email) {
      const emailCheck = await this.screenEmail(data.email);
      if (emailCheck.isBlocked) return emailCheck;
    }

    return { isBlocked: false };
  }

  addBlockedWallet(address: string, reason: string): void {
    this.blockedWallets.add(address.toLowerCase());
  }

  addBlockedEmail(email: string, reason: string): void {
    this.blockedEmails.add(email.toLowerCase());
  }

  removeBlockedWallet(address: string): void {
    this.blockedWallets.delete(address.toLowerCase());
  }

  getBlockedWalletsCount(): number {
    return this.blockedWallets.size;
  }

  getBlockedEmailsCount(): number {
    return this.blockedEmails.size;
  }
}