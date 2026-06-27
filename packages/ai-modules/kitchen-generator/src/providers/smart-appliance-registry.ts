/**
 * Smart Appliance Registry
 *
 * Manages all connected appliance providers (Home Connect, Miele, Electrolux, etc.)
 * and provides a unified interface for interacting with smart kitchen appliances.
 */

import type {
  SmartApplianceProvider,
  SmartAppliancePlatform,
  ConnectedAppliance,
  ConnectedApplianceStatus,
  ApplianceProgram,
  ApplianceCredentials,
} from '../types';

import { HomeConnectProvider } from './home-connect';
import { MieleProvider } from './miele';
import { ElectroluxProvider } from './electrolux';

/**
 * Smart Appliance Registry - Singleton
 * Manages registration and access to smart appliance providers
 */
export class SmartApplianceRegistry {
  private static instance: SmartApplianceRegistry;
  private providers: Map<SmartAppliancePlatform, SmartApplianceProvider> = new Map();

  private constructor() {}

  static getInstance(): SmartApplianceRegistry {
    if (!SmartApplianceRegistry.instance) {
      SmartApplianceRegistry.instance = new SmartApplianceRegistry();
    }
    return SmartApplianceRegistry.instance;
  }

  /**
   * Register a smart appliance provider
   */
  register(provider: SmartApplianceProvider): void {
    this.providers.set(provider.platform, provider);
  }

  /**
   * Unregister a provider
   */
  unregister(platform: SmartAppliancePlatform): boolean {
    return this.providers.delete(platform);
  }

  /**
   * Get a provider by platform
   */
  get(platform: SmartAppliancePlatform): SmartApplianceProvider | undefined {
    return this.providers.get(platform);
  }

