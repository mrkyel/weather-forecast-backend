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
    @Query() query: Record<string, string>,
  ): Promise<AirQualityResult> {
    try {
      const { latitude, longitude } = query;

      this.logger.debug(`Raw query received:`, JSON.stringify(query, null, 2));

      this.logger.debug(
        `Raw coordinates received: latitude=${latitude}, longitude=${longitude}`,
      );

      if (!latitude || !longitude) {
        this.logger.error('Missing coordinates');
        throw new HttpException(
          '위도와 경도가 필요합니다.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);

      this.logger.debug(`Parsed coordinates: lat=${lat}, lon=${lon}`);

      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        this.logger.error(`Invalid coordinates: lat=${lat}, lon=${lon}`);
        throw new HttpException(
          '유효하지 않은 좌표값입니다.',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        this.logger.error(`Coordinates out of range: lat=${lat}, lon=${lon}`);
        throw new HttpException(
          '좌표값이 허용 범위를 벗어났습니다.',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 한국 좌표 범위 검증 (위도: 33° ~ 38°, 경도: 124° ~ 131°)
      if (lat < 33 || lat > 38 || lon < 124 || lon > 131) {
        this.logger.error(`Coordinates outside Korea: lat=${lat}, lon=${lon}`);
        throw new HttpException(
          '한국 영역을 벗어난 좌표입니다.',
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.debug(
        `Calling service with coordinates: lat=${lat}, lon=${lon}`,
      );

      try {
        const result = await this.airQualityService.getAirQuality(lat, lon);
        this.logger.debug(
          'Service returned result successfully:',
          JSON.stringify(result, null, 2),
        );
        return result;
      } catch (serviceError) {
        this.logger.error('Service error:', serviceError);
        throw new HttpException(
          serviceError instanceof Error
            ? serviceError.message
            : '대기질 정보를 가져오는데 실패했습니다.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } catch (error) {
      this.logger.error('Error in getAirQuality:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error instanceof Error
          ? error.message
          : '대기질 정보를 가져오는데 실패했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
