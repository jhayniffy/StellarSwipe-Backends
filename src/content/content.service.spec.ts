import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ContentService } from './content.service';
import { Content } from './entities/content.entity';
import { createMockRepository } from '../../test/utils/test-helpers';

describe('ContentService', () => {
  let service: ContentService;
  let mockRepository: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    mockRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        { provide: getRepositoryToken(Content), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create content', async () => {
    const dto = { title: 'Test', body: 'Content', type: 'article' };
    mockRepository.create.mockReturnValue(dto);
    mockRepository.save.mockResolvedValue({ id: '1', ...dto });

    const result = await service.create(dto);

    expect(result.id).toBe('1');
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('should find all content', async () => {
    mockRepository.find.mockResolvedValue([{ id: '1' }]);

    const result = await service.findAll();

    expect(result).toHaveLength(1);
  });

  it('should find one content', async () => {
    mockRepository.findOneBy.mockResolvedValue({ id: '1' });

    const result = await service.findOne('1');

    expect(result.id).toBe('1');
  });
});