  /**
   * Get all registered providers
   */
  getAll(): SmartApplianceProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get list of registered platforms
   */
  getRegisteredPlatforms(): SmartAppliancePlatform[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a platform is registered
   */
  has(platform: SmartAppliancePlatform): boolean {
    return this.providers.has(platform);
  }

  /**
   * Authenticate with a specific provider
   */
  async authenticate(
    platform: SmartAppliancePlatform,
    credentials: ApplianceCredentials
  ): Promise<boolean> {
    const provider = this.providers.get(platform);
    if (!provider) {
      throw new Error(`Provider for platform '${platform}' not registered`);
    }
    return provider.authenticate(credentials);
  }

  /**
   * Get all appliances from all authenticated providers
   */
  async getAllAppliances(): Promise<ConnectedAppliance[]> {
    const allAppliances: ConnectedAppliance[] = [];

    const fetchPromises = Array.from(this.providers.values()).map(async (provider) => {
      try {
        const appliances = await provider.getAppliances();
        return appliances;
      } catch (error) {
        console.error(`Error fetching appliances from ${provider.name}:`, error);
        return [];
      }
    });

    const results = await Promise.all(fetchPromises);
    for (const appliances of results) {
      allAppliances.push(...appliances);
    }

    return allAppliances;
  }

  /**
   * Get appliances from a specific platform
   */
  async getAppliances(platform: SmartAppliancePlatform): Promise<ConnectedAppliance[]> {
    const provider = this.providers.get(platform);
    if (!provider) {
      throw new Error(`Provider for platform '${platform}' not registered`);
    }
    return provider.getAppliances();
  }

  /**
   * Get status of an appliance
   */
  async getApplianceStatus(
    platform: SmartAppliancePlatform,
    applianceId: string
  ): Promise<ConnectedApplianceStatus> {
    const provider = this.providers.get(platform);
    if (!provider) {
      throw new Error(`Provider for platform '${platform}' not registered`);
    }
    return provider.getStatus(applianceId);
  }

  /**
   * Get programs for an appliance
   */
  async getAppliancePrograms(
    platform: SmartAppliancePlatform,
    applianceId: string
  ): Promise<ApplianceProgram[]> {
    const provider = this.providers.get(platform);
    if (!provider) {
      throw new Error(`Provider for platform '${platform}' not registered`);
    }
    return provider.getPrograms(applianceId);
  }

  /**
   * Start a program on an appliance
   */
  async startProgram(
    platform: SmartAppliancePlatform,
    applianceId: string,
    programKey: string,
    options?: Record<string, unknown>
  ): Promise<boolean> {
    const provider = this.providers.get(platform);
    if (!provider) {
      throw new Error(`Provider for platform '${platform}' not registered`);
    }
    return provider.startProgram(applianceId, programKey, options);
  }

  /**
   * Stop the current program on an appliance
   */
  async stopProgram(platform: SmartAppliancePlatform, applianceId: string): Promise<boolean> {
    const provider = this.providers.get(platform);
    if (!provider) {
      throw new Error(`Provider for platform '${platform}' not registered`);
    }
    return provider.stopProgram(applianceId);
  }

  /**
   * Set a setting on an appliance
   */
  async setSetting(
    platform: SmartAppliancePlatform,
    applianceId: string,
    key: string,
    value: unknown
  ): Promise<boolean> {
    const provider = this.providers.get(platform);
    if (!provider) {
      throw new Error(`Provider for platform '${platform}' not registered`);
    }
    return provider.setSetting(applianceId, key, value);
  }

  /**
   * Clear all registered providers
   */
  clear(): void {
    this.providers.clear();
  }
}

// Export singleton instance
export const smartApplianceRegistry = SmartApplianceRegistry.getInstance();

/**
 * Initialize default smart appliance providers
 */
export function initializeSmartApplianceProviders(options?: {
  homeConnect?: {
    clientId: string;
    clientSecret?: string;
    redirectUri?: string;
  };
  miele?: {
    clientId: string;
    clientSecret?: string;
    redirectUri?: string;
  };
  electrolux?: {
    apiKey: string;
    clientId?: string;
    clientSecret?: string;
  };
}): void {
  // Initialize Home Connect provider
  if (options?.homeConnect) {
    const homeConnectProvider = new HomeConnectProvider({
      clientId: options.homeConnect.clientId,
      clientSecret: options.homeConnect.clientSecret,
      redirectUri: options.homeConnect.redirectUri || '',
    });
    smartApplianceRegistry.register(homeConnectProvider);
  }

  // Initialize Miele provider
  if (options?.miele) {
    const mieleProvider = new MieleProvider({
      clientId: options.miele.clientId,
      clientSecret: options.miele.clientSecret,
      redirectUri: options.miele.redirectUri || '',
    });
    smartApplianceRegistry.register(mieleProvider);
  }

  // Initialize Electrolux provider
  if (options?.electrolux) {
    const electroluxProvider = new ElectroluxProvider({
      apiKey: options.electrolux.apiKey,
      clientId: options.electrolux.clientId || '',
      clientSecret: options.electrolux.clientSecret,
    });
    smartApplianceRegistry.register(electroluxProvider);
  }
}

/**
 * Get connected appliances that match products in a kitchen configuration
 * This can be used to link physical appliances to configuration items
 */
export async function matchAppliancesToConfiguration(
  configAppliances: Array<{ type: string; brand?: string; model?: string }>
): Promise<Map<number, ConnectedAppliance | null>> {
  const matches = new Map<number, ConnectedAppliance | null>();
  const allAppliances = await smartApplianceRegistry.getAllAppliances();

  configAppliances.forEach((configAppliance, index) => {
    // Try to find a matching connected appliance
    const match = allAppliances.find((connected) => {
      const typeMatch = connected.type.toLowerCase().includes(configAppliance.type.toLowerCase());
      const connectedBrand = String(connected.specifications?.brand || '').toLowerCase();
      const connectedModel = String(connected.specifications?.model || '').toLowerCase();
      const brandMatch =
        !configAppliance.brand || connectedBrand.includes(configAppliance.brand.toLowerCase());
      const modelMatch =
        !configAppliance.model || connectedModel.includes(configAppliance.model.toLowerCase());

      return typeMatch && brandMatch && modelMatch;
    });

    matches.set(index, match || null);
  });

  return matches;
}

export default smartApplianceRegistry;
