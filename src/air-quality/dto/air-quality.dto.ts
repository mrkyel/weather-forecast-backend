import { ApiProperty } from '@nestjs/swagger';

export class AirQualityDto {
  @ApiProperty({
    description: 'PM10 수치',
    example: 45,
  })
  pm10Value: number;

  @ApiProperty({
    description: 'PM2.5 수치',
    example: 25,
  })
  pm25Value: number;

  @ApiProperty({
    description: 'PM10 등급',
    example: 2,
  })
  pm10Grade: number;

  @ApiProperty({
    description: 'PM2.5 등급',
    example: 2,
  })
  pm25Grade: number;

  @ApiProperty({
    description: '측정 시간',
    example: '2024-03-31 14:00',
  })
  dataTime: string;

  @ApiProperty({
    description: '측정소 이름',
    example: '강남구',
  })
  stationName: string;

  @ApiProperty({
    description: '시도 이름',
    example: '서울특별시',
  })
  sidoName: string;

  @ApiProperty({
    description: '대기질 이모지',
    example: '😊',
  })
  gradeEmoji: string;

  @ApiProperty({
    description: '배경색',
    example: '#FF0000',
  })
  backgroundColor: string;

  @ApiProperty({
    description: '경고 메시지',
    example: '민감군에 영향을 미칠 수 있습니다.',
  })
  warningMessage: string;

  @ApiProperty({
    description: '온도',
    example: 20,
  })
  temperature: number;

  @ApiProperty({
    description: '체감 온도',
    example: 18,
  })
  feelsLike: number;

  @ApiProperty({
    description: '날씨 아이콘',
    example: '☀️',
  })
  weatherIcon: string;

  @ApiProperty({
    description: '날씨 설명',
    example: '맑음',
  })
  weatherDescription: string;
}
