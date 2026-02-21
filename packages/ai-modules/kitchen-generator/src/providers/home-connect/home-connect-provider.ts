/**
 * Home Connect Provider
 * Integrates with Bosch, Siemens, Neff, Gaggenau, and Thermador smart appliances
 * via the Home Connect API
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
// Home Connect API Types
// ============================================

interface HomeConnectAppliance {
  haId: string;
  name: string;
  brand: string;
  vib: string;
  connected: boolean;
  type: string;
  enumber: string;
}

interface HomeConnectAppliancesResponse {
  data: {
    homeappliances: HomeConnectAppliance[];
  };
}

interface HomeConnectStatusResponse {
  data: {
    status: HomeConnectStatusItem[];
  };
}

interface HomeConnectStatusItem {
  key: string;
  value: unknown;
  unit?: string;
}

interface HomeConnectProgramsResponse {
  data: {
    programs: HomeConnectProgram[];
  };
}

interface HomeConnectProgram {
  key: string;
  name?: string;
  options?: HomeConnectProgramOption[];
}

interface HomeConnectProgramOption {
  key: string;
  name?: string;
  type: string;
  unit?: string;
  constraints?: {
    min?: number;
    max?: number;
    allowedvalues?: string[];
    default?: unknown;
  };
}

interface HomeConnectError {
  error: {
    key: string;
    description: string;
  };
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

// ============================================
// Home Connect Provider Implementation
// ============================================

export class HomeConnectProvider implements SmartApplianceProvider {
  readonly platform: SmartAppliancePlatform = 'home_connect';
  readonly name = 'Home Connect';

  private baseUrl = 'https://api.home-connect.com';
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: number = 0;

  // OAuth2 configuration
  private oauthConfig: ApplianceOAuthConfig = {
    platform: 'home_connect',
    authorizationUrl: 'https://api.home-connect.com/security/oauth/authorize',
    tokenUrl: 'https://api.home-connect.com/security/oauth/token',
    clientId: '',
    clientSecret: '',
    scopes: [
      'IdentifyAppliance',
      'Monitor',
      'Control',
      'Settings',
      'Images',
    ],
    redirectUri: '',
  };

  // Brand mapping
  private readonly brandMapping: Record<string, string> = {
    'BOSCH': 'bosch',
    'SIEMENS': 'siemens',
    'NEFF': 'neff',
    'GAGGENAU': 'gaggenau',
    'THERMADOR': 'thermador',
  };

  // Appliance type mapping from Home Connect to our types
  private readonly applianceTypeMapping: Record<string, ConnectedApplianceType> = {
    'Oven': 'Oven',
    'Dishwasher': 'Dishwasher',
    'CoffeeMaker': 'CoffeeMaker',
    'Refrigerator': 'Refrigerator',
    'Freezer': 'Freezer',
    'FridgeFreezer': 'FridgeFreezer',
    'Hob': 'Hob',
    'Hood': 'Hood',
    'Microwave': 'Microwave',
    'WarmingDrawer': 'WarmingDrawer',
    'Dryer': 'Dryer',
    'Washer': 'Washer',
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
      scope: this.oauthConfig.scopes.join(' '),
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

      const data = await response.json() as TokenResponse;
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token || null;
      this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);

      return true;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      return false;
    }
  }

  /**
   * Authenticate with the Home Connect API
   */
  async authenticate(credentials: ApplianceCredentials): Promise<boolean> {
    if (credentials.accessToken) {
      this.accessToken = credentials.accessToken;
      this.refreshToken = credentials.refreshToken || null;
      this.tokenExpiresAt = Date.now() + (3600 * 1000); // Assume 1 hour if not specified
      return true;
    }

    if (credentials.clientId && credentials.clientSecret) {
      this.oauthConfig.clientId = credentials.clientId;
      this.oauthConfig.clientSecret = credentials.clientSecret;
      // OAuth flow needs to be initiated by the client
      return true;
    }

    return false;
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
          refresh_token: this.refreshToken,
        }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json() as TokenResponse;
      this.accessToken = data.access_token;
      if (data.refresh_token) {
        this.refreshToken = data.refresh_token;
      }
      this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);

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
        'Accept': 'application/vnd.bsh.sdk.v1+json',
        'Content-Type': 'application/vnd.bsh.sdk.v1+json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json() as HomeConnectError;
      throw new Error(
        `Home Connect API error: ${errorData.error?.description || response.statusText}`
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get all connected appliances
   */
  async getAppliances(): Promise<ConnectedAppliance[]> {
    const response = await this.apiRequest<HomeConnectAppliancesResponse>(
      '/api/homeappliances'
    );

    return response.data.homeappliances
      .filter(appliance => this.isKitchenAppliance(appliance.type))
      .map(appliance => this.mapToConnectedAppliance(appliance));
  }

  /**
   * Get appliance status
   */
  async getStatus(applianceId: string): Promise<ConnectedApplianceStatus> {
    const response = await this.apiRequest<HomeConnectStatusResponse>(
      `/api/homeappliances/${applianceId}/status`
    );

    return this.mapStatusResponse(response.data.status);
  }

  /**
   * Get available programs for an appliance
   */
  async getPrograms(applianceId: string): Promise<ApplianceProgram[]> {
    try {
      const response = await this.apiRequest<HomeConnectProgramsResponse>(
        `/api/homeappliances/${applianceId}/programs/available`
      );

      return response.data.programs.map(program => this.mapProgram(program));
    } catch {
      // Some appliances may not support programs
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
        data: {
          key: programKey,
          options: options ? this.formatProgramOptions(options) : [],
        },
      };

      await this.apiRequest(
        `/api/homeappliances/${applianceId}/programs/active`,
        {
          method: 'PUT',
          body: JSON.stringify(body),
        }
      );

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
      await this.apiRequest(
        `/api/homeappliances/${applianceId}/programs/active`,
        { method: 'DELETE' }
      );
      return true;
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
      await this.apiRequest(
        `/api/homeappliances/${applianceId}/settings/${key}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            data: { key, value },
          }),
        }
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current active program
   */
  async getActiveProgram(applianceId: string): Promise<ApplianceProgram | null> {
    try {
      const response = await this.apiRequest<{ data: HomeConnectProgram }>(
        `/api/homeappliances/${applianceId}/programs/active`
      );
      return this.mapProgram(response.data);
    } catch {
      return null;
    }
  }

  /**
   * Get selected program (next to run)
   */
  async getSelectedProgram(applianceId: string): Promise<ApplianceProgram | null> {
    try {
      const response = await this.apiRequest<{ data: HomeConnectProgram }>(
        `/api/homeappliances/${applianceId}/programs/selected`
      );
      return this.mapProgram(response.data);
    } catch {
      return null;
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  private isKitchenAppliance(type: string): boolean {
    const kitchenTypes = [
      'Oven', 'Dishwasher', 'CoffeeMaker', 'Refrigerator',
      'Freezer', 'FridgeFreezer', 'Hob', 'Hood',
      'Microwave', 'WarmingDrawer'
    ];
    return kitchenTypes.includes(type);
  }

  private mapToConnectedAppliance(appliance: HomeConnectAppliance): ConnectedAppliance {
    const applianceType = this.applianceTypeMapping[appliance.type] || 'Oven';

    return {
      // CatalogProduct fields
      id: `hc_${appliance.haId}`,
      providerId: 'home_connect',
      providerProductId: appliance.haId,
      name: appliance.name,
      type: appliance.type.toLowerCase(),
      category: 'appliance',
      subcategory: this.getApplianceCategory(appliance.type),
      dimensions: this.getDefaultDimensions(appliance.type),
      price: 0, // Price not available from API
      currency: 'EUR',
      specifications: {
        brand: appliance.brand,
        model: appliance.vib,
        enumber: appliance.enumber,
      },
      inStock: true,

      // ConnectedAppliance fields
      platform: 'home_connect',
      applianceId: appliance.haId,
      applianceType,
      connectivity: {
        wifi: true,
        homeConnect: true,
      },
    };
  }

  private getApplianceCategory(type: string): string {
    const categoryMap: Record<string, string> = {
      'Oven': 'cooking',
      'Hob': 'cooking',
      'Hood': 'ventilation',
      'Microwave': 'cooking',
      'WarmingDrawer': 'cooking',
      'Dishwasher': 'cleaning',
      'CoffeeMaker': 'small_appliances',
      'Refrigerator': 'cold_storage',
      'Freezer': 'cold_storage',
      'FridgeFreezer': 'cold_storage',
    };
    return categoryMap[type] || 'other';
  }

  private getDefaultDimensions(type: string): { width: number; height: number; depth: number; unit: 'cm' } {
    // Default dimensions based on appliance type
    const dimensions: Record<string, { width: number; height: number; depth: number }> = {
      'Oven': { width: 60, height: 60, depth: 55 },
      'Dishwasher': { width: 60, height: 82, depth: 55 },
      'Refrigerator': { width: 60, height: 185, depth: 65 },
      'Freezer': { width: 60, height: 185, depth: 65 },
      'FridgeFreezer': { width: 60, height: 200, depth: 65 },
      'Hob': { width: 60, height: 5, depth: 52 },
      'Hood': { width: 60, height: 50, depth: 50 },
      'Microwave': { width: 60, height: 38, depth: 32 },
      'WarmingDrawer': { width: 60, height: 14, depth: 55 },
      'CoffeeMaker': { width: 60, height: 45, depth: 35 },
    };
    return { ...dimensions[type] || { width: 60, height: 60, depth: 55 }, unit: 'cm' };
  }

  private mapStatusResponse(statusItems: HomeConnectStatusItem[]): ConnectedApplianceStatus {
    const status: ConnectedApplianceStatus = {
      connected: true,
      state: 'ready',
    };

    for (const item of statusItems) {
      switch (item.key) {
        case 'BSH.Common.Status.OperationState':
          status.state = this.mapOperationState(item.value as string);
          break;
        case 'BSH.Common.Status.DoorState':
          status.door = this.mapDoorState(item.value as string);
          break;
        case 'Cooking.Oven.Status.CurrentCavityTemperature':
          status.temperature = item.value as number;
          break;
        case 'BSH.Common.Option.RemainingProgramTime':
          status.remainingTime = item.value as number;
          break;
        case 'BSH.Common.Option.ProgramProgress':
          status.progress = item.value as number;
          break;
        case 'BSH.Common.Root.ActiveProgram':
          status.program = item.value as string;
          break;
      }
    }

    return status;
  }

  private mapOperationState(state: string): ConnectedApplianceStatus['state'] {
    const stateMap: Record<string, ConnectedApplianceStatus['state']> = {
      'BSH.Common.EnumType.OperationState.Inactive': 'off',
      'BSH.Common.EnumType.OperationState.Ready': 'ready',
      'BSH.Common.EnumType.OperationState.Run': 'running',
      'BSH.Common.EnumType.OperationState.Pause': 'paused',
      'BSH.Common.EnumType.OperationState.Finished': 'finished',
      'BSH.Common.EnumType.OperationState.Error': 'error',
      'BSH.Common.EnumType.OperationState.Aborting': 'running',
    };
    return stateMap[state] || 'ready';
  }

  private mapDoorState(state: string): 'open' | 'closed' | 'locked' {
    if (state.includes('Open')) return 'open';
    if (state.includes('Locked')) return 'locked';
    return 'closed';
  }

  private mapProgram(program: HomeConnectProgram): ApplianceProgram {
    return {
      id: program.key,
      name: program.name || this.formatProgramName(program.key),
      key: program.key,
      options: program.options?.map(opt => this.mapProgramOption(opt)),
    };
  }

  private mapProgramOption(option: HomeConnectProgramOption): ProgramOption {
    const mapped: ProgramOption = {
      key: option.key,
      name: option.name || this.formatProgramName(option.key),
      type: this.mapOptionType(option.type),
    };

    if (option.constraints) {
      if (option.constraints.min !== undefined) mapped.min = option.constraints.min;
      if (option.constraints.max !== undefined) mapped.max = option.constraints.max;
      if (option.constraints.allowedvalues) mapped.values = option.constraints.allowedvalues;
      if (option.constraints.default !== undefined) mapped.default = option.constraints.default;
    }

    return mapped;
  }

  private mapOptionType(type: string): ProgramOption['type'] {
    switch (type.toLowerCase()) {
      case 'int':
      case 'double':
        return 'temperature';
      case 'boolean':
        return 'boolean';
      case 'enumeration':
        return 'enum';
      default:
        return 'enum';
    }
  }

  private formatProgramName(key: string): string {
    // Convert "Dishcare.Dishwasher.Program.Eco50" to "Eco 50"
    const parts = key.split('.');
    const name = parts[parts.length - 1] || key;
    return name.replace(/([A-Z])/g, ' $1').trim();
  }

  private formatProgramOptions(options: Record<string, unknown>): Array<{ key: string; value: unknown }> {
    return Object.entries(options).map(([key, value]) => ({ key, value }));
  }
}

// Export singleton instance factory
export function createHomeConnectProvider(config?: Partial<ApplianceOAuthConfig>): HomeConnectProvider {
  return new HomeConnectProvider(config);
}

export default HomeConnectProvider;
