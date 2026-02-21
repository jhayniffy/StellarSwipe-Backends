import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

import { appConfig, sentryConfig } from './config/app.config';
import { databaseConfig, redisConfig } from './config/database.config';
import { jwtConfig } from './config/jwt.config';
import { redisCacheConfig } from './config/redis.config';
import { stellarConfig } from './config/stellar.config';
import { xaiConfig } from './config/xai.config';
import configuration from './config/configuration';
import { configSchema } from './config/schemas/config.schema';
import { StellarConfigService } from './config/stellar.service';

import { LoggerModule } from './common/logger';
import { SentryModule } from './common/sentry';
import { CacheModule } from './cache/cache.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SignalsModule } from './signals/signals.module';
import { TradesModule } from './trades/trades.module';
import { ProvidersModule } from './providers/providers.module';
 feature/swipe-103-stellar
import { MlModule } from './ml/ml.module';
import { ValidationModule } from './common/validation/validation.module';
import { ScalingModule } from './scaling/scaling.module';
import { FeesModule } from './fee_management/fees.module';
=======
 main

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        sentryConfig,
        stellarConfig,
        databaseConfig,
        redisConfig,
        redisCacheConfig,
        jwtConfig,
        xaiConfig,
        configuration,
      ],
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      cache: true,
      validationSchema: configSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('redis.host') ?? 'localhost',
          port: configService.get<number>('redis.port') ?? 6379,
          password: configService.get<string>('redis.password'),
          db: configService.get<number>('redis.db') ?? 0,
        },
      }),
    }),
    LoggerModule,
    SentryModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        synchronize: configService.get<boolean>('database.synchronize'),
        logging: configService.get<boolean>('database.logging'),
        entities: ['dist/**/*.entity{.ts,.js}'],
        migrations: ['dist/migrations/*{.ts,.js}'],
        subscribers: ['dist/subscribers/*{.ts,.js}'],
        ssl: configService.get<boolean>('database.ssl') ?? false,
      }),
    }),
    UsersModule,
    SignalsModule,
    TradesModule,
    CacheModule,
    AuthModule,
    ProvidersModule,
 feature/swipe-103-stellar
    MlModule,
    ScalingModule,
    FeesModule,
=======
 main
  ],
  providers: [StellarConfigService],
  exports: [StellarConfigService],
})
export class AppModule {}
