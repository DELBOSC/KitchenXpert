/**
 * Calculateur de position solaire simplifie (algorithme NOAA)
 */

export interface GeoLocation {
  latitude: number;
  longitude: number;
  timezone: number; // UTC offset
}

export interface TimeOfDay {
  hour: number;
  minute: number;
}

export interface SolarPosition {
  azimuth: number;        // degrees from North
  altitude: number;       // degrees from horizon
  intensity: number;      // 0-1
  colorTemperature: number; // Kelvin
}

/** City region identifiers for grouping in UI selectors */
export type CityRegion = 'france' | 'europe' | 'northAmerica' | 'asiaPacific' | 'southAmerica' | 'africaMiddleEast';

/** Metadata for a city entry including display label and region */
export interface CityEntry {
  location: GeoLocation;
  region: CityRegion;
}

/** Pre-defined city locations organized by region */
export const CITY_LOCATIONS: Record<string, GeoLocation> = {
  // ── France ──
  paris:          { latitude: 48.8566,  longitude: 2.3522,    timezone: 1 },
  lyon:           { latitude: 45.7640,  longitude: 4.8357,    timezone: 1 },
  marseille:      { latitude: 43.2965,  longitude: 5.3698,    timezone: 1 },
  toulouse:       { latitude: 43.6047,  longitude: 1.4442,    timezone: 1 },
  nice:           { latitude: 43.7102,  longitude: 7.2620,    timezone: 1 },
  nantes:         { latitude: 47.2184,  longitude: -1.5536,   timezone: 1 },
  bordeaux:       { latitude: 44.8378,  longitude: -0.5792,   timezone: 1 },
  lille:          { latitude: 50.6292,  longitude: 3.0573,    timezone: 1 },

  // ── Europe ──
  london:         { latitude: 51.5074,  longitude: -0.1278,   timezone: 0 },
  berlin:         { latitude: 52.5200,  longitude: 13.4050,   timezone: 1 },
  madrid:         { latitude: 40.4168,  longitude: -3.7038,   timezone: 1 },
  rome:           { latitude: 41.9028,  longitude: 12.4964,   timezone: 1 },
  amsterdam:      { latitude: 52.3676,  longitude: 4.9041,    timezone: 1 },
  brussels:       { latitude: 50.8503,  longitude: 4.3517,    timezone: 1 },
  vienna:         { latitude: 48.2082,  longitude: 16.3738,   timezone: 1 },
  zurich:         { latitude: 47.3769,  longitude: 8.5417,    timezone: 1 },
  stockholm:      { latitude: 59.3293,  longitude: 18.0686,   timezone: 1 },
  copenhagen:     { latitude: 55.6761,  longitude: 12.5683,   timezone: 1 },
  oslo:           { latitude: 59.9139,  longitude: 10.7522,   timezone: 1 },
  helsinki:        { latitude: 60.1699,  longitude: 24.9384,   timezone: 2 },
  warsaw:         { latitude: 52.2297,  longitude: 21.0122,   timezone: 1 },
  prague:         { latitude: 50.0755,  longitude: 14.4378,   timezone: 1 },
  dublin:         { latitude: 53.3498,  longitude: -6.2603,   timezone: 0 },
  lisbon:         { latitude: 38.7223,  longitude: -9.1393,   timezone: 0 },
  athens:         { latitude: 37.9838,  longitude: 23.7275,   timezone: 2 },
  istanbul:       { latitude: 41.0082,  longitude: 28.9784,   timezone: 3 },
  moscow:         { latitude: 55.7558,  longitude: 37.6173,   timezone: 3 },
  barcelona:      { latitude: 41.3874,  longitude: 2.1686,    timezone: 1 },

  // ── North America ──
  newYork:        { latitude: 40.7128,  longitude: -74.0060,  timezone: -5 },
  losAngeles:     { latitude: 34.0522,  longitude: -118.2437, timezone: -8 },
  chicago:        { latitude: 41.8781,  longitude: -87.6298,  timezone: -6 },
  toronto:        { latitude: 43.6532,  longitude: -79.3832,  timezone: -5 },
  miami:          { latitude: 25.7617,  longitude: -80.1918,  timezone: -5 },
  sanFrancisco:   { latitude: 37.7749,  longitude: -122.4194, timezone: -8 },
  montreal:       { latitude: 45.5017,  longitude: -73.5673,  timezone: -5 },
  vancouver:      { latitude: 49.2827,  longitude: -123.1207, timezone: -8 },
  mexicoCity:     { latitude: 19.4326,  longitude: -99.1332,  timezone: -6 },

  // ── Asia-Pacific ──
  tokyo:          { latitude: 35.6762,  longitude: 139.6503,  timezone: 9 },
  shanghai:       { latitude: 31.2304,  longitude: 121.4737,  timezone: 8 },
  beijing:        { latitude: 39.9042,  longitude: 116.4074,  timezone: 8 },
  seoul:          { latitude: 37.5665,  longitude: 126.9780,  timezone: 9 },
  singapore:      { latitude: 1.3521,   longitude: 103.8198,  timezone: 8 },
  sydney:         { latitude: -33.8688, longitude: 151.2093,  timezone: 10 },
  melbourne:      { latitude: -37.8136, longitude: 144.9631,  timezone: 10 },
  dubai:          { latitude: 25.2048,  longitude: 55.2708,   timezone: 4 },
  mumbai:         { latitude: 19.0760,  longitude: 72.8777,   timezone: 5.5 },
  bangkok:        { latitude: 13.7563,  longitude: 100.5018,  timezone: 7 },
  hongKong:       { latitude: 22.3193,  longitude: 114.1694,  timezone: 8 },

  // ── South America ──
  saoPaulo:       { latitude: -23.5505, longitude: -46.6333,  timezone: -3 },
  buenosAires:    { latitude: -34.6037, longitude: -58.3816,  timezone: -3 },
  santiago:       { latitude: -33.4489, longitude: -70.6693,  timezone: -4 },
  lima:           { latitude: -12.0464, longitude: -77.0428,  timezone: -5 },
  bogota:         { latitude: 4.7110,   longitude: -74.0721,  timezone: -5 },

  // ── Africa & Middle East ──
  cairo:          { latitude: 30.0444,  longitude: 31.2357,   timezone: 2 },
  capeTown:       { latitude: -33.9249, longitude: 18.4241,   timezone: 2 },
  nairobi:        { latitude: -1.2921,  longitude: 36.8219,   timezone: 3 },
  marrakech:      { latitude: 31.6295,  longitude: -7.9811,   timezone: 1 },
  telAviv:        { latitude: 32.0853,  longitude: 34.7818,   timezone: 2 },
};

