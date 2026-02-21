import * as THREE from 'three';
import type { KitchenLighting } from './lighting';
import type { KitchenRenderer } from './renderer';

export type LightingPresetName = 'day' | 'evening' | 'showroom' | 'natural';

export interface LightingPresetConfig {
  ambient: { intensity: number };
  directional: { intensity: number };
  hemisphere: { intensity: number };
  toneMapping: THREE.ToneMapping;
  exposure: number;
}

const PRESETS: Record<LightingPresetName, LightingPresetConfig> = {
  day: {
    ambient: { intensity: 0.6 },
    directional: { intensity: 1.2 },
    hemisphere: { intensity: 0.4 },
    toneMapping: THREE.ACESFilmicToneMapping,
    exposure: 1.0,
  },
  evening: {
    ambient: { intensity: 0.2 },
    directional: { intensity: 0.5 },
    hemisphere: { intensity: 0.3 },
    toneMapping: THREE.ACESFilmicToneMapping,
    exposure: 0.7,
  },
  showroom: {
    ambient: { intensity: 0.8 },
    directional: { intensity: 1.5 },
    hemisphere: { intensity: 0.6 },
    toneMapping: THREE.ACESFilmicToneMapping,
    exposure: 1.3,
  },
  natural: {
    ambient: { intensity: 0.4 },
    directional: { intensity: 0.8 },
    hemisphere: { intensity: 0.7 },
    toneMapping: THREE.LinearToneMapping,
    exposure: 1.0,
  },
};

export class LightingPresets {
  static apply(
    lighting: KitchenLighting,
    renderer: KitchenRenderer,
    preset: LightingPresetName,
  ): void {
    const config = PRESETS[preset];

    lighting.setIntensity('ambient', config.ambient.intensity);
    lighting.setIntensity('directional', config.directional.intensity);
    lighting.setIntensity('hemisphere', config.hemisphere.intensity);

    renderer.setToneMapping(config.toneMapping, config.exposure);
  }

  static getPresetNames(): LightingPresetName[] {
    return Object.keys(PRESETS) as LightingPresetName[];
  }

  static getConfig(preset: LightingPresetName): LightingPresetConfig {
    return { ...PRESETS[preset] };
  }
}
