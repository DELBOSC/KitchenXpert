/**
 * Endpoints projets cuisine
 */

import { ApiClient } from '../client';

export interface KitchenProject {
  id: string;
  userId: string;
  name: string;
  description?: string;
  shape: 'L' | 'U' | 'I' | 'G' | 'island' | 'peninsula';
  style: 'modern' | 'classic' | 'industrial' | 'scandinavian' | 'rustic' | 'minimalist';
  roomType: 'open' | 'closed' | 'semi-open';
  dimensions: {
    width: number;
    length: number;
    height: number;
    unit: 'mm' | 'cm' | 'm';
  };
  budget?: number;
  currency?: string;
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  thumbnailUrl?: string;
  appliances: ProjectItem[];
  furniture: ProjectItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectItem {
  id: string;
  catalogId: string;
  name: string;
  brand: string;
  price: number;
  currency: string;
  quantity: number;
  position?: [number, number, number];
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  shape: KitchenProject['shape'];
  style: KitchenProject['style'];
  roomType: KitchenProject['roomType'];
  dimensions: KitchenProject['dimensions'];
  budget?: number;
  currency?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  shape?: KitchenProject['shape'];
  style?: KitchenProject['style'];
  roomType?: KitchenProject['roomType'];
  dimensions?: Partial<KitchenProject['dimensions']>;
  budget?: number;
  status?: KitchenProject['status'];
}

export interface ProjectSearchParams {
  page?: number;
  limit?: number;
  status?: string;
  style?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedProjects {
  data: KitchenProject[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProjectExport {
  format: 'pdf' | 'image' | '3d';
  url: string;
  expiresAt: string;
}

export interface ProjectShare {
  id: string;
  projectId: string;
  shareUrl: string;
  expiresAt?: string;
  password?: boolean;
  viewCount: number;
}

export class KitchenEndpoints {
  constructor(private client: ApiClient) {}

  async listProjects(params?: ProjectSearchParams): Promise<PaginatedProjects> {
    const response = await this.client.get<PaginatedProjects>('/kitchens', {
      params: params as Record<string, unknown> | undefined,
    });
    return response.data;
  }

  async getProject(id: string): Promise<KitchenProject> {
    const response = await this.client.get<KitchenProject>(`/kitchens/${id}`);
    return response.data;
  }

  async createProject(data: CreateProjectRequest): Promise<KitchenProject> {
    const response = await this.client.post<KitchenProject>('/kitchens', data);
    return response.data;
  }

  async updateProject(id: string, data: UpdateProjectRequest): Promise<KitchenProject> {
    const response = await this.client.put<KitchenProject>(`/kitchens/${id}`, data);
    return response.data;
  }

  async deleteProject(id: string): Promise<void> {
    await this.client.delete(`/kitchens/${id}`);
  }

  async duplicateProject(id: string, name?: string): Promise<KitchenProject> {
    const response = await this.client.post<KitchenProject>(`/kitchens/${id}/duplicate`, {
      name,
    });
    return response.data;
  }

  async archiveProject(id: string): Promise<KitchenProject> {
    const response = await this.client.post<KitchenProject>(`/kitchens/${id}/archive`);
    return response.data;
  }

  async restoreProject(id: string): Promise<KitchenProject> {
    const response = await this.client.post<KitchenProject>(`/kitchens/${id}/restore`);
    return response.data;
  }

  // Components management (aligned with backend /kitchens/:id/components)
  async addComponent(
    kitchenId: string,
    component: { componentType: 'appliance' | 'furniture'; catalogId: string; position?: [number, number, number]; quantity?: number }
  ): Promise<ProjectItem> {
    const response = await this.client.post<ProjectItem>(
      `/kitchens/${kitchenId}/components`,
      component
    );
    return response.data;
  }

  async updateComponent(
    kitchenId: string,
    componentId: string,
    data: Partial<ProjectItem>
  ): Promise<ProjectItem> {
    const response = await this.client.patch<ProjectItem>(
      `/kitchens/${kitchenId}/components/${componentId}`,
      data
    );
    return response.data;
  }

  async removeComponent(kitchenId: string, componentId: string): Promise<void> {
    await this.client.delete(`/kitchens/${kitchenId}/components/${componentId}`);
  }

  // 3D Model
  async saveModel(kitchenId: string, modelData: Record<string, unknown>): Promise<void> {
    await this.client.put(`/kitchens/${kitchenId}/model`, modelData);
  }

  async getModel(kitchenId: string): Promise<Record<string, unknown>> {
    const response = await this.client.get<Record<string, unknown>>(
      `/kitchens/${kitchenId}/model`
    );
    return response.data;
  }

  // Export
  async exportProject(kitchenId: string, format: 'pdf' | 'png' | 'jpg' | 'svg' | 'dwg' | 'obj' | 'gltf'): Promise<ProjectExport> {
    const response = await this.client.post<ProjectExport>(
      `/kitchens/${kitchenId}/export`,
      { format }
    );
    return response.data;
  }

  // Sharing
  async shareProject(
    kitchenId: string,
    options?: { expiresIn?: number; password?: string }
  ): Promise<ProjectShare> {
    const response = await this.client.post<ProjectShare>(
      `/kitchens/${kitchenId}/share`,
      options
    );
    return response.data;
  }

  async getSharedProject(shareId: string, password?: string): Promise<KitchenProject> {
    const headers = password ? { 'X-Share-Password': password } : undefined;
    const response = await this.client.get<KitchenProject>(`/shared/${shareId}`, { headers });
    return response.data;
  }

  async revokeShare(kitchenId: string, shareId: string): Promise<void> {
    await this.client.delete(`/kitchens/${kitchenId}/share/${shareId}`);
  }
}

export function createKitchenEndpoints(client: ApiClient): KitchenEndpoints {
  return new KitchenEndpoints(client);
}