/** City entries with region metadata for grouped UI selectors */
export const CITY_ENTRIES: Record<string, CityEntry> = {
  // ── France ──
  paris:          { location: CITY_LOCATIONS['paris']!,         region: 'france' },
  lyon:           { location: CITY_LOCATIONS['lyon']!,          region: 'france' },
  marseille:      { location: CITY_LOCATIONS['marseille']!,     region: 'france' },
  toulouse:       { location: CITY_LOCATIONS['toulouse']!,      region: 'france' },
  nice:           { location: CITY_LOCATIONS['nice']!,          region: 'france' },
  nantes:         { location: CITY_LOCATIONS['nantes']!,        region: 'france' },
  bordeaux:       { location: CITY_LOCATIONS['bordeaux']!,      region: 'france' },
  lille:          { location: CITY_LOCATIONS['lille']!,          region: 'france' },

  // ── Europe ──
  london:         { location: CITY_LOCATIONS['london']!,        region: 'europe' },
  berlin:         { location: CITY_LOCATIONS['berlin']!,        region: 'europe' },
  madrid:         { location: CITY_LOCATIONS['madrid']!,        region: 'europe' },
  rome:           { location: CITY_LOCATIONS['rome']!,          region: 'europe' },
  amsterdam:      { location: CITY_LOCATIONS['amsterdam']!,     region: 'europe' },
  brussels:       { location: CITY_LOCATIONS['brussels']!,      region: 'europe' },
  vienna:         { location: CITY_LOCATIONS['vienna']!,        region: 'europe' },
  zurich:         { location: CITY_LOCATIONS['zurich']!,        region: 'europe' },
  stockholm:      { location: CITY_LOCATIONS['stockholm']!,     region: 'europe' },
  copenhagen:     { location: CITY_LOCATIONS['copenhagen']!,    region: 'europe' },
  oslo:           { location: CITY_LOCATIONS['oslo']!,          region: 'europe' },
  helsinki:        { location: CITY_LOCATIONS['helsinki']!,      region: 'europe' },
  warsaw:         { location: CITY_LOCATIONS['warsaw']!,        region: 'europe' },
  prague:         { location: CITY_LOCATIONS['prague']!,        region: 'europe' },
  dublin:         { location: CITY_LOCATIONS['dublin']!,        region: 'europe' },
  lisbon:         { location: CITY_LOCATIONS['lisbon']!,        region: 'europe' },
  athens:         { location: CITY_LOCATIONS['athens']!,        region: 'europe' },
  istanbul:       { location: CITY_LOCATIONS['istanbul']!,      region: 'europe' },
  moscow:         { location: CITY_LOCATIONS['moscow']!,        region: 'europe' },
  barcelona:      { location: CITY_LOCATIONS['barcelona']!,     region: 'europe' },

  // ── North America ──
  newYork:        { location: CITY_LOCATIONS['newYork']!,       region: 'northAmerica' },
  losAngeles:     { location: CITY_LOCATIONS['losAngeles']!,    region: 'northAmerica' },
  chicago:        { location: CITY_LOCATIONS['chicago']!,       region: 'northAmerica' },
  toronto:        { location: CITY_LOCATIONS['toronto']!,       region: 'northAmerica' },
  miami:          { location: CITY_LOCATIONS['miami']!,         region: 'northAmerica' },
  sanFrancisco:   { location: CITY_LOCATIONS['sanFrancisco']!,  region: 'northAmerica' },
  montreal:       { location: CITY_LOCATIONS['montreal']!,      region: 'northAmerica' },
  vancouver:      { location: CITY_LOCATIONS['vancouver']!,     region: 'northAmerica' },
  mexicoCity:     { location: CITY_LOCATIONS['mexicoCity']!,    region: 'northAmerica' },

  // ── Asia-Pacific ──
  tokyo:          { location: CITY_LOCATIONS['tokyo']!,         region: 'asiaPacific' },
  shanghai:       { location: CITY_LOCATIONS['shanghai']!,      region: 'asiaPacific' },
  beijing:        { location: CITY_LOCATIONS['beijing']!,       region: 'asiaPacific' },
  seoul:          { location: CITY_LOCATIONS['seoul']!,         region: 'asiaPacific' },
  singapore:      { location: CITY_LOCATIONS['singapore']!,     region: 'asiaPacific' },
  sydney:         { location: CITY_LOCATIONS['sydney']!,        region: 'asiaPacific' },
  melbourne:      { location: CITY_LOCATIONS['melbourne']!,     region: 'asiaPacific' },
  dubai:          { location: CITY_LOCATIONS['dubai']!,         region: 'asiaPacific' },
  mumbai:         { location: CITY_LOCATIONS['mumbai']!,        region: 'asiaPacific' },
  bangkok:        { location: CITY_LOCATIONS['bangkok']!,       region: 'asiaPacific' },
  hongKong:       { location: CITY_LOCATIONS['hongKong']!,      region: 'asiaPacific' },

  // ── South America ──
  saoPaulo:       { location: CITY_LOCATIONS['saoPaulo']!,      region: 'southAmerica' },
  buenosAires:    { location: CITY_LOCATIONS['buenosAires']!,   region: 'southAmerica' },
  santiago:       { location: CITY_LOCATIONS['santiago']!,      region: 'southAmerica' },
  lima:           { location: CITY_LOCATIONS['lima']!,          region: 'southAmerica' },
  bogota:         { location: CITY_LOCATIONS['bogota']!,        region: 'southAmerica' },

  // ── Africa & Middle East ──
  cairo:          { location: CITY_LOCATIONS['cairo']!,         region: 'africaMiddleEast' },
  capeTown:       { location: CITY_LOCATIONS['capeTown']!,      region: 'africaMiddleEast' },
  nairobi:        { location: CITY_LOCATIONS['nairobi']!,       region: 'africaMiddleEast' },
  marrakech:      { location: CITY_LOCATIONS['marrakech']!,     region: 'africaMiddleEast' },
  telAviv:        { location: CITY_LOCATIONS['telAviv']!,       region: 'africaMiddleEast' },
};

