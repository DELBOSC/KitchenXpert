/**
 * Electrolux Provider
 * Integrates with Electrolux, AEG, and Frigidaire smart appliances
 * via the Electrolux Open API
 */

import type {
  SmartApplianceProvider,
  SmartAppliancePlatform,
  ConnectedAppliance,
  ConnectedApplianceStatus,
  ApplianceProgram,
  ApplianceCredentials,
  ApplianceOAuthConfig,
  ConnectedApplianceType,
} from '../../types';

// ============================================
// Electrolux API Types
// ============================================

interface ElectroluxAppliance {
  applianceId: string;
  applianceName: string;
  applianceType: string;
  created: string;
  modelName?: string;
  serialNumber?: string;
  brand?: string;
  colour?: string;
  properties?: {
    reported: ElectroluxApplianceState;
    desired?: Record<string, unknown>;
  };
  status?: 'enabled' | 'disabled' | 'connected' | 'disconnected';
  connectionState?: 'connected' | 'disconnected';
}

interface ElectroluxApplianceState {
  applianceState?: string;
  cyclePhase?: string;
  cycleSubPhase?: string;
  timeToEnd?: number;
  startTime?: number;
  runningTime?: number;
  targetTemperature?: number;
  measuredTemperature?: number;
  doorState?: string;
  doorLock?: string;
  displayTemperature?: number;
  alerts?: Array<{
    code: string;
    severity: string;
    text?: string;
  }>;
  waterUsage?: number;
  energyUsage?: number;
  networkInterface?: {
    linkQualityIndicator?: number;
    otaState?: string;
    swVersion?: string;
  };
  [key: string]: unknown;
}

interface ElectroluxApplianceCapabilities {
  commands?: string[];
  modes?: string[];
  options?: string[];
  programs?: ElectroluxProgram[];
}

interface ElectroluxProgram {
  programId: string;
  name: string;
  options?: Array<{
    optionId: string;
    name: string;
    type: string;
    min?: number;
    max?: number;
    values?: string[];
  }>;
}

interface ElectroluxCommandResponse {
  status: 'OK' | 'ERROR';
  message?: string;
}

interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
}

// ============================================
// Electrolux Provider Implementation
// ============================================

export class ElectroluxProvider implements SmartApplianceProvider {
  readonly platform: SmartAppliancePlatform = 'electrolux';
  readonly name = 'Electrolux';

  private baseUrl = 'https://api.ocp.electrolux.one';
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private apiKey: string = '';

  // OAuth2 configuration
  private oauthConfig: ApplianceOAuthConfig = {
    platform: 'electrolux',
    authorizationUrl: 'https://api.ocp.electrolux.one/one-account-authorization/api/v1/token',
    tokenUrl: 'https://api.ocp.electrolux.one/one-account-authorization/api/v1/token',
    clientId: '',
    clientSecret: '',
    scopes: [],
    redirectUri: '',
  };

  // Brand mapping
  private readonly supportedBrands = ['electrolux', 'aeg', 'frigidaire', 'zanussi'];

  // Appliance type mapping
  private readonly applianceTypeMapping: Record<string, ConnectedApplianceType> = {
    'OV': 'Oven',
    'WM': 'Washer',
    'TD': 'Dryer',
    'DW': 'Dishwasher',
    'RF': 'Refrigerator',
    'FZ': 'Freezer',
    'HB': 'Hob',
    'HO': 'Hood',
    'MW': 'Microwave',
    'CM': 'CoffeeMaker',
    'WD': 'WarmingDrawer',
    'AC': 'Oven', // Air conditioner mapped to generic
  };

  constructor(config?: { apiKey?: string } & Partial<ApplianceOAuthConfig>) {
    if (config) {
      if (config.apiKey) {
        this.apiKey = config.apiKey;
      }
      this.oauthConfig = { ...this.oauthConfig, ...config };
    }
  }

  /**
   * Authenticate with the Electrolux API
   */
  async authenticate(credentials: ApplianceCredentials): Promise<boolean> {
    // Token-based authentication
    if (credentials.accessToken) {
      this.accessToken = credentials.accessToken;
      this.refreshToken = credentials.refreshToken || null;
      this.tokenExpiresAt = Date.now() + (3600 * 1000);
      return true;
    }

    // Username/password authentication (Electrolux One Account)
    if (credentials.username && credentials.password) {
      return this.authenticateWithCredentials(credentials.username, credentials.password);
    }

    // Client credentials
    if (credentials.clientId && credentials.clientSecret) {
      this.oauthConfig.clientId = credentials.clientId;
      this.oauthConfig.clientSecret = credentials.clientSecret;
      return true;
    }

    return false;
  }

