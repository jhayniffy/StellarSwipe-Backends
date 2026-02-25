import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContestsService } from './contests.service';
import { Contest, ContestMetric, ContestStatus } from './entities/contest.entity';
import { Signal, SignalStatus } from '../signals/entities/signal.entity';
import { User } from '../users/entities/user.entity';

describe('ContestsService', () => {
  let service: ContestsService;
  let contestRepository: Repository<Contest>;
  let signalRepository: Repository<Signal>;
  let userRepository: Repository<User>;
  let eventEmitter: EventEmitter2;

  const mockContestRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockSignalRepository = {
    find: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContestsService,
        {
          provide: getRepositoryToken(Contest),
          useValue: mockContestRepository,
        },
        {
          provide: getRepositoryToken(Signal),
          useValue: mockSignalRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<ContestsService>(ContestsService);
    contestRepository = module.get(getRepositoryToken(Contest));
    signalRepository = module.get(getRepositoryToken(Signal));
    userRepository = module.get(getRepositoryToken(User));
    eventEmitter = module.get(EventEmitter2);

    jest.clearAllMocks();
  });

  describe('createContest', () => {
    it('should create a contest successfully', async () => {
      const dto = {
        name: 'Weekly ROI Challenge',
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 604800000).toISOString(),
        metric: ContestMetric.HIGHEST_ROI,
        minSignals: 3,
        prizePool: '1000',
      };

      const mockContest = {
        id: 'contest-1',
        ...dto,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        status: ContestStatus.ACTIVE,
        winners: null,
      };

      mockContestRepository.create.mockReturnValue(mockContest);
      mockContestRepository.save.mockResolvedValue(mockContest);

      const result = await service.createContest(dto);

      expect(result).toEqual(mockContest);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('contest.created', expect.any(Object));
    });

    it('should throw error if end time is before start time', async () => {
      const dto = {
        name: 'Invalid Contest',
        startTime: new Date(Date.now() + 604800000).toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
        metric: ContestMetric.HIGHEST_ROI,
        minSignals: 3,
        prizePool: '1000',
      };

      await expect(service.createContest(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if start time is in the past', async () => {
      const dto = {
        name: 'Past Contest',
        startTime: new Date(Date.now() - 86400000).toISOString(),
        endTime: new Date(Date.now() + 604800000).toISOString(),
        metric: ContestMetric.HIGHEST_ROI,
        minSignals: 3,
        prizePool: '1000',
      };

      await expect(service.createContest(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('finalizeContest', () => {
    it('should finalize contest with qualified winners', async () => {
      const contestId = 'contest-1';
      const contest = {
        id: contestId,
        name: 'Test Contest',
        startTime: new Date(Date.now() - 604800000),
        endTime: new Date(Date.now() - 86400000),
        metric: ContestMetric.HIGHEST_ROI,
        minSignals: 3,
        prizePool: '1000',
        status: ContestStatus.ACTIVE,
        winners: null,
      };

      const signals = [
        {
          id: 'signal-1',
          providerId: 'provider-1',
          status: SignalStatus.CLOSED,
          entryPrice: '100',
          closePrice: '120',
          totalCopiedVolume: '1000',
          totalProfitLoss: '200',
          createdAt: new Date(Date.now() - 500000000),
        },
        {
          id: 'signal-2',
          providerId: 'provider-1',
          status: SignalStatus.CLOSED,
          entryPrice: '100',
          closePrice: '110',
          totalCopiedVolume: '500',
          totalProfitLoss: '100',
          createdAt: new Date(Date.now() - 500000000),
        },
        {
          id: 'signal-3',
          providerId: 'provider-1',
          status: SignalStatus.CLOSED,
          entryPrice: '100',
          closePrice: '105',
          totalCopiedVolume: '300',
          totalProfitLoss: '50',
          createdAt: new Date(Date.now() - 500000000),
        },
      ];

      mockContestRepository.findOne.mockResolvedValue(contest);
      mockSignalRepository.find.mockResolvedValue(signals);
      mockUserRepository.findOne.mockResolvedValue({ followers: [] });
      mockContestRepository.save.mockResolvedValue({
        ...contest,
        status: ContestStatus.FINALIZED,
        winners: ['provider-1'],
      });

      const result = await service.finalizeContest(contestId);

      expect(result.winners).toHaveLength(1);
      expect(result.winners[0]).toBe('provider-1');
      expect(result.prizes['provider-1']).toBe('1000.00000000');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('contest.finalized', expect.any(Object));
    });

    it('should handle no qualified entries', async () => {
      const contestId = 'contest-1';
      const contest = {
        id: contestId,
        name: 'Test Contest',
        startTime: new Date(Date.now() - 604800000),
        endTime: new Date(Date.now() - 86400000),
        metric: ContestMetric.HIGHEST_ROI,
        minSignals: 5,
        prizePool: '1000',
        status: ContestStatus.ACTIVE,
        winners: null,
      };

      mockContestRepository.findOne.mockResolvedValue(contest);
      mockSignalRepository.find.mockResolvedValue([]);
      mockContestRepository.save.mockResolvedValue({
        ...contest,
        status: ContestStatus.FINALIZED,
        winners: [],
      });

      const result = await service.finalizeContest(contestId);

      expect(result.winners).toHaveLength(0);
      expect(result.prizes).toEqual({});
    });

    it('should throw error if contest not ended', async () => {
      const contestId = 'contest-1';
      const contest = {
        id: contestId,
        endTime: new Date(Date.now() + 86400000),
        status: ContestStatus.ACTIVE,
      };

      mockContestRepository.findOne.mockResolvedValue(contest);

      await expect(service.finalizeContest(contestId)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if already finalized', async () => {
      const contestId = 'contest-1';
      const contest = {
        id: contestId,
        endTime: new Date(Date.now() - 86400000),
        status: ContestStatus.FINALIZED,
      };

      mockContestRepository.findOne.mockResolvedValue(contest);

      await expect(service.finalizeContest(contestId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getContestLeaderboard', () => {
    it('should return sorted leaderboard', async () => {
      const contestId = 'contest-1';
      const contest = {
        id: contestId,
        name: 'Test Contest',
        startTime: new Date(Date.now() - 604800000),
        endTime: new Date(Date.now() + 86400000),
        metric: ContestMetric.HIGHEST_ROI,
        minSignals: 1,
        prizePool: '1000',
        status: ContestStatus.ACTIVE,
        winners: null,
      };

      const signals = [
        {
          id: 'signal-1',
          providerId: 'provider-1',
          status: SignalStatus.CLOSED,
          entryPrice: '100',
          closePrice: '150',
          totalCopiedVolume: '1000',
          totalProfitLoss: '500',
          createdAt: new Date(Date.now() - 500000000),
        },
        {
          id: 'signal-2',
          providerId: 'provider-2',
          status: SignalStatus.CLOSED,
          entryPrice: '100',
          closePrice: '130',
          totalCopiedVolume: '800',
          totalProfitLoss: '300',
          createdAt: new Date(Date.now() - 500000000),
        },
      ];

      mockContestRepository.findOne.mockResolvedValue(contest);
      mockSignalRepository.find.mockResolvedValue(signals);
      mockUserRepository.findOne.mockResolvedValue({ followers: [] });

      const result = await service.getContestLeaderboard(contestId);

      expect(result.entries).toHaveLength(2);
      expect(parseFloat(result.entries[0].score)).toBeGreaterThan(
        parseFloat(result.entries[1].score),
      );
    });
  });

  describe('getProviderContestStats', () => {
    it('should return provider contest statistics', async () => {
      const providerId = 'provider-1';
      const contests = [
        {
          id: 'contest-1',
          status: ContestStatus.FINALIZED,
          winners: ['provider-1', 'provider-2'],
          prizePool: '1000',
          startTime: new Date(Date.now() - 1000000000),
          endTime: new Date(Date.now() - 500000000),
        },
        {
          id: 'contest-2',
          status: ContestStatus.ACTIVE,
          winners: null,
          prizePool: '500',
          startTime: new Date(Date.now() - 100000000),
          endTime: new Date(Date.now() + 100000000),
        },
      ];

      mockContestRepository.find.mockResolvedValue(contests);
      mockSignalRepository.find.mockResolvedValue([
        { id: 'signal-1', providerId, createdAt: new Date() },
      ]);
      mockUserRepository.findOne.mockResolvedValue({ followers: [] });

      const result = await service.getProviderContestStats(providerId);

      expect(result.totalContests).toBe(2);
      expect(result.wins).toBe(1);
      expect(result.activeContests).toBe(1);
    });
  });
});