/** Region ordering for display purposes */
export const CITY_REGIONS: CityRegion[] = [
  'france',
  'europe',
  'northAmerica',
  'asiaPacific',
  'southAmerica',
  'africaMiddleEast',
];

export class SolarCalculator {
  /**
   * Calcule la position du soleil pour une position et un moment donnes
   */
  static calculateSunPosition(
    location: GeoLocation,
    month: number, // 1-12
    day: number,   // 1-31
    time: TimeOfDay
  ): SolarPosition {
    const lat = location.latitude;
    const lng = location.longitude;

    // Jour julien simplifie
    const dayOfYear = this.dayOfYear(month, day);

    // Declinaison solaire (radians)
    const declination = 23.45 * Math.sin((2 * Math.PI / 365) * (284 + dayOfYear));
    const decRad = declination * (Math.PI / 180);
    const latRad = lat * (Math.PI / 180);

    // Heure solaire
    const solarNoon = 12 - lng / 15 + location.timezone;
    const hourAngle = (time.hour + time.minute / 60 - solarNoon) * 15; // degrees
    const haRad = hourAngle * (Math.PI / 180);

    // Altitude solaire
    const sinAlt = Math.sin(latRad) * Math.sin(decRad) +
      Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
    const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * (180 / Math.PI);

    // Azimut
    const cosAz = (Math.sin(decRad) - Math.sin(latRad) * sinAlt) /
      (Math.cos(latRad) * Math.cos(Math.asin(sinAlt)));
    let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz))) * (180 / Math.PI);
    if (hourAngle > 0) azimuth = 360 - azimuth;

    // Intensite basee sur altitude
    const intensity = altitude > 0
      ? Math.min(1, Math.max(0, altitude / 60))
      : 0;

    // Temperature de couleur basee sur altitude
    const colorTemperature = this.altitudeToColorTemperature(altitude);

    return { azimuth, altitude, intensity, colorTemperature };
  }

  /**
   * Convertit une temperature de couleur en RGB normalise (0-1)
   */
  static colorTemperatureToRGB(kelvin: number): { r: number; g: number; b: number } {
    // Algorithme de Tanner Helland simplifie
    const temp = kelvin / 100;
    let r: number, g: number, b: number;

    if (temp <= 66) {
      r = 255;
      g = 99.4708025861 * Math.log(temp) - 161.1195681661;
      b = temp <= 19 ? 0 : 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
    } else {
      r = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
      g = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
      b = 255;
    }

    return {
      r: Math.max(0, Math.min(255, r)) / 255,
      g: Math.max(0, Math.min(255, g)) / 255,
      b: Math.max(0, Math.min(255, b)) / 255,
    };
  }

  private static dayOfYear(month: number, day: number): number {
    const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let doy = day;
    for (let m = 1; m < month; m++) {
      doy += daysInMonth[m]!;
    }
    return doy;
  }

  private static altitudeToColorTemperature(altitude: number): number {
    if (altitude <= 0) return 2000;  // Below horizon — warm amber
    if (altitude <= 10) return 2500; // Sunrise/sunset
    if (altitude <= 20) return 3500; // Low sun
    if (altitude <= 40) return 5000; // Mid-day
    return 6500;                      // High sun — neutral daylight
  }
}
