import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SorobanService } from './soroban.service';
import { createMockConfigService } from '../../test/utils/test-helpers';

describe('SorobanService', () => {
  let service: SorobanService;
  let mockConfig: ReturnType<typeof createMockConfigService>;

  beforeEach(async () => {
    mockConfig = createMockConfigService({
      'stellar.sorobanRpcUrl': 'https://soroban-testnet.stellar.org',
      'stellar.networkPassphrase': 'Test SDF Network ; September 2015',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SorobanService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<SorobanService>(SorobanService);
  });

  it('should initialize with config', () => {
    expect(service).toBeDefined();
    expect(mockConfig.get).toHaveBeenCalled();
  });

  it('should invoke contract', async () => {
    const result = await service.invokeContract({
      contractId: 'CABC...',
      method: 'transfer',
      args: [],
    });

    expect(result).toBeDefined();
  });

  it('should handle contract errors', async () => {
    await expect(
      service.invokeContract({
        contractId: 'invalid',
        method: 'fail',
        args: [],
      }),
    ).rejects.toThrow();
  });
});
