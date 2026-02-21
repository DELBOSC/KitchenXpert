import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export interface ApiError {
  message: string;
  code: string;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: Partner;
}

export interface Partner {
  id: string;
  email: string;
  companyName: string;
  contactName: string;
  phone: string;
  address: string;
  tier: 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'pending' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  partnerId: string;
  name: string;
  sku: string;
  description: string;
  category: string;
  subcategory: string;
  price: number;
  currency: string;
  dimensions: {
    width: number;
    height: number;
    depth: number;
    unit: string;
  };
  materials: string[];
  colors: string[];
  images: string[];
  modelUrl?: string;
  status: 'draft' | 'pending' | 'active' | 'inactive';
  stock: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCreateInput {
  name: string;
  sku: string;
  description: string;
  category: string;
  subcategory: string;
  price: number;
  currency: string;
  dimensions: {
    width: number;
    height: number;
    depth: number;
    unit: string;
  };
  materials: string[];
  colors: string[];
  images: string[];
  modelUrl?: string;
  stock: number;
}

export interface ProductUpdateInput extends Partial<ProductCreateInput> {
  status?: 'draft' | 'pending' | 'active' | 'inactive';
}

export interface Order {
  id: string;
  orderNumber: string;
  partnerId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface DashboardStats {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  revenueThisMonth: number;
  ordersThisMonth: number;
  conversionRate: number;
}

export interface SalesAnalytics {
  dailySales: { date: string; revenue: number; orders: number }[];
  topProducts: { productId: string; name: string; revenue: number; quantity: number }[];
  salesByCategory: { category: string; revenue: number; percentage: number }[];
  ordersByStatus: { status: string; count: number }[];
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          try {
            await this.client.post('/partner/auth/refresh');

            if (error.config) {
              return this.client.request(error.config);
            }
          } catch {
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
          }
        }
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError): ApiError {
    const response = error.response;
    return {
      message: (response?.data as { message?: string })?.message || error.message || 'An unexpected error occurred',
      code: (response?.data as { code?: string })?.code || 'UNKNOWN_ERROR',
      status: response?.status || 500,
    };
  }

  // Auth endpoints
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/partner/auth/login', credentials);
    return response.data;
  }

  async logout(): Promise<void> {
    await this.client.post('/partner/auth/logout');
  }

  async refreshToken(): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/partner/auth/refresh');
    return response.data;
  }

  async getProfile(): Promise<Partner> {
    const response = await this.client.get<Partner>('/partner/profile');
    return response.data;
  }

  async updateProfile(data: Partial<Partner>): Promise<Partner> {
    const response = await this.client.put<Partner>('/partner/profile', data);
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.client.post('/partner/auth/change-password', { currentPassword, newPassword });
  }

  // Dashboard endpoints
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await this.client.get<DashboardStats>('/partner/dashboard/stats');
    return response.data;
  }

  // Products endpoints
  async getProducts(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<Product>> {
    const response = await this.client.get<PaginatedResponse<Product>>('/partner/products', { params });
    return response.data;
  }

  async getProduct(id: string): Promise<Product> {
    const response = await this.client.get<Product>(`/partner/products/${id}`);
    return response.data;
  }

  async createProduct(data: ProductCreateInput): Promise<Product> {
    const response = await this.client.post<Product>('/partner/products', data);
    return response.data;
  }

  async updateProduct(id: string, data: ProductUpdateInput): Promise<Product> {
    const response = await this.client.put<Product>(`/partner/products/${id}`, data);
    return response.data;
  }

  async deleteProduct(id: string): Promise<void> {
    await this.client.delete(`/partner/products/${id}`);
  }

  async uploadProductImages(productId: string, files: File[]): Promise<string[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    const response = await this.client.post<{ urls: string[] }>(
      `/partner/products/${productId}/images`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data.urls;
  }

  // Orders endpoints
  async getOrders(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<Order>> {
    const response = await this.client.get<PaginatedResponse<Order>>('/partner/orders', { params });
    return response.data;
  }

  async getOrder(id: string): Promise<Order> {
    const response = await this.client.get<Order>(`/partner/orders/${id}`);
    return response.data;
  }

  async updateOrderStatus(
    id: string,
    status: Order['status'],
    trackingNumber?: string
  ): Promise<Order> {
    const response = await this.client.patch<Order>(`/partner/orders/${id}/status`, {
      status,
      trackingNumber,
    });
    return response.data;
  }

  // Analytics endpoints
  async getSalesAnalytics(params?: {
    startDate?: string;
    endDate?: string;
    period?: 'day' | 'week' | 'month';
  }): Promise<SalesAnalytics> {
    const response = await this.client.get<SalesAnalytics>('/partner/analytics/sales', { params });
    return response.data;
  }

  async getProductAnalytics(productId: string): Promise<{
    views: number;
    addedToCart: number;
    purchased: number;
    revenue: number;
    dailyViews: { date: string; views: number }[];
  }> {
    const response = await this.client.get(`/partner/analytics/products/${productId}`);
    return response.data;
  }
}

export const api = new ApiClient();
export default api;
