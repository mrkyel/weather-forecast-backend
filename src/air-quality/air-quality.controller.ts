import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AirQualityService } from './air-quality.service';
import { AirQualityDto } from './dto/air-quality.dto';

@ApiTags('air-quality')
@Controller('air-quality')
export class AirQualityController {
  constructor(private readonly airQualityService: AirQualityService) {}

  @Get()
  @ApiOperation({ summary: '현재 위치의 대기질 정보 조회' })
  @ApiQuery({
    name: 'lat',
    required: true,
    type: Number,
    description: '위도',
  })
  @ApiQuery({
    name: 'lng',
    required: true,
    type: Number,
    description: '경도',
  })
  @ApiResponse({
    status: 200,
    description: '대기질 정보',
    type: AirQualityDto,
  })
  async getAirQuality(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
  ): Promise<AirQualityDto> {
    return this.airQualityService.getAirQuality(lat, lng);
  }
}
