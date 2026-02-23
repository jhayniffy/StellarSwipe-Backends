import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubscriptionsService } from './subscriptions.service';
import { Subscription } from './entities/subscription.entity';
import { createMockRepository } from '../../test/utils/test-helpers';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let mockRepository: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    mockRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: getRepositoryToken(Subscription), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create subscription', async () => {
    const dto = { userId: 'user-123', providerId: 'provider-123', tier: 'premium' };
    mockRepository.create.mockReturnValue(dto);
    mockRepository.save.mockResolvedValue({ id: '1', ...dto });

    const result = await service.subscribe(dto);

    expect(result.id).toBe('1');
  });

  it('should find active subscriptions', async () => {
    mockRepository.find.mockResolvedValue([
      { userId: 'user-123', status: 'active' },
    ]);

    const result = await service.findActiveSubscriptions('user-123');

    expect(result).toHaveLength(1);
  });

  it('should cancel subscription', async () => {
    mockRepository.findOne.mockResolvedValue({ id: '1', status: 'active' });
    mockRepository.save.mockResolvedValue({ id: '1', status: 'cancelled' });

    const result = await service.cancel('1');

    expect(result.status).toBe('cancelled');
  });

  it('should check subscription access', async () => {
    mockRepository.findOne.mockResolvedValue({
      userId: 'user-123',
      providerId: 'provider-123',
      status: 'active',
    });

    const result = await service.hasAccess('user-123', 'provider-123');

    expect(result).toBe(true);
  });
});
