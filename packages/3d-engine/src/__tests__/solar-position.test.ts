/**
 * Tests for SolarCalculator
 * @file src/__tests__/solar-position.test.ts
 */

import {
  SolarCalculator,
  CITY_LOCATIONS,
  type GeoLocation,
  type TimeOfDay,
} from '../engine/solar-position';

describe('SolarCalculator', () => {
  const paris = CITY_LOCATIONS['paris']!;

  describe('CITY_LOCATIONS', () => {
    it('should contain at least the 8 original French cities', () => {
      // The catalogue has been expanded internationally; we only assert a
      // lower bound here so the test stays stable across new additions.
      const cityKeys = Object.keys(CITY_LOCATIONS);
      expect(cityKeys.length).toBeGreaterThanOrEqual(8);
    });

    it('should include the 8 historical French cities', () => {
      expect(CITY_LOCATIONS).toHaveProperty('paris');
      expect(CITY_LOCATIONS).toHaveProperty('lyon');
      expect(CITY_LOCATIONS).toHaveProperty('marseille');
      expect(CITY_LOCATIONS).toHaveProperty('toulouse');
      expect(CITY_LOCATIONS).toHaveProperty('nice');
      expect(CITY_LOCATIONS).toHaveProperty('nantes');
      expect(CITY_LOCATIONS).toHaveProperty('bordeaux');
      expect(CITY_LOCATIONS).toHaveProperty('lille');
    });

    it('should have plausible latitude/longitude/timezone for every city', () => {
      // Bounds expanded to cover the international catalogue.
      for (const [, loc] of Object.entries(CITY_LOCATIONS)) {
        expect(loc.latitude).toBeGreaterThanOrEqual(-90);
        expect(loc.latitude).toBeLessThanOrEqual(90);
        expect(loc.longitude).toBeGreaterThanOrEqual(-180);
        expect(loc.longitude).toBeLessThanOrEqual(180);
        // IANA timezone offsets currently range from UTC-12 to UTC+14.
        expect(loc.timezone).toBeGreaterThanOrEqual(-12);
        expect(loc.timezone).toBeLessThanOrEqual(14);
      }
    });
  });

  describe('calculateSunPosition()', () => {
    it('should return high altitude and strong intensity for Paris at noon in July', () => {
      const result = SolarCalculator.calculateSunPosition(
        paris,
        7, // July
        1,
        { hour: 12, minute: 0 }
      );

      expect(result.altitude).toBeGreaterThan(50);
      expect(result.intensity).toBeGreaterThan(0.8);
      expect(result.colorTemperature).toBeGreaterThanOrEqual(5000);
      expect(result.azimuth).toBeGreaterThanOrEqual(0);
      expect(result.azimuth).toBeLessThanOrEqual(360);
    });

    it('should return low or negative altitude for Paris at 6AM in January', () => {
      const result = SolarCalculator.calculateSunPosition(
        paris,
        1, // January
        15,
        { hour: 6, minute: 0 }
      );

      // At 6AM in January in Paris, the sun is below or near the horizon
      expect(result.altitude).toBeLessThan(10);
    });

    it('should return zero intensity at midnight', () => {
      const result = SolarCalculator.calculateSunPosition(
        paris,
        6, // June
        21,
        { hour: 0, minute: 0 }
      );

      expect(result.intensity).toBe(0);
      expect(result.altitude).toBeLessThan(0);
    });

    it('should return intensity between 0 and 1', () => {
      // Test various times throughout the day
      for (let hour = 0; hour < 24; hour += 3) {
        const result = SolarCalculator.calculateSunPosition(
          paris,
          6,
          21,
          { hour, minute: 0 }
        );
        expect(result.intensity).toBeGreaterThanOrEqual(0);
        expect(result.intensity).toBeLessThanOrEqual(1);
      }
    });

    it('should have higher altitude in summer than winter at the same time', () => {
      const summer = SolarCalculator.calculateSunPosition(
        paris,
        7, // July
        1,
        { hour: 12, minute: 0 }
      );

      const winter = SolarCalculator.calculateSunPosition(
        paris,
        1, // January
        1,
        { hour: 12, minute: 0 }
      );

      expect(summer.altitude).toBeGreaterThan(winter.altitude);
    });

    it('should have low color temperature at sunrise/sunset altitude', () => {
      // Test early morning where altitude is low
      const result = SolarCalculator.calculateSunPosition(
        paris,
        3, // March
        21,
        { hour: 7, minute: 0 }
      );

      if (result.altitude > 0 && result.altitude <= 10) {
        expect(result.colorTemperature).toBe(2500);
      }
    });
  });

  describe('colorTemperatureToRGB()', () => {
    it('should return all channels near 1.0 at 6500K (neutral daylight)', () => {
      const rgb = SolarCalculator.colorTemperatureToRGB(6500);

      expect(rgb.r).toBeGreaterThan(0.9);
      expect(rgb.g).toBeGreaterThan(0.9);
      expect(rgb.b).toBeGreaterThan(0.9);
      expect(rgb.r).toBeLessThanOrEqual(1.0);
      expect(rgb.g).toBeLessThanOrEqual(1.0);
      expect(rgb.b).toBeLessThanOrEqual(1.0);
    });

    it('should return warm (high R, low B) at 2000K', () => {
      const rgb = SolarCalculator.colorTemperatureToRGB(2000);

      expect(rgb.r).toBeGreaterThan(0.8);
      expect(rgb.b).toBeLessThan(0.3);
      expect(rgb.r).toBeGreaterThan(rgb.b);
    });

    it('should return all channels between 0 and 1', () => {
      const temperatures = [1800, 2000, 2500, 3500, 5000, 6500, 8000, 10000];

      for (const temp of temperatures) {
        const rgb = SolarCalculator.colorTemperatureToRGB(temp);
        expect(rgb.r).toBeGreaterThanOrEqual(0);
        expect(rgb.r).toBeLessThanOrEqual(1);
        expect(rgb.g).toBeGreaterThanOrEqual(0);
        expect(rgb.g).toBeLessThanOrEqual(1);
        expect(rgb.b).toBeGreaterThanOrEqual(0);
        expect(rgb.b).toBeLessThanOrEqual(1);
      }
    });

    it('should have blue channel at max (1.0) for very cool temperatures', () => {
      const rgb = SolarCalculator.colorTemperatureToRGB(10000);
      expect(rgb.b).toBe(1.0);
    });

    it('should have blue channel at 0 for very warm temperatures (<=1900K)', () => {
      const rgb = SolarCalculator.colorTemperatureToRGB(1900);
      expect(rgb.b).toBe(0);
    });
  });

  describe('day of year calculation (implicit via calculateSunPosition)', () => {
    it('should produce consistent results for January 1 (day 1)', () => {
      const jan1 = SolarCalculator.calculateSunPosition(
        paris,
        1,
        1,
        { hour: 12, minute: 0 }
      );
      // January 1 should have a low sun altitude in Paris
      expect(jan1.altitude).toBeLessThan(25);
    });

    it('should produce consistent results for July 1 (~day 182)', () => {
      const jul1 = SolarCalculator.calculateSunPosition(
        paris,
        7,
        1,
        { hour: 12, minute: 0 }
      );
      // July 1 should have a high sun altitude in Paris
      expect(jul1.altitude).toBeGreaterThan(50);
    });

    it('should show progression from winter to summer', () => {
      const months = [1, 3, 6, 7, 9, 12];
      const altitudes = months.map((m) =>
        SolarCalculator.calculateSunPosition(paris, m, 15, { hour: 12, minute: 0 }).altitude
      );

      // June/July should be the highest
      const maxAltitude = Math.max(...altitudes);
      const juneAltitude = altitudes[2]!; // June
      const julyAltitude = altitudes[3]!; // July

      expect(juneAltitude).toBeGreaterThan(altitudes[0]!); // Higher than January
      expect(julyAltitude).toBeGreaterThan(altitudes[5]!); // Higher than December
    });
  });
});
