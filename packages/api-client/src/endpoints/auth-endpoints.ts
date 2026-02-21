/**
 * Endpoints d'authentification
 */

import { ApiClient } from '../client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  tokens: {
    accessToken: string;
    expiresIn: number;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  language?: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export class AuthEndpoints {
  constructor(private client: ApiClient) {}

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/auth/login', credentials);

    // Stocker le token d'accès
    this.client.setAccessToken(response.data.tokens.accessToken);

    return response.data;
  }

  async register(data: RegisterRequest): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/auth/register', data);

    // Stocker le token d'accès
    this.client.setAccessToken(response.data.tokens.accessToken);

    return response.data;
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout');
    this.client.setAccessToken(null);
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const response = await this.client.post<RefreshTokenResponse>('/auth/refresh', {
      refreshToken,
    });

    this.client.setAccessToken(response.data.accessToken);

    return response.data;
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.client.post('/auth/password-reset/request', { email });
  }

  async confirmPasswordReset(data: PasswordResetConfirm): Promise<void> {
    await this.client.post('/auth/password-reset/confirm', data);
  }

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await this.client.post('/auth/password/change', data);
  }

  async verifyEmail(token: string): Promise<void> {
    await this.client.post(`/auth/verify-email/${token}`);
  }

  async resendVerificationEmail(): Promise<void> {
    await this.client.post('/auth/resend-verification');
  }

  async getCurrentUser(): Promise<LoginResponse['user']> {
    const response = await this.client.get<LoginResponse['user']>('/auth/me');
    return response.data;
  }
}

export function createAuthEndpoints(client: ApiClient): AuthEndpoints {
  return new AuthEndpoints(client);
}
