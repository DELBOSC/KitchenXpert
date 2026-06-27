/**
 * Miele Provider
 * Integrates with Miele smart appliances via the Miele 3rd Party API
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
  ProgramOption,
} from '../../types';

// ============================================
// Miele API Types
// ============================================

interface MieleAppliance {
  ident: {
    type: {
      key_localized: string;
      value_raw: string;
      value_localized: string;
    };
    deviceName: string;
    deviceIdentLabel: {
      fabNumber: string;
      fabIndex: string;
      techType: string;
      matNumber: string;
      swids: string[];
    };
    xkmIdentLabel?: {
      techType: string;
      releaseVersion: string;
    };
  };
  state: MieleApplianceState;
}

interface MieleApplianceState {
  status: {
    key_localized: string;
    value_raw: number;
    value_localized: string;
  };
  programType?: {
    key_localized: string;
    value_raw: number;
    value_localized: string;
  };
  programPhase?: {
    key_localized: string;
    value_raw: number;
    value_localized: string;
  };
  remainingTime?: [number, number]; // [hours, minutes]
  startTime?: [number, number];
  targetTemperature?: Array<{
    value_raw: number;
    value_localized: number;
    unit: string;
  }>;
  temperature?: Array<{
    value_raw: number;
    value_localized: number;
    unit: string;
  }>;
  signalInfo?: boolean;
  signalFailure?: boolean;
  signalDoor?: boolean;
  remoteEnable?: {
    fullRemoteControl: boolean;
    smartGrid: boolean;
    mobileStart: boolean;
  };
  light?: number;
  elapsedTime?: [number, number];
  spinningSpeed?: {
    key_localized: string;
    value_raw: number;
    value_localized: string;
    unit: string;
  };
  dryingStep?: {
    key_localized: string;
    value_raw: number;
    value_localized: string;
  };
  ventilationStep?: {
    key_localized: string;
    value_raw: number;
    value_localized: string;
  };
  plateStep?: Array<{
    key_localized: string;
    value_raw: number;
    value_localized: string;
  }>;
  ecoFeedback?: {
    currentWaterConsumption?: {
      unit: string;
      value: number;
    };
    currentEnergyConsumption?: {
      unit: string;
      value: number;
    };
    waterForecast?: number;
    energyForecast?: number;
  };
}

interface MieleProgramsResponse {
  [programId: string]: {
    programId: number;
    programName: {
      key_localized: string;
      value_raw: string;
      value_localized: string;
    };
  };
}

interface MieleActionsResponse {
  processAction?: string[];
  light?: number[];
  ambientLight?: string[];
  startTime?: [number, number][];
  targetTemperature?: Array<{
    zone: number;
    min: number;
    max: number;
  }>;
  deviceName?: boolean;
  powerOff?: boolean;
  powerOn?: boolean;
  programs?: number[];
  programsParameters?: {
    [key: string]: unknown;
  };
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

// ============================================
// Miele Provider Implementation
// ============================================

export class MieleProvider implements SmartApplianceProvider {
  readonly platform: SmartAppliancePlatform = 'miele';
  readonly name = 'Miele';

  private baseUrl = 'https://api.mcs3.miele.com';
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: number = 0;

  // OAuth2 configuration
  private oauthConfig: ApplianceOAuthConfig = {
    platform: 'miele',
    authorizationUrl: 'https://api.mcs3.miele.com/oauth/auth',
    tokenUrl: 'https://api.mcs3.miele.com/oauth/token',
    clientId: '',
    clientSecret: '',
    scopes: [],
    redirectUri: '',
  };

  // Appliance type mapping from Miele to our types
  private readonly applianceTypeMapping: Record<number, ConnectedApplianceType> = {
    1: 'Washer', // Washing machine
    2: 'Dryer', // Tumble dryer
    7: 'Dishwasher', // Dishwasher
    12: 'Oven', // Oven
    13: 'Oven', // Oven Microwave
    14: 'Hob', // Hob
    15: 'Oven', // Steam Oven
    16: 'Microwave', // Microwave
    17: 'CoffeeMaker', // Coffee System
    18: 'Hood', // Hood
    19: 'Refrigerator', // Fridge
    20: 'Freezer', // Freezer
    21: 'FridgeFreezer', // Fridge/Freezer Combination
    23: 'WarmingDrawer', // Vacuum Drawer
    24: 'WarmingDrawer', // Warming Drawer
    25: 'Oven', // Dish Warmer
    27: 'Hob', // Hob with extraction
    28: 'Oven', // Steam Oven Microwave
    31: 'Oven', // Steam Oven
    32: 'WarmingDrawer', // Wine Storage
    33: 'WarmingDrawer', // Wine Conditioning
    34: 'WarmingDrawer', // Wine Cabinet Freezer
    39: 'Oven', // Double Oven
    40: 'Oven', // Double Steam Oven
    41: 'Oven', // Double Steam Oven Microwave
    42: 'Oven', // Double Oven Microwave
    43: 'Oven', // Combi Steam Oven
    45: 'Oven', // Steam Oven Combi
    67: 'Oven', // Dialog Oven
    68: 'WarmingDrawer', // Wine Cabinet
  };

  constructor(config?: Partial<ApplianceOAuthConfig>) {
    if (config) {
      this.oauthConfig = { ...this.oauthConfig, ...config };
    }
  }

  /**
   * Get OAuth2 authorization URL for user consent
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.oauthConfig.clientId,
      redirect_uri: this.oauthConfig.redirectUri,
      response_type: 'code',
      state,
    });

    return `${this.oauthConfig.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<boolean> {
    try {
      const response = await fetch(this.oauthConfig.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: this.oauthConfig.clientId,
          client_secret: this.oauthConfig.clientSecret || '',
          code,
          redirect_uri: this.oauthConfig.redirectUri,
        }),
      });

      if (!response.ok) {
        console.error('Failed to exchange code for tokens:', await response.text());
        return false;
      }

      const data = (await response.json()) as TokenResponse;
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token || null;
      this.tokenExpiresAt = Date.now() + data.expires_in * 1000;

      return true;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      return false;
    }
  }

  /**
   * Authenticate with the Miele API
   */
  async authenticate(credentials: ApplianceCredentials): Promise<boolean> {
    // Token-based authentication
    if (credentials.accessToken) {
      this.accessToken = credentials.accessToken;
      this.refreshToken = credentials.refreshToken || null;
      this.tokenExpiresAt = Date.now() + 3600 * 1000;
      return true;
    }

    // Client credentials for OAuth setup
    if (credentials.clientId && credentials.clientSecret) {
      this.oauthConfig.clientId = credentials.clientId;
      this.oauthConfig.clientSecret = credentials.clientSecret;
      return true;
    }

    // Legacy username/password (Miele 3rd Party API)
    if (credentials.username && credentials.password) {
      return this.authenticateWithPassword(credentials.username, credentials.password);
    }

    return false;
  }

  /**
   * Authenticate with username/password (legacy method)
   */
  private async authenticateWithPassword(username: string, password: string): Promise<boolean> {
    try {
      const response = await fetch(this.oauthConfig.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: this.oauthConfig.clientId,
          client_secret: this.oauthConfig.clientSecret || '',
          username,
          password,
          vg: 'en-US',
        }),
      });

      if (!response.ok) {
        return false;
      }

      const data = (await response.json()) as TokenResponse;
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token || null;
      this.tokenExpiresAt = Date.now() + data.expires_in * 1000;

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
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.oauthConfig.clientId,
          client_secret: this.oauthConfig.clientSecret || '',
          refresh_token: this.refreshToken,
        }),
      });

      if (!response.ok) {
        return false;
      }

      const data = (await response.json()) as TokenResponse;
      this.accessToken = data.access_token;
      if (data.refresh_token) {
        this.refreshToken = data.refresh_token;
      }
      this.tokenExpiresAt = Date.now() + data.expires_in * 1000;

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Make an authenticated API request
   */
  private async apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Miele API error: ${errorText || response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get all connected appliances
   */
  async getAppliances(): Promise<ConnectedAppliance[]> {
    const response = await this.apiRequest<Record<string, MieleAppliance>>('/v1/devices');

    return Object.entries(response)
      .filter(([_, appliance]) => this.isKitchenAppliance(appliance.ident.type.value_raw))
      .map(([id, appliance]) => this.mapToConnectedAppliance(id, appliance));
  }

  /**
   * Get appliance status
   */
  async getStatus(applianceId: string): Promise<ConnectedApplianceStatus> {
    const response = await this.apiRequest<Record<string, MieleAppliance>>(
      `/v1/devices/${applianceId}`
    );

    const appliance = response[applianceId];
    if (!appliance) {
      throw new Error(`Appliance ${applianceId} not found`);
    }

    return this.mapStatusResponse(appliance.state);
  }

  /**
   * Get available programs for an appliance
   */
  async getPrograms(applianceId: string): Promise<ApplianceProgram[]> {
    try {
      const response = await this.apiRequest<MieleProgramsResponse>(
        `/v1/devices/${applianceId}/programs`
      );

      return Object.entries(response).map(([_, program]) => ({
        id: String(program.programId),
        name: program.programName.value_localized,
        key: String(program.programId),
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
        programId: parseInt(programKey, 10),
      };

      if (options) {
        Object.assign(body, options);
      }

      await this.apiRequest(`/v1/devices/${applianceId}/programs`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      return true;
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
      await this.apiRequest(`/v1/devices/${applianceId}/actions`, {
        method: 'PUT',
        body: JSON.stringify({ processAction: 2 }), // Stop
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Set an appliance setting
   */
  async setSetting(applianceId: string, key: string, value: unknown): Promise<boolean> {
    try {
      await this.apiRequest(`/v1/devices/${applianceId}/actions`, {
        method: 'PUT',
        body: JSON.stringify({ [key]: value }),
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get available actions for an appliance
   */
  async getAvailableActions(applianceId: string): Promise<MieleActionsResponse> {
    return this.apiRequest<MieleActionsResponse>(`/v1/devices/${applianceId}/actions`);
  }

  /**
   * Control light
   */
  async setLight(applianceId: string, on: boolean): Promise<boolean> {
    return this.setSetting(applianceId, 'light', on ? 1 : 2);
  }

  /**
   * Power off appliance
   */
  async powerOff(applianceId: string): Promise<boolean> {
    return this.setSetting(applianceId, 'powerOff', true);
  }

  /**
   * Power on appliance
   */
  async powerOn(applianceId: string): Promise<boolean> {
    return this.setSetting(applianceId, 'powerOn', true);
  }

  // ============================================
  // Helper Methods
  // ============================================

  private isKitchenAppliance(typeValue: string): boolean {
    const typeNum = parseInt(typeValue, 10);
    const kitchenTypes = [
      7, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 23, 24, 25, 27, 28, 31, 32, 33, 34, 39, 40, 41, 42,
      43, 45, 67, 68,
    ];
    return kitchenTypes.includes(typeNum);
  }

  private mapToConnectedAppliance(id: string, appliance: MieleAppliance): ConnectedAppliance {
    const typeNum = parseInt(appliance.ident.type.value_raw, 10);
    const applianceType = this.applianceTypeMapping[typeNum] || 'Oven';

    return {
      // CatalogProduct fields
      id: `miele_${id}`,
      providerId: 'miele',
      providerProductId: id,
      name: appliance.ident.deviceName || appliance.ident.type.value_localized,
      type: appliance.ident.type.value_localized.toLowerCase(),
      category: 'appliance',
      subcategory: this.getApplianceCategory(typeNum),
      dimensions: this.getDefaultDimensions(typeNum),
      price: 0,
      currency: 'EUR',
      specifications: {
        model: appliance.ident.deviceIdentLabel.techType,
        fabNumber: appliance.ident.deviceIdentLabel.fabNumber,
        matNumber: appliance.ident.deviceIdentLabel.matNumber,
      },
      inStock: true,

      // ConnectedAppliance fields
      platform: 'miele',
      applianceId: id,
      applianceType,
      connectivity: {
        wifi: true,
      },
    };
  }

  private getApplianceCategory(typeNum: number): string {
    const categoryMap: Record<number, string> = {
      7: 'cleaning', // Dishwasher
      12: 'cooking', // Oven
      13: 'cooking', // Oven Microwave
      14: 'cooking', // Hob
      15: 'cooking', // Steam Oven
      16: 'cooking', // Microwave
      17: 'small_appliances', // Coffee System
      18: 'ventilation', // Hood
      19: 'cold_storage', // Fridge
      20: 'cold_storage', // Freezer
      21: 'cold_storage', // Fridge/Freezer
      23: 'cooking', // Vacuum Drawer
      24: 'cooking', // Warming Drawer
      25: 'cooking', // Dish Warmer
      27: 'cooking', // Hob with extraction
    };
    return categoryMap[typeNum] || 'other';
  }

  private getDefaultDimensions(typeNum: number): {
    width: number;
    height: number;
    depth: number;
    unit: 'cm';
  } {
    const dimensions: Record<number, { width: number; height: number; depth: number }> = {
      7: { width: 60, height: 82, depth: 57 }, // Dishwasher
      12: { width: 60, height: 60, depth: 55 }, // Oven
      13: { width: 60, height: 45, depth: 55 }, // Oven Microwave
      14: { width: 80, height: 5, depth: 52 }, // Hob
      15: { width: 60, height: 45, depth: 57 }, // Steam Oven
      16: { width: 60, height: 38, depth: 32 }, // Microwave
      17: { width: 60, height: 45, depth: 50 }, // Coffee System
      18: { width: 90, height: 50, depth: 50 }, // Hood
      19: { width: 60, height: 177, depth: 65 }, // Fridge
      20: { width: 60, height: 177, depth: 65 }, // Freezer
      21: { width: 60, height: 200, depth: 65 }, // Fridge/Freezer
      24: { width: 60, height: 14, depth: 55 }, // Warming Drawer
    };
    return { ...(dimensions[typeNum] || { width: 60, height: 60, depth: 55 }), unit: 'cm' };
  }

  private mapStatusResponse(state: MieleApplianceState): ConnectedApplianceStatus {
    const status: ConnectedApplianceStatus = {
      connected: true,
      state: this.mapMieleState(state.status.value_raw),
    };

    // Door state
    if (state.signalDoor !== undefined) {
      status.door = state.signalDoor ? 'open' : 'closed';
    }

    // Temperature
    if (state.temperature && state.temperature.length > 0 && state.temperature[0]) {
      status.temperature = state.temperature[0].value_localized;
    }
    if (
      state.targetTemperature &&
      state.targetTemperature.length > 0 &&
      state.targetTemperature[0]
    ) {
      status.targetTemperature = state.targetTemperature[0].value_localized;
    }

    // Remaining time (convert from [hours, minutes] to seconds)
    if (state.remainingTime) {
      status.remainingTime = state.remainingTime[0] * 3600 + state.remainingTime[1] * 60;
    }

    // Program phase as progress approximation
    if (state.programPhase) {
      status.program = state.programPhase.value_localized;
    }

    // Error state
    if (state.signalFailure) {
      status.state = 'error';
      status.error = 'Appliance failure signal';
    }

    return status;
  }

  private mapMieleState(stateValue: number): ConnectedApplianceStatus['state'] {
    const stateMap: Record<number, ConnectedApplianceStatus['state']> = {
      1: 'off', // Off
      2: 'ready', // Stand-by
      3: 'running', // Programmed
      4: 'running', // Programmed waiting to start
      5: 'running', // Running
      6: 'paused', // Pause
      7: 'finished', // End programmed
      8: 'error', // Failure
      9: 'running', // Programme interrupted
      10: 'off', // Idle
      11: 'running', // Rinse hold
      12: 'running', // Service
      13: 'running', // Superfreezing
      14: 'running', // Supercooling
      15: 'running', // Superheating
      146: 'running', // Supercooling superfreezing
      255: 'off', // Not connected
    };
    return stateMap[stateValue] || 'ready';
  }
}

// Export singleton instance factory
export function createMieleProvider(config?: Partial<ApplianceOAuthConfig>): MieleProvider {
  return new MieleProvider(config);
}

export default MieleProvider;