  /**
   * Authenticate with username/password
   */
  private async authenticateWithCredentials(username: string, password: string): Promise<boolean> {
    try {
      const response = await fetch(this.oauthConfig.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          grantType: 'client_credentials',
          clientId: this.oauthConfig.clientId,
          clientSecret: this.oauthConfig.clientSecret,
          username,
          password,
        }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json() as TokenResponse;
      this.accessToken = data.accessToken;
      this.refreshToken = data.refreshToken || null;
      this.tokenExpiresAt = Date.now() + (data.expiresIn * 1000);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Refresh the access token
   */
  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const response = await fetch(this.oauthConfig.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          grantType: 'refresh_token',
          clientId: this.oauthConfig.clientId,
          refreshToken: this.refreshToken,
        }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json() as TokenResponse;
      this.accessToken = data.accessToken;
      if (data.refreshToken) {
        this.refreshToken = data.refreshToken;
      }
      this.tokenExpiresAt = Date.now() + (data.expiresIn * 1000);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Make an authenticated API request
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Check if token needs refresh
    if (this.tokenExpiresAt && Date.now() > this.tokenExpiresAt - 60000) {
      await this.refreshAccessToken();
    }

    if (!this.accessToken) {
      throw new Error('Not authenticated. Please call authenticate() first.');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'x-api-key': this.apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Electrolux API error: ${errorText || response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get all connected appliances
   */
  async getAppliances(): Promise<ConnectedAppliance[]> {
    const response = await this.apiRequest<ElectroluxAppliance[]>(
      '/appliance/api/v2/appliances'
    );

    return response
      .filter(appliance => this.isKitchenAppliance(appliance.applianceType))
      .map(appliance => this.mapToConnectedAppliance(appliance));
  }

  /**
   * Get appliance status
   */
  async getStatus(applianceId: string): Promise<ConnectedApplianceStatus> {
    const response = await this.apiRequest<ElectroluxAppliance>(
      `/appliance/api/v2/appliances/${applianceId}`
    );

    return this.mapStatusResponse(response);
  }

  /**
   * Get available programs for an appliance
   */
  async getPrograms(applianceId: string): Promise<ApplianceProgram[]> {
    try {
      const response = await this.apiRequest<ElectroluxApplianceCapabilities>(
        `/appliance/api/v2/appliances/${applianceId}/capabilities`
      );

      if (!response.programs) {
        return [];
      }

      return response.programs.map(program => ({
        id: program.programId,
        name: program.name,
        key: program.programId,
        options: program.options?.map(opt => ({
          key: opt.optionId,
          name: opt.name,
          type: this.mapOptionType(opt.type),
          min: opt.min,
          max: opt.max,
          values: opt.values,
        })),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Start a program on an appliance
   */
  async startProgram(
    applianceId: string,
    programKey: string,
    options?: Record<string, unknown>
  ): Promise<boolean> {
    try {
      const body: Record<string, unknown> = {
        programId: programKey,
      };

      if (options) {
        body.options = options;
      }

      const response = await this.apiRequest<ElectroluxCommandResponse>(
        `/appliance/api/v2/appliances/${applianceId}/command`,
        {
          method: 'PUT',
          body: JSON.stringify({
            command: 'startProgram',
            ...body,
          }),
        }
      );

      return response.status === 'OK';
    } catch (error) {
      console.error('Failed to start program:', error);
      return false;
    }
  }

  /**
   * Stop the current program
   */
  async stopProgram(applianceId: string): Promise<boolean> {
    try {
      const response = await this.apiRequest<ElectroluxCommandResponse>(
        `/appliance/api/v2/appliances/${applianceId}/command`,
        {
          method: 'PUT',
          body: JSON.stringify({
            command: 'stopProgram',
          }),
        }
      );

      return response.status === 'OK';
    } catch {
      return false;
    }
  }

  /**
   * Set an appliance setting
   */
  async setSetting(
    applianceId: string,
    key: string,
    value: unknown
  ): Promise<boolean> {
    try {
      const response = await this.apiRequest<ElectroluxCommandResponse>(
        `/appliance/api/v2/appliances/${applianceId}/command`,
        {
          method: 'PUT',
          body: JSON.stringify({
            [key]: value,
          }),
        }
      );

      return response.status === 'OK';
    } catch {
      return false;
    }
  }

  /**
   * Execute a command on the appliance
   */
  async executeCommand(applianceId: string, command: string, params?: Record<string, unknown>): Promise<boolean> {
    try {
      const response = await this.apiRequest<ElectroluxCommandResponse>(
        `/appliance/api/v2/appliances/${applianceId}/command`,
        {
          method: 'PUT',
          body: JSON.stringify({
            command,
            ...params,
          }),
        }
      );

      return response.status === 'OK';
    } catch {
      return false;
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  private isKitchenAppliance(type: string): boolean {
    const kitchenTypes = ['OV', 'DW', 'RF', 'FZ', 'HB', 'HO', 'MW', 'CM', 'WD'];
    // Check if the type starts with any kitchen type code
    return kitchenTypes.some(kt => type.toUpperCase().startsWith(kt));
  }

  private mapToConnectedAppliance(appliance: ElectroluxAppliance): ConnectedAppliance {
    const typeCode = appliance.applianceType.substring(0, 2).toUpperCase();
    const applianceType = this.applianceTypeMapping[typeCode] || 'Oven';

    return {
      // CatalogProduct fields
      id: `elux_${appliance.applianceId}`,
      providerId: 'electrolux',
      providerProductId: appliance.applianceId,
      name: appliance.applianceName || appliance.modelName || 'Electrolux Appliance',
      type: appliance.applianceType.toLowerCase(),
      category: 'appliance',
      subcategory: this.getApplianceCategory(typeCode),
      dimensions: this.getDefaultDimensions(typeCode),
      price: 0,
      currency: 'EUR',
      specifications: {
        brand: appliance.brand || 'Electrolux',
        model: appliance.modelName,
        serialNumber: appliance.serialNumber,
        colour: appliance.colour,
      },
      inStock: true,

      // ConnectedAppliance fields
      platform: 'electrolux',
      applianceId: appliance.applianceId,
      applianceType,
      connectivity: {
        wifi: true,
      },
    };
  }

  private getApplianceCategory(typeCode: string): string {
    const categoryMap: Record<string, string> = {
      'OV': 'cooking',
      'HB': 'cooking',
      'HO': 'ventilation',
      'MW': 'cooking',
      'CM': 'small_appliances',
      'DW': 'cleaning',
      'RF': 'cold_storage',
      'FZ': 'cold_storage',
      'WD': 'cooking',
    };
    return categoryMap[typeCode] || 'other';
  }

  private getDefaultDimensions(typeCode: string): { width: number; height: number; depth: number; unit: 'cm' } {
    const dimensions: Record<string, { width: number; height: number; depth: number }> = {
      'OV': { width: 60, height: 60, depth: 55 },
      'DW': { width: 60, height: 82, depth: 55 },
      'RF': { width: 60, height: 185, depth: 65 },
      'FZ': { width: 60, height: 185, depth: 65 },
      'HB': { width: 60, height: 5, depth: 52 },
      'HO': { width: 60, height: 50, depth: 50 },
      'MW': { width: 60, height: 38, depth: 32 },
      'CM': { width: 60, height: 45, depth: 35 },
      'WD': { width: 60, height: 14, depth: 55 },
    };
    return { ...dimensions[typeCode] || { width: 60, height: 60, depth: 55 }, unit: 'cm' };
  }

  private mapStatusResponse(appliance: ElectroluxAppliance): ConnectedApplianceStatus {
    const state = appliance.properties?.reported || {};

    const status: ConnectedApplianceStatus = {
      connected: appliance.connectionState === 'connected',
      state: this.mapElectroluxState(state.applianceState || ''),
    };

    // Door state
    if (state.doorState) {
      status.door = state.doorState.toLowerCase().includes('open') ? 'open' :
                    state.doorState.toLowerCase().includes('lock') ? 'locked' : 'closed';
    }

    // Temperature
    if (state.measuredTemperature !== undefined) {
      status.temperature = state.measuredTemperature;
    }
    if (state.targetTemperature !== undefined) {
      status.targetTemperature = state.targetTemperature;
    }

    // Remaining time
    if (state.timeToEnd !== undefined) {
      status.remainingTime = state.timeToEnd;
    }

    // Program phase
    if (state.cyclePhase) {
      status.program = state.cyclePhase;
    }

    // Alerts/errors
    if (state.alerts && state.alerts.length > 0) {
      const errorAlert = state.alerts.find(a => a.severity === 'ERROR');
      if (errorAlert) {
        status.state = 'error';
        status.error = errorAlert.text || errorAlert.code;
      }
    }

    return status;
  }

  private mapElectroluxState(state: string): ConnectedApplianceStatus['state'] {
    const stateLower = state.toLowerCase();
    if (stateLower.includes('off') || stateLower.includes('standby')) return 'off';
    if (stateLower.includes('ready') || stateLower.includes('idle')) return 'ready';
    if (stateLower.includes('running') || stateLower.includes('active')) return 'running';
    if (stateLower.includes('pause')) return 'paused';
    if (stateLower.includes('finish') || stateLower.includes('complete')) return 'finished';
    if (stateLower.includes('error') || stateLower.includes('fault')) return 'error';
    return 'ready';
  }

  private mapOptionType(type: string): 'temperature' | 'duration' | 'boolean' | 'enum' {
    const typeLower = type.toLowerCase();
    if (typeLower.includes('temp')) return 'temperature';
    if (typeLower.includes('time') || typeLower.includes('duration')) return 'duration';
    if (typeLower.includes('bool')) return 'boolean';
    return 'enum';
  }
}

// Export singleton instance factory
export function createElectroluxProvider(config?: { apiKey?: string } & Partial<ApplianceOAuthConfig>): ElectroluxProvider {
  return new ElectroluxProvider(config);
}

export default ElectroluxProvider;
