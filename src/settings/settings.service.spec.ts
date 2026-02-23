import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SettingsService } from './settings.service';
import { UserSettings } from './entities/user-settings.entity';
import { createMockRepository } from '../../test/utils/test-helpers';

describe('SettingsService', () => {
  let service: SettingsService;
  let mockRepository: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    mockRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: getRepositoryToken(UserSettings), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should get user settings', async () => {
    mockRepository.findOne.mockResolvedValue({
      userId: 'user-123',
      language: 'en',
      theme: 'dark',
    });

    const result = await service.getUserSettings('user-123');

    expect(result.language).toBe('en');
  });

  it('should create default settings if not found', async () => {
    mockRepository.findOne.mockResolvedValue(null);
    mockRepository.create.mockReturnValue({ userId: 'user-123' });
    mockRepository.save.mockResolvedValue({ userId: 'user-123', language: 'en' });

    const result = await service.getUserSettings('user-123');

    expect(result.userId).toBe('user-123');
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('should update settings', async () => {
    mockRepository.findOne.mockResolvedValue({ userId: 'user-123' });
    mockRepository.save.mockResolvedValue({ userId: 'user-123', theme: 'light' });

    const result = await service.updateSettings('user-123', { theme: 'light' });

    expect(result.theme).toBe('light');
  });
});
