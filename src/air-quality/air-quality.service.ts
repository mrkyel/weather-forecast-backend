import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import {
  AirKoreaQualityResponse,
  AirQualityResult,
} from './types/air-quality.types';

interface WeatherResponse {
  main: {
    temp: number;
    feels_like: number;
  };
  weather: Array<{
    icon: string;
    description: string;
  }>;
}

interface AirKoreaStationResponse {
  response: {
    body: {
      items: Array<{
        stationName: string;
        addr: string;
        tm: number;
        sidoName: string;
      }>;
    };
  };
}

@Injectable()
export class AirQualityService {
  private readonly logger = new Logger(AirQualityService.name);
  private readonly airKoreaApiKey: string;
  private readonly airQualityUrl =
    'https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty';
  private readonly weatherUrl =
    'https://api.openweathermap.org/data/2.5/weather';
  private readonly weatherApiKey: string;

  // 시도 목록
  private readonly sidoList = [
    '서울',
    '부산',
    '대구',
    '인천',
    '광주',
    '대전',
    '울산',
    '경기',
    '강원',
    '충북',
    '충남',
    '전북',
    '전남',
    '경북',
    '경남',
    '제주',
    '세종',
  ];

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.airKoreaApiKey = this.configService.get<string>('AIR_KOREA_API_KEY');
    if (!this.airKoreaApiKey) {
      this.logger.error('AIR_KOREA_API_KEY is not defined');
      throw new Error('AIR_KOREA_API_KEY is not defined');
    }
    this.weatherApiKey = '4a92ff83f5ce3e50f0e3d3f460fa3122';
  }

  private async getWeatherData(
    lat: number,
    lng: number,
  ): Promise<WeatherResponse> {
    try {
      const response = await axios.get<WeatherResponse>(this.weatherUrl, {
        params: {
          lat,
          lon: lng,
          appid: this.weatherApiKey,
          units: 'metric',
          lang: 'kr',
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`날씨 데이터 조회 실패: ${error.message}`);
      }
      throw error;
    }
  }

  private async fetchAirQualityData(lat: number, lng: number) {
    try {
      // 모든 시도의 데이터를 병렬로 조회
      const responses = await Promise.all(
        this.sidoList.map((sido) =>
          axios.get<AirKoreaQualityResponse>(this.airQualityUrl, {
            params: {
              serviceKey: this.airKoreaApiKey,
              returnType: 'json',
              sidoName: sido,
              ver: '1.0',
              numOfRows: '100',
              pageNo: '1',
              dataTerm: 'DAILY',
            },
          }),
        ),
      );

      // 모든 측정소 데이터 합치기
      const allStations = responses.flatMap(
        (response) => response.data.response?.body?.items || [],
      );

      if (allStations.length === 0) {
        throw new Error('미세먼지 정보를 찾을 수 없습니다.');
      }

      // 위도/경도와 가장 가까운 측정소 찾기
      const nearestStation = allStations.reduce((nearest, station) => {
        if (!nearest) return station;

        // 간단한 거리 계산 (맨하탄 거리)
        const currentDist =
          Math.abs(parseFloat(station.dmX || '0') - lng) +
          Math.abs(parseFloat(station.dmY || '0') - lat);
        const nearestDist =
          Math.abs(parseFloat(nearest.dmX || '0') - lng) +
          Math.abs(parseFloat(nearest.dmY || '0') - lat);

        return currentDist < nearestDist ? station : nearest;
      });

      this.logger.debug(
        `Using station: ${nearestStation.stationName} in ${nearestStation.sidoName}`,
      );

      return {
        pm10Value: parseInt(nearestStation.pm10Value) || 0,
        pm25Value: parseInt(nearestStation.pm25Value) || 0,
        pm10Grade: parseInt(nearestStation.pm10Grade) || 1,
        pm25Grade: parseInt(nearestStation.pm25Grade) || 1,
        dataTime: nearestStation.dataTime,
        stationName: nearestStation.stationName,
        sidoName: nearestStation.sidoName,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`대기질 데이터 조회 실패: ${error.message}`);
      }
      throw error;
    }
  }

  async getAirQuality(
    latitude: number,
    longitude: number,
  ): Promise<AirQualityResult> {
    try {
      this.logger.log(
        `Fetching air quality for coordinates: ${latitude}, ${longitude}`,
      );

      // 캐시 키 생성
      const cacheKey = `air-quality:${latitude}:${longitude}`;

      // 캐시된 데이터 확인
      const cachedData = await this.cacheManager.get(cacheKey);
      if (cachedData) {
        this.logger.log('Returning cached data');
        return cachedData;
      }

      // API 호출 및 데이터 처리
      const [airQualityData, weatherData] = await Promise.all([
        this.fetchAirQualityData(latitude, longitude),
        this.getWeatherData(latitude, longitude),
      ]);

      const gradeInfo = this.calculateAirQualityGrade(
        airQualityData.pm10Value,
        airQualityData.pm25Value,
      );

      const result: AirQualityResult = {
        ...airQualityData,
        gradeEmoji: gradeInfo.emoji,
        backgroundColor: gradeInfo.color,
        warningMessage: this.getWarningMessage(gradeInfo.grade),
        temperature: Math.round(weatherData.main.temp),
        feelsLike: Math.round(weatherData.main.feels_like),
        weatherIcon: weatherData.weather[0].icon,
        weatherDescription: weatherData.weather[0].description,
      };

      // 캐시에 데이터 저장
      await this.cacheManager.set(cacheKey, result);

      return result;
    } catch (error) {
      this.logger.error('Error fetching air quality data:', error);
      throw error;
    }
  }

  private calculateAirQualityGrade(
    pm10: number,
    pm25: number,
  ): { grade: string; emoji: string; color: string } {
    // WHO 기준 (2021년 개정)
    const gradeRanges = [
      { grade: '최고 좋음', pm10: 15, pm25: 8, emoji: '😊', color: '#4E7BEE' },
      { grade: '좋음', pm10: 30, pm25: 15, emoji: '🙂', color: '#50A0E5' },
      { grade: '양호', pm10: 40, pm25: 20, emoji: '😐', color: '#53B77C' },
      { grade: '보통', pm10: 50, pm25: 25, emoji: '🤔', color: '#00B700' },
      { grade: '나쁨', pm10: 75, pm25: 37, emoji: '😕', color: '#FF8C00' },
      {
        grade: '상당히 나쁨',
        pm10: 100,
        pm25: 50,
        emoji: '😫',
        color: '#FF5400',
      },
      {
        grade: '매우 나쁨',
        pm10: 150,
        pm25: 75,
        emoji: '😱',
        color: '#FF0000',
      },
      {
        grade: '최악',
        pm10: Infinity,
        pm25: Infinity,
        emoji: '💀',
        color: '#960018',
      },
    ];

    // PM10과 PM2.5 각각의 등급 찾기
    let pm10Grade = 0;
    let pm25Grade = 0;

    for (let i = 0; i < gradeRanges.length; i++) {
      if (pm10 <= gradeRanges[i].pm10) {
        pm10Grade = i;
        break;
      }
    }

    for (let i = 0; i < gradeRanges.length; i++) {
      if (pm25 <= gradeRanges[i].pm25) {
        pm25Grade = i;
        break;
      }
    }

    // 더 나쁜 등급 선택
    const finalGradeIndex = Math.max(pm10Grade, pm25Grade);
    const gradeInfo = gradeRanges[finalGradeIndex];

    this.logger.debug(
      `PM10(${pm10}): ${gradeInfo.grade}, PM2.5(${pm25}): ${gradeInfo.grade}`,
    );

    return {
      grade: gradeInfo.grade,
      emoji: gradeInfo.emoji,
      color: gradeInfo.color,
    };
  }

  private getWarningMessage(grade: string): string {
    switch (grade) {
      case '나쁨':
        return '민감군은 실외활동을 자제하세요!';
      case '상당히 나쁨':
      case '매우 나쁨':
      case '최악':
        return '외출을 삼가세요!';
      default:
        return '';
    }
  }
}
