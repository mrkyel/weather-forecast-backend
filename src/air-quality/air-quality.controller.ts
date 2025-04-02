import {
  Controller,
  Get,
  Query,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AirQualityService } from './air-quality.service';
import { AirQualityResult } from './types/air-quality.types';

class AirQualityResponseDto implements AirQualityResult {
  sidoName: string;
  stationName: string;
  pm10Value: number;
  pm25Value: number;
  pm10Grade: string;
  pm25Grade: string;
  dataTime: string;
  gradeEmoji: string;
  backgroundColor: string;
  warningMessage: string;
  temperature?: number;
  feelsLike?: number;
  weatherIcon?: string;
  weatherDescription?: string;
}

@ApiTags('air-quality')
@Controller('air-quality')
export class AirQualityController {
  private readonly logger = new Logger(AirQualityController.name);

  constructor(private readonly airQualityService: AirQualityService) {}

  @Get()
  @ApiOperation({ summary: '대기질 정보 조회' })
  @ApiQuery({ name: 'latitude', required: true, description: '위도' })
  @ApiQuery({ name: 'longitude', required: true, description: '경도' })
  @ApiResponse({
    status: 200,
    description: '대기질 정보',
    type: AirQualityResponseDto,
  })
  async getAirQuality(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
  ): Promise<AirQualityResult> {
    try {
      this.logger.log(`Received coordinates: ${latitude}, ${longitude}`);

      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);

      if (isNaN(lat) || isNaN(lon)) {
        throw new HttpException(
          'Invalid coordinates provided',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.airQualityService.getAirQuality(lat, lon);
      return result;
    } catch (error) {
      this.logger.error('Error in getAirQuality:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch air quality data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
