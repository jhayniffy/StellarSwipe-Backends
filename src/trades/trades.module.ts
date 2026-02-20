import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trade } from './entities/trade.entity';
import { TradesController } from './trades.controller';
import { TradesService } from './trades.service';
import { RiskManagerService } from './services/risk-manager.service';
import { TradeExecutorService } from './services/trade-executor.service';
import { StellarConfigService } from '../config/stellar.service';
import { RiskManagerModule } from '../risk/risk-manager.module';
import { BullModule } from '@nestjs/bull';
import { WebsocketModule } from '../websocket/websocket.module';
import { TxMonitorService } from './services/tx-monitor.service';
import { MonitorTransactionsJob } from './jobs/monitor-transactions.job';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trade]),
    RiskManagerModule,
    BullModule.registerQueue({
      name: 'transactions',
    }),
    WebsocketModule,
  ],
  controllers: [TradesController],
  providers: [
    TradesService,
    RiskManagerService,
    TradeExecutorService,
    StellarConfigService,
    TxMonitorService,
    MonitorTransactionsJob,
  ],
  exports: [TradesService, RiskManagerService],
})
export class TradesModule { }
