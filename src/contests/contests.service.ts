import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Contest,
  ContestMetric,
  ContestStatus,
} from './entities/contest.entity';
import { Signal, SignalStatus } from '../signals/entities/signal.entity';
import { User } from '../users/entities/user.entity';
import {
  CreateContestDto,
  ContestEntryDto,
  ContestLeaderboardDto,
} from './dto/contest.dto';

interface ContestEntry {
  provider: string;
  signalsSubmitted: string[];
  totalRoi: number;
  successRate: number;
  totalVolume: number;
  followerCount: number;
}

@Injectable()
export class ContestsService {
  private readonly logger = new Logger(ContestsService.name);

  constructor(
    @InjectRepository(Contest)
    private readonly contestRepository: Repository<Contest>,
    @InjectRepository(Signal)
    private readonly signalRepository: Repository<Signal>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createContest(dto: CreateContestDto): Promise<Contest> {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    if (startTime < new Date()) {
      throw new BadRequestException('Start time must be in the future');
    }

    const contest = this.contestRepository.create({
      name: dto.name,
      startTime,
      endTime,
      metric: dto.metric,
      minSignals: dto.minSignals,
      prizePool: dto.prizePool,
      status: ContestStatus.ACTIVE,
      winners: null,
    });

    const saved = await this.contestRepository.save(contest);
    
    this.eventEmitter.emit('contest.created', {
      contestId: saved.id,
      name: saved.name,
      startTime: saved.startTime,
      endTime: saved.endTime,
    });

    this.logger.log(`Contest created: ${saved.id} - ${saved.name}`);
    return saved;
  }

  async getActiveContests(): Promise<Contest[]> {
    const now = new Date();
    return this.contestRepository.find({
      where: {
        status: ContestStatus.ACTIVE,
        startTime: LessThanOrEqual(now),
      },
      order: { startTime: 'DESC' },
    });
  }

  async getContest(id: string): Promise<Contest> {
    const contest = await this.contestRepository.findOne({ where: { id } });
    if (!contest) {
      throw new NotFoundException('Contest not found');
    }
    return contest;
  }

  async getContestLeaderboard(
    contestId: string,
  ): Promise<ContestLeaderboardDto> {
    const contest = await this.getContest(contestId);
    const entries = await this.calculateContestEntries(contest);

    const sortedEntries = entries
      .map((entry) => ({
        provider: entry.provider,
        signalsSubmitted: entry.signalsSubmitted,
        totalRoi: entry.totalRoi.toFixed(8),
        successRate: entry.successRate,
        totalVolume: entry.totalVolume.toFixed(8),
        score: this.calculateScore(entry, contest.metric).toFixed(8),
      }))
      .sort((a, b) => parseFloat(b.score) - parseFloat(a.score));

    return {
      contestId: contest.id,
      contestName: contest.name,
      metric: contest.metric,
      entries: sortedEntries,
      winners: contest.winners,
      status: contest.status,
      endTime: contest.endTime,
    };
  }

  async finalizeContest(
    contestId: string,
  ): Promise<{ winners: string[]; prizes: Record<string, string> }> {
    const contest = await this.getContest(contestId);
    const now = new Date();

    if (now < contest.endTime) {
      throw new BadRequestException('Contest has not ended yet');
    }

    if (contest.status === ContestStatus.FINALIZED) {
      throw new BadRequestException('Contest already finalized');
    }

    const entries = await this.calculateContestEntries(contest);
    const qualifiedEntries = entries.filter(
      (e) => e.signalsSubmitted.length >= contest.minSignals,
    );

    if (qualifiedEntries.length === 0) {
      contest.status = ContestStatus.FINALIZED;
      contest.winners = [];
      await this.contestRepository.save(contest);
      
      this.logger.warn(`Contest ${contestId} finalized with no qualified entries`);
      this.eventEmitter.emit('contest.finalized', {
        contestId,
        winners: [],
        noQualifiedEntries: true,
      });
      
      return { winners: [], prizes: {} };
    }

    const sortedEntries = qualifiedEntries
      .map((entry) => ({
        provider: entry.provider,
        score: this.calculateScore(entry, contest.metric),
      }))
      .sort((a, b) => b.score - a.score);

    // Handle ties by grouping same scores
    const winners = this.selectWinnersWithTieHandling(sortedEntries);
    const prizes = this.distributePrizes(winners, contest.prizePool);

    contest.winners = winners;
    contest.status = ContestStatus.FINALIZED;
    await this.contestRepository.save(contest);

    this.logger.log(`Contest ${contestId} finalized with ${winners.length} winners`);
    this.eventEmitter.emit('contest.finalized', {
      contestId,
      winners,
      prizes,
    });

    return { winners, prizes };
  }

  private selectWinnersWithTieHandling(
    sortedEntries: Array<{ provider: string; score: number }>,
  ): string[] {
    if (sortedEntries.length === 0) return [];

    const winners: string[] = [];
    const scoreGroups = new Map<number, string[]>();

    // Group by score
    for (const entry of sortedEntries) {
      const group = scoreGroups.get(entry.score) || [];
      group.push(entry.provider);
      scoreGroups.set(entry.score, group);
    }

    const uniqueScores = Array.from(scoreGroups.keys()).sort((a, b) => b - a);

    // Select top 3 positions, handling ties
    for (const score of uniqueScores) {
      const providers = scoreGroups.get(score)!;
      winners.push(...providers);
      if (winners.length >= 3) break;
    }

    return winners.slice(0, 3);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async autoFinalizeExpiredContests() {
    const now = new Date();
    const expiredContests = await this.contestRepository.find({
      where: {
        status: ContestStatus.ACTIVE,
        endTime: LessThanOrEqual(now),
      },
    });

    this.logger.log(`Found ${expiredContests.length} expired contests to finalize`);

    for (const contest of expiredContests) {
      try {
        await this.finalizeContest(contest.id);
      } catch (error) {
        this.logger.error(
          `Failed to auto-finalize contest ${contest.id}: ${error.message}`,
        );
      }
    }
  }

  private async calculateContestEntries(
    contest: Contest,
  ): Promise<ContestEntry[]> {
    const signals = await this.signalRepository.find({
      where: {
        createdAt: Between(contest.startTime, contest.endTime),
      },
      relations: ['provider'],
    });

    const entriesMap = new Map<string, ContestEntry>();

    for (const signal of signals) {
      const providerId = signal.providerId;

      if (!entriesMap.has(providerId)) {
        const followerCount = await this.getFollowerCount(providerId);
        entriesMap.set(providerId, {
          provider: providerId,
          signalsSubmitted: [],
          totalRoi: 0,
          successRate: 0,
          totalVolume: 0,
          followerCount,
        });
      }

      const entry = entriesMap.get(providerId)!;
      entry.signalsSubmitted.push(signal.id);

      if (signal.status === SignalStatus.CLOSED) {
        const roi = this.calculateSignalROI(signal);
        entry.totalRoi += roi;
        entry.totalVolume += parseFloat(signal.totalCopiedVolume || '0');
      }
    }

    for (const entry of entriesMap.values()) {
      const closedSignals = entry.signalsSubmitted.filter((id) => {
        const signal = signals.find((s) => s.id === id);
        return signal && signal.status === SignalStatus.CLOSED;
      });

      if (closedSignals.length > 0) {
        const successfulSignals = closedSignals.filter((id) => {
          const signal = signals.find((s) => s.id === id);
          return signal && parseFloat(signal.totalProfitLoss || '0') > 0;
        });
        entry.successRate =
          (successfulSignals.length / closedSignals.length) * 100;
      }
    }

    return Array.from(entriesMap.values());
  }

  private async getFollowerCount(providerId: string): Promise<number> {
    // TODO: Implement follower count from followers table when available
    // For now, return 0 as follower count is not critical for other metrics
    return 0;
  }

  private calculateSignalROI(signal: Signal): number {
    const entryPrice = parseFloat(signal.entryPrice || '0');
    const closePrice = parseFloat(signal.closePrice || '0');

    if (entryPrice === 0) return 0;

    return ((closePrice - entryPrice) / entryPrice) * 100;
  }

  private calculateScore(entry: ContestEntry, metric: ContestMetric): number {
    switch (metric) {
      case ContestMetric.HIGHEST_ROI:
        return entry.totalRoi;
      case ContestMetric.BEST_SUCCESS_RATE:
        return entry.successRate;
      case ContestMetric.MOST_VOLUME:
        return entry.totalVolume;
      case ContestMetric.MOST_FOLLOWERS:
        return entry.followerCount;
      default:
        return 0;
    }
  }

  private distributePrizes(
    winners: string[],
    prizePool: string,
  ): Record<string, string> {
    const total = parseFloat(prizePool);
    const prizes: Record<string, string> = {};

    if (winners.length === 0) return prizes;

    // Handle ties - split prize equally among tied winners
    if (winners.length === 1) {
      prizes[winners[0]] = total.toFixed(8);
    } else if (winners.length === 2) {
      prizes[winners[0]] = (total * 0.6).toFixed(8);
      prizes[winners[1]] = (total * 0.4).toFixed(8);
    } else {
      prizes[winners[0]] = (total * 0.5).toFixed(8);
      prizes[winners[1]] = (total * 0.3).toFixed(8);
      prizes[winners[2]] = (total * 0.2).toFixed(8);
    }

    return prizes;
  }

  async getProviderContestStats(providerId: string): Promise<{
    totalContests: number;
    wins: number;
    totalPrizes: string;
    activeContests: number;
  }> {
    const allContests = await this.contestRepository.find();
    
    let wins = 0;
    let totalPrizes = 0;
    let activeContests = 0;

    for (const contest of allContests) {
      if (contest.status === ContestStatus.ACTIVE) {
        const entries = await this.calculateContestEntries(contest);
        const providerEntry = entries.find((e) => e.provider === providerId);
        if (providerEntry && providerEntry.signalsSubmitted.length > 0) {
          activeContests++;
        }
      }

      if (contest.winners && contest.winners.includes(providerId)) {
        wins++;
        const rank = contest.winners.indexOf(providerId);
        const prizePool = parseFloat(contest.prizePool);
        const prizePercentages = [0.5, 0.3, 0.2];
        totalPrizes += prizePool * prizePercentages[rank];
      }
    }

    return {
      totalContests: allContests.length,
      wins,
      totalPrizes: totalPrizes.toFixed(8),
      activeContests,
    };
  }

  async getAllContests(
    status?: ContestStatus,
    limit: number = 50,
  ): Promise<Contest[]> {
    const query: any = {};
    if (status) {
      query.status = status;
    }

    return this.contestRepository.find({
      where: query,
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
