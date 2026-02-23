import { Test, TestingModule } from '@nestjs/testing';
import { TradesController } from './trades.controller';
import { TradesService } from './trades.service';
import { TradeSide, TradeStatus } from './entities/trade.entity';

describe('TradesController', () => {
  let controller: TradesController;
  let service: jest.Mocked<TradesService>;

  beforeEach(async () => {
    const mockService = {
      executeTrade: jest.fn(),
      closeTrade: jest.fn(),
      getTradeById: jest.fn(),
      getUserTrades: jest.fn(),
      getUserTradesSummary: jest.fn(),
      validateTradePreview: jest.fn(),
      getOpenPositions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TradesController],
      providers: [{ provide: TradesService, useValue: mockService }],
    }).compile();

    controller = module.get<TradesController>(TradesController);
    service = module.get(TradesService);
  });

  it('should execute trade', async () => {
    const dto = {
      userId: 'user-123',
      signalId: 'signal-123',
      side: TradeSide.BUY,
      amount: 100,
      walletAddress: 'GABC...',
    };
    service.executeTrade.mockResolvedValue({
      id: 'trade-123',
      status: TradeStatus.COMPLETED,
    } as any);

    const result = await controller.executeTrade(dto);

    expect(result.id).toBe('trade-123');
    expect(service.executeTrade).toHaveBeenCalledWith(dto);
  });

  it('should close trade', async () => {
    const dto = { tradeId: 'trade-123', userId: 'user-123' };
    service.closeTrade.mockResolvedValue({ id: 'trade-123' } as any);

    const result = await controller.closeTrade(dto);

    expect(result.id).toBe('trade-123');
  });

  it('should get trade by id', async () => {
    service.getTradeById.mockResolvedValue({ id: 'trade-123' } as any);

    const result = await controller.getTradeById('trade-123', 'user-123');

    expect(result.id).toBe('trade-123');
  });
});
