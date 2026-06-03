// Open-Meteo response subset. Free API, no key. We request hourly + current.

export interface OpenMeteoForecastResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: {
    time: string[];
    temperature_2m: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];   // degrees, 0=N
    precipitation_probability: number[];
    relative_humidity_2m: number[];
  };
}

export interface BallparkWeather {
  venueId: number;
  gameTimeIso: string;
  temperatureF: number;
  windSpeedMph: number;
  windDirectionDeg: number;          // 0=N, 90=E, 180=S, 270=W
  // Computed: angle of wind relative to "out to CF".
  // Positive degrees blowing OUT, negative blowing IN. Useful in scoring.
  windOutwardComponentMph: number;
  precipitationProbability: number;
  humidityPct: number;
}
