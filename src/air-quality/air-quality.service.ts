import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import {
  AirQualityResult,
  StationApiResponse,
  AirQualityApiResponse,
} from './types/air-quality.types';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

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
    private readonly httpService: HttpService,
  ) {
    this.airKoreaApiKey = this.configService.get<string>('AIR_KOREA_API_KEY');
    if (!this.airKoreaApiKey) {
      this.logger.error('AIR_KOREA_API_KEY is not defined');
      throw new Error('AIR_KOREA_API_KEY is not defined');
    }
    this.weatherApiKey = this.configService.get<string>('OPENWEATHER_API_KEY');
    if (!this.weatherApiKey) {
      this.logger.error('OPENWEATHER_API_KEY is not defined');
      throw new Error('OPENWEATHER_API_KEY is not defined');
    }
  }

  private async fetchAirQualityData(latitude: number, longitude: number) {
    try {
      this.logger.log(
        `Fetching air quality data from API for coordinates: ${latitude}, ${longitude}`,
      );

      const nearestStationUrl = `https://apis.data.go.kr/B552584/MsrstnInfoInqireSvc/getNearbyMsrstnList?serviceKey=${this.airKoreaApiKey}&returnType=json&tmX=${longitude}&tmY=${latitude}`;

      this.logger.debug('Calling nearest station API...');
      const stationResponse = await firstValueFrom<StationApiResponse>(
        this.httpService.get(nearestStationUrl),
      );

      if (!stationResponse.data?.response?.body?.items?.[0]) {
        throw new Error('No station found near the coordinates');
      }

      const station = stationResponse.data.response.body.items[0];
      this.logger.log(`Found nearest station: ${station.stationName}`);

      const airQualityUrl = `https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty?serviceKey=${this.airKoreaApiKey}&returnType=json&stationName=${encodeURIComponent(station.stationName)}&dataTerm=DAILY`;

      this.logger.debug('Calling air quality API...');
      const airQualityResponse = await firstValueFrom<AirQualityApiResponse>(
        this.httpService.get(airQualityUrl),
      );

      if (!airQualityResponse.data?.response?.body?.items?.[0]) {
        throw new Error('No air quality data available');
      }

      const airQualityData = airQualityResponse.data.response.body.items[0];
      this.logger.log('Successfully fetched air quality data');

      return {
        sidoName: station.sidoName,
        stationName: station.stationName,
        pm10Value: parseInt(airQualityData.pm10Value) || 0,
        pm25Value: parseInt(airQualityData.pm25Value) || 0,
        pm10Grade: airQualityData.pm10Grade || '1',
        pm25Grade: airQualityData.pm25Grade || '1',
        dataTime: airQualityData.dataTime,
      };
    } catch (error) {
      this.logger.error('Error in fetchAirQualityData:', error);
      throw error;
    }
  }

  private async fetchWeatherData(latitude: number, longitude: number) {
    try {
      // 위도/경도 값 검증
      if (
        !latitude ||
        !longitude ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        this.logger.error(
          `Invalid coordinates: lat=${latitude}, lon=${longitude}`,
        );
        return null;
      }

      const weatherUrl = `${this.weatherUrl}?lat=${latitude}&lon=${longitude}&appid=${this.weatherApiKey}&units=metric&lang=kr`;
      this.logger.debug(`Fetching weather data from: ${weatherUrl}`);

      const response = await firstValueFrom<{ data: WeatherResponse }>(
        this.httpService.get(weatherUrl),
      );

      if (
        !response.data ||
        !response.data.main ||
        !response.data.weather?.[0]
      ) {
        this.logger.error('Invalid weather data response');
        return null;
      }

      return {
        temperature: response.data.main.temp,
        feelsLike: response.data.main.feels_like,
        weatherIcon: response.data.weather[0].icon,
        weatherDescription: response.data.weather[0].description,
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        this.logger.error(
          `Weather API error: ${error.response?.status} - ${(error.response?.data as { message?: string })?.message || 'Unknown error'}`,
        );
      } else {
        this.logger.error(
          'Error fetching weather data:',
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
      return null;
    }
  }

  private calculateAirQualityGrade(pm10: number, pm25: number) {
    const gradeRanges = [
      {
        min: 0,
        max: 15,
        grade: 1,
        emoji: '😊',
        color: '#4CAF50',
        warning: '좋음',
      },
      {
        min: 15,
        max: 30,
        grade: 2,
        emoji: '😊',
        color: '#4CAF50',
        warning: '좋음',
      },
      {
        min: 30,
        max: 50,
        grade: 3,
        emoji: '😊',
        color: '#4CAF50',
        warning: '좋음',
      },
      {
        min: 50,
        max: 75,
        grade: 4,
        emoji: '😐',
        color: '#FFC107',
        warning: '보통',
      },
      {
        min: 75,
        max: 100,
        grade: 5,
        emoji: '😐',
        color: '#FFC107',
        warning: '보통',
      },
      {
        min: 100,
        max: 150,
        grade: 6,
        emoji: '😷',
        color: '#FF9800',
        warning: '나쁨',
      },
      {
        min: 150,
        max: 250,
        grade: 7,
        emoji: '😷',
        color: '#FF9800',
        warning: '나쁨',
      },
      {
        min: 250,
        max: Infinity,
        grade: 8,
        emoji: '⚠️',
        color: '#F44336',
        warning: '매우 나쁨',
      },
    ];

    const pm10Grade =
      gradeRanges.find((range) => pm10 >= range.min && pm10 < range.max)
        ?.grade || 1;
    const pm25Grade =
      gradeRanges.find((range) => pm25 >= range.min && pm25 < range.max)
        ?.grade || 1;

    const worseGrade = Math.max(pm10Grade, pm25Grade);
    const gradeInfo = gradeRanges.find((range) => range.grade === worseGrade);

    this.logger.debug(
      `PM10 Grade: ${pm10Grade}, PM2.5 Grade: ${pm25Grade}, Final Grade: ${worseGrade}`,
    );

    return {
      grade: worseGrade,
      emoji: gradeInfo?.emoji || '😊',
      color: gradeInfo?.color || '#4CAF50',
      warning: gradeInfo?.warning || '좋음',
    };
  }

  async getAirQuality(
    latitude: number,
    longitude: number,
  ): Promise<AirQualityResult> {
    try {
      const cacheKey = `air-quality-${latitude}-${longitude}`;
      const cachedData =
        await this.cacheManager.get<AirQualityResult>(cacheKey);

      if (cachedData) {
        this.logger.log('Returning cached air quality data');
        return cachedData;
      }

      const [airQualityData, weatherData] = await Promise.all([
        this.fetchAirQualityData(latitude, longitude),
        this.fetchWeatherData(latitude, longitude),
      ]);

      const gradeInfo = this.calculateAirQualityGrade(
        airQualityData.pm10Value,
        airQualityData.pm25Value,
      );

      const result: AirQualityResult = {
        ...airQualityData,
        gradeEmoji: gradeInfo.emoji,
        backgroundColor: gradeInfo.color,
        warningMessage: gradeInfo.warning,
        ...(weatherData || {}),
      };

      await this.cacheManager.set(cacheKey, result, 300000); // 5분 캐시
      return result;
    } catch (error) {
      this.logger.error('Error in getAirQuality:', error);
      throw error;
    }
  }
}
