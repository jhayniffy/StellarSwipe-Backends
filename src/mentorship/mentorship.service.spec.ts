import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MentorshipService } from './mentorship.service';
import { MentorshipRequest } from './entities/mentorship-request.entity';
import { createMockRepository } from '../../test/utils/test-helpers';

describe('MentorshipService', () => {
  let service: MentorshipService;
  let mockRepository: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    mockRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MentorshipService,
        { provide: getRepositoryToken(MentorshipRequest), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<MentorshipService>(MentorshipService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create mentorship request', async () => {
    const dto = { mentorId: 'mentor-123', menteeId: 'mentee-123', message: 'Help' };
    mockRepository.create.mockReturnValue(dto);
    mockRepository.save.mockResolvedValue({ id: '1', ...dto });

    const result = await service.createRequest(dto);

    expect(result.id).toBe('1');
  });

  it('should find requests by mentor', async () => {
    mockRepository.find.mockResolvedValue([{ mentorId: 'mentor-123' }]);

    const result = await service.findByMentor('mentor-123');

    expect(result).toHaveLength(1);
  });

  it('should accept request', async () => {
    mockRepository.findOne.mockResolvedValue({ id: '1', status: 'pending' });
    mockRepository.save.mockResolvedValue({ id: '1', status: 'accepted' });

    const result = await service.acceptRequest('1');

    expect(result.status).toBe('accepted');
  });
});
