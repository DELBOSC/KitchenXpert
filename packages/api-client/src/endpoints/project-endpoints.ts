/**
 * Endpoints projets (alias pour kitchen-endpoints avec fonctionnalités additionnelles)
 */

import { ApiClient } from '../client';

export interface ProjectQuote {
  id: string;
  projectId: string;
  quoteNumber: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  items: QuoteItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  validUntil: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount?: number;
}

export interface ProjectOrder {
  id: string;
  projectId: string;
  quoteId?: string;
  orderNumber: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: QuoteItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  shippingAddress: Address;
  billingAddress: Address;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  name: string;
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface ProjectCollaborator {
  id: string;
  userId: string;
  projectId: string;
  role: 'viewer' | 'editor' | 'admin';
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  invitedAt: string;
  acceptedAt?: string;
}

export interface ProjectActivity {
  id: string;
  projectId: string;
  userId: string;
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export class ProjectEndpoints {
  constructor(private client: ApiClient) {}

  // Quotes
  async createQuote(projectId: string): Promise<ProjectQuote> {
    const response = await this.client.post<ProjectQuote>(`/projects/${projectId}/quotes`);
    return response.data;
  }

  async getQuotes(projectId: string): Promise<ProjectQuote[]> {
    const response = await this.client.get<ProjectQuote[]>(`/projects/${projectId}/quotes`);
    return response.data;
  }

  async getQuote(projectId: string, quoteId: string): Promise<ProjectQuote> {
    const response = await this.client.get<ProjectQuote>(
      `/projects/${projectId}/quotes/${quoteId}`
    );
    return response.data;
  }

  async updateQuote(
    projectId: string,
    quoteId: string,
    data: Partial<ProjectQuote>
  ): Promise<ProjectQuote> {
    const response = await this.client.patch<ProjectQuote>(
      `/projects/${projectId}/quotes/${quoteId}`,
      data
    );
    return response.data;
  }

  async sendQuote(projectId: string, quoteId: string, email: string): Promise<void> {
    await this.client.post(`/projects/${projectId}/quotes/${quoteId}/send`, {
      email,
    });
  }

  // Orders
  async createOrderFromQuote(projectId: string, quoteId: string): Promise<ProjectOrder> {
    const response = await this.client.post<ProjectOrder>(`/projects/${projectId}/orders`, {
      quoteId,
    });
    return response.data;
  }

  async getOrders(projectId: string): Promise<ProjectOrder[]> {
    const response = await this.client.get<ProjectOrder[]>(`/projects/${projectId}/orders`);
    return response.data;
  }

  async getOrder(projectId: string, orderId: string): Promise<ProjectOrder> {
    const response = await this.client.get<ProjectOrder>(
      `/projects/${projectId}/orders/${orderId}`
    );
    return response.data;
  }

  // Collaboration
  async inviteCollaborator(
    projectId: string,
    email: string,
    role: 'viewer' | 'editor'
  ): Promise<ProjectCollaborator> {
    const response = await this.client.post<ProjectCollaborator>(
      `/projects/${projectId}/collaborators`,
      { email, role }
    );
    return response.data;
  }

  async getCollaborators(projectId: string): Promise<ProjectCollaborator[]> {
    const response = await this.client.get<ProjectCollaborator[]>(
      `/projects/${projectId}/collaborators`
    );
    return response.data;
  }

  async updateCollaboratorRole(
    projectId: string,
    collaboratorId: string,
    role: 'viewer' | 'editor'
  ): Promise<ProjectCollaborator> {
    const response = await this.client.patch<ProjectCollaborator>(
      `/projects/${projectId}/collaborators/${collaboratorId}`,
      { role }
    );
    return response.data;
  }

  async removeCollaborator(projectId: string, collaboratorId: string): Promise<void> {
    await this.client.delete(`/projects/${projectId}/collaborators/${collaboratorId}`);
  }

  // Activity
  async getActivity(
    projectId: string,
    params?: { page?: number; limit?: number }
  ): Promise<{ data: ProjectActivity[]; total: number }> {
    const response = await this.client.get<{ data: ProjectActivity[]; total: number }>(
      `/projects/${projectId}/activity`,
      { params: params as Record<string, unknown> | undefined }
    );
    return response.data;
  }

  // Comments
  async addComment(projectId: string, content: string): Promise<ProjectActivity> {
    const response = await this.client.post<ProjectActivity>(`/projects/${projectId}/comments`, {
      content,
    });
    return response.data;
  }
}

export function createProjectEndpoints(client: ApiClient): ProjectEndpoints {
  return new ProjectEndpoints(client);
}
