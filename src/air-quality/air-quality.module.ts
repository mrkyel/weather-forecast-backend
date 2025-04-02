import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { AirQualityController } from './air-quality.controller';
import { AirQualityService } from './air-quality.service';

@Module({
  imports: [
    ConfigModule,
    CacheModule.register({
      ttl: 900000, // 15분
      max: 100, // 최대 캐시 항목 수
    }),
  ],
  controllers: [AirQualityController],
  providers: [AirQualityService],
  exports: [AirQualityService],
})
export class AirQualityModule {}
