/**
 * Endpoints utilisateurs
 */

import { ApiClient } from '../client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  avatar?: string;
  phone?: string;
  language: string;
  timezone: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  language?: string;
  timezone?: string;
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
  };
  display: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    currency: string;
    measurementUnit: 'metric' | 'imperial';
  };
}

export interface PaginatedUsers {
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class UserEndpoints {
  constructor(private client: ApiClient) {}

  async getProfile(): Promise<User> {
    const response = await this.client.get<User>('/users/me');
    return response.data;
  }

  async updateProfile(data: UpdateProfileRequest): Promise<User> {
    const response = await this.client.patch<User>('/users/me', data);
    return response.data;
  }

  async uploadAvatar(file: Blob): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await this.client.post<{ avatarUrl: string }>(
      '/users/me/avatar',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  async deleteAvatar(): Promise<void> {
    await this.client.delete('/users/me/avatar');
  }

  async getPreferences(): Promise<UserPreferences> {
    const response = await this.client.get<UserPreferences>('/users/me/preferences');
    return response.data;
  }

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    const response = await this.client.patch<UserPreferences>(
      '/users/me/preferences',
      preferences
    );
    return response.data;
  }

  async deleteAccount(): Promise<void> {
    await this.client.delete('/users/me');
  }

  // Admin endpoints
  async listUsers(params?: UserSearchParams): Promise<PaginatedUsers> {
    const response = await this.client.get<PaginatedUsers>('/admin/users', {
      params: params as Record<string, unknown> | undefined,
    });
    return response.data;
  }

  async getUser(id: string): Promise<User> {
    const response = await this.client.get<User>(`/admin/users/${id}`);
    return response.data;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const response = await this.client.patch<User>(`/admin/users/${id}`, data);
    return response.data;
  }

  async suspendUser(id: string, reason?: string): Promise<User> {
    const response = await this.client.post<User>(`/admin/users/${id}/suspend`, { reason });
    return response.data;
  }

  async activateUser(id: string): Promise<User> {
    const response = await this.client.post<User>(`/admin/users/${id}/activate`);
    return response.data;
  }
}

export function createUserEndpoints(client: ApiClient): UserEndpoints {
  return new UserEndpoints(client);
}
