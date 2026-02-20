import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ComplianceLog } from '../entities/compliance-log.entity';

interface ComplianceReport {
  totalBlocked: number;
  totalAllowed: number;
  sanctionsHits: number;
  topBlockedCountries: { country: string; count: number }[];
  topBlockedIPs: { ip: string; count: number }[];
  blockReasons: { reason: string; count: number }[];
}

@Injectable()
export class ComplianceReportingService {
  constructor(
    @InjectRepository(ComplianceLog)
    private logRepository: Repository<ComplianceLog>,
  ) {}

  async logAccess(data: {
    type: 'access_blocked' | 'access_allowed' | 'sanctions_hit';
    ipAddress: string;
    countryCode?: string;
    reason?: string;
    path?: string;
    method?: string;
    userId?: string;
    walletAddress?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const log = this.logRepository.create(data);
    await this.logRepository.save(log);
  }

  async generateReport(startDate: Date, endDate: Date): Promise<ComplianceReport> {
    const logs = await this.logRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
    });

    const blocked = logs.filter(l => l.type === 'access_blocked');
    const allowed = logs.filter(l => l.type === 'access_allowed');
    const sanctions = logs.filter(l => l.type === 'sanctions_hit');

    const countryMap = new Map<string, number>();
    const ipMap = new Map<string, number>();
    const reasonMap = new Map<string, number>();

    blocked.forEach(log => {
      if (log.countryCode) {
        countryMap.set(log.countryCode, (countryMap.get(log.countryCode) || 0) + 1);
      }
      ipMap.set(log.ipAddress, (ipMap.get(log.ipAddress) || 0) + 1);
      if (log.reason) {
        reasonMap.set(log.reason, (reasonMap.get(log.reason) || 0) + 1);
      }
    });

    return {
      totalBlocked: blocked.length,
      totalAllowed: allowed.length,
      sanctionsHits: sanctions.length,
      topBlockedCountries: Array.from(countryMap.entries())
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topBlockedIPs: Array.from(ipMap.entries())
        .map(([ip, count]) => ({ ip, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      blockReasons: Array.from(reasonMap.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  async getRecentBlocks(limit: number = 100): Promise<ComplianceLog[]> {
    return this.logRepository.find({
      where: { type: 'access_blocked' },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}