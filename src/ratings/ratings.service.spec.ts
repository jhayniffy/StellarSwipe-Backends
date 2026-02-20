import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RatingsService } from './ratings.service';
import { ProviderRating } from './entities/provider-rating.entity';

describe('RatingsService', () => {
  let service: RatingsService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatingsService,
        {
          provide: getRepositoryToken(ProviderRating),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<RatingsService>(RatingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitRating', () => {
    it('should create new rating', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({ stars: 5, review: 'Great!' });
      mockRepository.save.mockResolvedValue({ id: '1', stars: 5, review: 'Great!' });

      const result = await service.submitRating('user-1', 'provider-1', {
        stars: 5,
        review: 'Great!',
      });

      expect(result.stars).toBe(5);
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should update existing rating', async () => {
      const existing = { id: '1', stars: 3, review: 'Good' };
      mockRepository.findOne.mockResolvedValue(existing);
      mockRepository.save.mockResolvedValue({ ...existing, stars: 5 });

      const result = await service.submitRating('user-1', 'provider-1', {
        stars: 5,
      });

      expect(result.stars).toBe(5);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('getRatingSummary', () => {
    it('should calculate average rating correctly', async () => {
      mockRepository.find.mockResolvedValue([
        { stars: 5 },
        { stars: 4 },
        { stars: 3 },
      ]);

      const result = await service.getRatingSummary('provider-1');

      expect(result.averageRating).toBe(4);
      expect(result.totalRatings).toBe(3);
    });

    it('should return zero for no ratings', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getRatingSummary('provider-1');

      expect(result.averageRating).toBe(0);
      expect(result.totalRatings).toBe(0);
    });
  });
});