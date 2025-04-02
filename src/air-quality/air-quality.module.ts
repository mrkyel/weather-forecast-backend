import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AirQualityController } from './air-quality.controller';
import { AirQualityService } from './air-quality.service';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [ConfigModule, CacheModule.register(), HttpModule],
  controllers: [AirQualityController],
  providers: [AirQualityService],
  exports: [AirQualityService],
})
export class AirQualityModule {}
