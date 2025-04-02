import { AxiosResponse } from 'axios';

export interface AirKoreaStationResponse {
  response: {
    body: {
      items: Array<{
        stationName: string;
        addr: string;
        tm: number;
      }>;
      totalCount: number;
    };
    header: {
      resultCode: string;
      resultMsg: string;
    };
  };
}

export interface AirKoreaQualityItem {
  stationName: string;
  sidoName: string;
  dataTime: string;
  pm10Value: string;
  pm25Value: string;
  pm10Grade: string;
  pm25Grade: string;
  dmX: string;
  dmY: string;
}

export interface AirKoreaQualityResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      totalCount: number;
      items: AirKoreaQualityItem[];
    };
  };
}

export interface AirQualityResult {
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

interface StationItem {
  stationName: string;
  sidoName: string;
}

export interface AirQualityItem {
  sidoName: string;
  stationName: string;
  pm10Value: string;
  pm25Value: string;
  pm10Grade: string;
  pm25Grade: string;
  dataTime: string;
}

interface ApiResponse<T> {
  response: {
    body: {
      items: T[];
    };
  };
}

export type StationApiResponse = AxiosResponse<ApiResponse<StationItem>>;
export type AirQualityApiResponse = AxiosResponse<ApiResponse<AirQualityItem>>;
