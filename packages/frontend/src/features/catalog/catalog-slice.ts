import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';

export interface CatalogItem {
  id: string;
  catalogId: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  price: number;
  currency: string;
  images: string[];
  specifications?: Record<string, unknown>;
  dimensions?: { width: number; height: number; depth: number };
  isActive: boolean;
}

export interface Catalog {
  id: string;
  providerId: string;
  name: string;
  code: string;
  description?: string;
  version: string;
  isActive: boolean;
  isFeatured: boolean;
  productCount?: number;
  lastSyncAt?: string;
}

export interface CatalogFilters { category?: string; providerId?: string; minPrice?: number; maxPrice?: number; search?: string; }

export interface CatalogState {
  catalogs: Catalog[];
  products: CatalogItem[];
  providers: { id: string; name: string; code: string; isActive: boolean }[];
  currentCatalog: Catalog | null;
  currentProduct: CatalogItem | null;
  categories: string[];
  isLoading: boolean;
  error: string | null;
  filters: CatalogFilters;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const initialState: CatalogState = {
  catalogs: [], products: [], providers: [], currentCatalog: null, currentProduct: null, categories: [],
  isLoading: false, error: null, filters: {}, pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
};

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
export const fetchCatalogs = createAsyncThunk<Catalog[]>('catalog/fetchCatalogs', async (_, { rejectWithValue }) => {
  try {
    const response = await fetch(`${API_URL}/catalog`, { credentials: 'include' });
    const data = await response.json();
    if (!response.ok) {throw new Error(data.error);}
    return data.data;
  } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
});

export const fetchProducts = createAsyncThunk<
  { data: CatalogItem[]; total: number; page: number; totalPages: number },
  { catalogId?: string; page?: number; limit?: number; filters?: CatalogFilters }
>('catalog/fetchProducts', async ({ catalogId, page = 1, limit = 20, filters = {} }, { rejectWithValue }) => {
  try {
    const queryParams: Record<string, string> = { page: String(page), limit: String(limit) };
    if (filters.category) {queryParams.category = filters.category;}
    if (filters.providerId) {queryParams.providerId = filters.providerId;}
    if (filters.minPrice !== undefined) {queryParams.minPrice = String(filters.minPrice);}
    if (filters.maxPrice !== undefined) {queryParams.maxPrice = String(filters.maxPrice);}
    if (filters.search) {queryParams.search = filters.search;}
    const params = new URLSearchParams(queryParams);
    const url = catalogId ? `${API_URL}/catalog/${catalogId}/products?${params.toString()}` : `${API_URL}/products?${params.toString()}`;
    const response = await fetch(url, { credentials: 'include' });
    const data = await response.json();
    if (!response.ok) {throw new Error(data.error);}
    return { data: data.data, ...data.meta };
  } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
});

export const searchProducts = createAsyncThunk<CatalogItem[], string>('catalog/searchProducts', async (query, { rejectWithValue }) => {
  try {
    const response = await fetch(`${API_URL}/catalog/search?q=${encodeURIComponent(query)}`, { credentials: 'include' });
    const data = await response.json();
    if (!response.ok) {throw new Error(data.error);}
    return data.data;
  } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
});

export const fetchCategories = createAsyncThunk<string[]>('catalog/fetchCategories', async (_, { rejectWithValue }) => {
  try {
    const response = await fetch(`${API_URL}/products/categories`, { credentials: 'include' });
    const data = await response.json();
    if (!response.ok) {throw new Error(data.error);}
    return data.data;
  } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
});

const catalogSlice = createSlice({
  name: 'catalog',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<CatalogFilters>) => { state.filters = action.payload; },
    clearFilters: (state) => { state.filters = {}; },
    setCurrentProduct: (state, action: PayloadAction<CatalogItem | null>) => { state.currentProduct = action.payload; },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCatalogs.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchCatalogs.fulfilled, (state, action) => { state.isLoading = false; state.catalogs = action.payload; })
      .addCase(fetchCatalogs.rejected, (state, action) => { state.isLoading = false; state.error = (action.payload as string) ?? action.error?.message ?? 'An unknown error occurred'; })
      .addCase(fetchProducts.pending, (state) => { state.isLoading = true; })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.isLoading = false; state.products = action.payload.data;
        state.pagination = { page: action.payload.page, limit: state.pagination.limit, total: action.payload.total, totalPages: action.payload.totalPages };
      })
      .addCase(fetchProducts.rejected, (state, action) => { state.isLoading = false; state.error = (action.payload as string) ?? action.error?.message ?? 'An unknown error occurred'; })
      .addCase(searchProducts.fulfilled, (state, action) => { state.products = action.payload; })
      .addCase(fetchCategories.fulfilled, (state, action) => { state.categories = action.payload; });
  },
});

export const { setFilters, clearFilters, setCurrentProduct, clearError } = catalogSlice.actions;
export const selectCatalogs = (state: { catalog: CatalogState }) => state.catalog.catalogs;
export const selectProducts = (state: { catalog: CatalogState }) => state.catalog.products;
export const selectCategories = (state: { catalog: CatalogState }) => state.catalog.categories;
export const selectCatalogLoading = (state: { catalog: CatalogState }) => state.catalog.isLoading;
export default catalogSlice.reducer;
