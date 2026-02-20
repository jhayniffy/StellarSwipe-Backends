import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { StellarConfigService } from '../config/stellar.service';
import { CacheModule } from '../cache/cache.module';
import { AccountManagerService } from './account/account-manager.service';
import { ReserveCalculatorService } from './account/reserve-calculator.service';
import { TrustlineService } from './trustlines/trustline.service';
import { TrustlineController } from './trustlines/trustline.controller';
import { HorizonStreamController } from './services/horizon-stream.controller';
import { HorizonStreamService } from './services/horizon-stream.service';
import { EventProcessorService } from './services/event-processor.service';
import { StellarIntegrationService } from './services/stellar-integration.service';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
    CacheModule,
  ],
  controllers: [TrustlineController, HorizonStreamController],
  providers: [
    StellarConfigService,
    ReserveCalculatorService,
    AccountManagerService,
    TrustlineService,
    HorizonStreamService,
    EventProcessorService,
    StellarIntegrationService,
  ],
  exports: [
    StellarConfigService,
    AccountManagerService,
    TrustlineService,
    ReserveCalculatorService,
    HorizonStreamService,
    EventProcessorService,
    StellarIntegrationService,
  ],
})
export class StellarModule {}