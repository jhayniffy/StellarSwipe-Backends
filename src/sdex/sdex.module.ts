import { Module } from '@nestjs/common';
import { SdexService } from './sdex.service';
import { CacheModule } from '../cache/cache.module';
import { StellarConfigService } from '../config/stellar.service';

@Module({
  imports: [CacheModule],
  providers: [SdexService, StellarConfigService],
  exports: [SdexService],
})
export class SdexModule {}
