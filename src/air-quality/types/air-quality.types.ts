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
  pm10Value: number;
  pm25Value: number;
  pm10Grade: number;
  pm25Grade: number;
  dataTime: string;
  stationName: string;
  sidoName: string;
  gradeEmoji: string;
  backgroundColor: string;
  warningMessage: string;
  temperature: number;
  feelsLike: number;
  weatherIcon: string;
  weatherDescription: string;
}
