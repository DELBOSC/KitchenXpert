import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';

// Types
export interface Kitchen {
  id: string;
  projectId?: string;
  userId: string;
  name: string;
  description?: string;
  style?: string;
  layout?: string;
  dimensions: { width: number; length: number; height: number };
  budget?: number;
  configuration?: Record<string, unknown>;
  items?: KitchenItem[];
  status: 'draft' | 'designing' | 'reviewing' | 'finalized';
  createdAt: string;
  updatedAt: string;
}

export interface KitchenItem {
  id: string;
  type: string;
  productId?: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  dimensions: { width: number; height: number; depth: number };
  customizations?: Record<string, unknown>;
}

export interface KitchenFilters {
  status?: string;
  projectId?: string;
  search?: string;
}

export interface KitchenState {
  kitchens: Kitchen[];
  currentKitchen: Kitchen | null;
  isLoading: boolean;
  error: string | null;
  filters: KitchenFilters;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const initialState: KitchenState = {
  kitchens: [],
  currentKitchen: null,
  isLoading: false,
  error: null,
  filters: {},
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
};

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
export const fetchKitchens = createAsyncThunk<
  { data: Kitchen[]; total: number; page: number; totalPages: number },
  { page?: number; limit?: number; filters?: KitchenFilters }
>('kitchen/fetchKitchens', async ({ page = 1, limit = 20, filters = {} }, { rejectWithValue }) => {
  try {
    const queryParams: Record<string, string> = { page: String(page), limit: String(limit) };
    if (filters.status) {queryParams.status = filters.status;}
    if (filters.projectId) {queryParams.projectId = filters.projectId;}
    if (filters.search) {queryParams.search = filters.search;}
    const params = new URLSearchParams(queryParams);
    const response = await fetch(`${API_URL}/kitchens?${params.toString()}`, { credentials: 'include' });
    const data = (await response.json()) as {
      data: Kitchen[];
      meta: { total: number; page: number; totalPages: number };
      error?: string;
    };
    if (!response.ok) {throw new Error(data.error);}
    return { data: data.data, ...data.meta };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return rejectWithValue(message);
  }
});

export const fetchKitchenById = createAsyncThunk<Kitchen, string>(
  'kitchen/fetchKitchenById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/kitchens/${id}`, { credentials: 'include' });
      const data = (await response.json()) as { data: Kitchen; error?: string };
      if (!response.ok) {throw new Error(data.error);}
      return data.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

export const createKitchen = createAsyncThunk<Kitchen, Partial<Kitchen>>(
  'kitchen/createKitchen',
  async (kitchenData, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/kitchens`, {
        method: 'POST',
        credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kitchenData),
      });
      const data = (await response.json()) as { data: Kitchen; error?: string };
      if (!response.ok) {throw new Error(data.error);}
      return data.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

export const updateKitchen = createAsyncThunk<Kitchen, { id: string; updates: Partial<Kitchen> }>(
  'kitchen/updateKitchen',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/kitchens/${id}`, {
        method: 'PUT',
        credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = (await response.json()) as { data: Kitchen; error?: string };
      if (!response.ok) {throw new Error(data.error);}
      return data.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

export const deleteKitchen = createAsyncThunk<string, string>(
  'kitchen/deleteKitchen',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/kitchens/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {throw new Error(data.error);}
      return id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

export const duplicateKitchen = createAsyncThunk<Kitchen, string>(
  'kitchen/duplicateKitchen',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/kitchens/${id}/duplicate`, { method: 'POST', credentials: 'include' });
      const data = (await response.json()) as { data: Kitchen; error?: string };
      if (!response.ok) {throw new Error(data.error);}
      return data.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

const kitchenSlice = createSlice({
  name: 'kitchen',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<KitchenFilters>) => { state.filters = action.payload; },
    clearFilters: (state) => { state.filters = {}; },
    clearCurrentKitchen: (state) => { state.currentKitchen = null; },
    clearError: (state) => { state.error = null; },
    updateLocalKitchen: (state, action: PayloadAction<Partial<Kitchen>>) => {
      if (state.currentKitchen) {state.currentKitchen = { ...state.currentKitchen, ...action.payload };}
    },
    addItem: (state, action: PayloadAction<KitchenItem>) => {
      if (state.currentKitchen) {state.currentKitchen.items = [...(state.currentKitchen.items || []), action.payload];}
    },
    updateItem: (state, action: PayloadAction<{ id: string; updates: Partial<KitchenItem> }>) => {
      if (state.currentKitchen?.items) {
        const idx = state.currentKitchen.items.findIndex(i => i.id === action.payload.id);
        const existingItem = state.currentKitchen.items[idx];
        if (idx !== -1 && existingItem) {
          state.currentKitchen.items[idx] = {
            ...existingItem,
            ...action.payload.updates,
            id: existingItem.id,
          } as KitchenItem;
        }
      }
    },
    removeItem: (state, action: PayloadAction<string>) => {
      if (state.currentKitchen?.items) {state.currentKitchen.items = state.currentKitchen.items.filter(i => i.id !== action.payload);}
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchKitchens.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchKitchens.fulfilled, (state, action) => {
        state.isLoading = false;
        state.kitchens = action.payload.data;
        state.pagination = { page: action.payload.page, limit: state.pagination.limit, total: action.payload.total, totalPages: action.payload.totalPages };
      })
      .addCase(fetchKitchens.rejected, (state, action) => { state.isLoading = false; state.error = (action.payload as string) ?? action.error?.message ?? 'An unknown error occurred'; })
      .addCase(fetchKitchenById.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchKitchenById.fulfilled, (state, action) => { state.isLoading = false; state.currentKitchen = action.payload; })
      .addCase(fetchKitchenById.rejected, (state, action) => { state.isLoading = false; state.error = (action.payload as string) ?? action.error?.message ?? 'An unknown error occurred'; })
      .addCase(createKitchen.fulfilled, (state, action) => { state.kitchens.unshift(action.payload); state.currentKitchen = action.payload; })
      .addCase(updateKitchen.fulfilled, (state, action) => {
        const idx = state.kitchens.findIndex(k => k.id === action.payload.id);
        if (idx !== -1) {state.kitchens[idx] = action.payload;}
        if (state.currentKitchen?.id === action.payload.id) {state.currentKitchen = action.payload;}
      })
      .addCase(deleteKitchen.fulfilled, (state, action) => {
        state.kitchens = state.kitchens.filter(k => k.id !== action.payload);
        if (state.currentKitchen?.id === action.payload) {state.currentKitchen = null;}
      })
      .addCase(duplicateKitchen.fulfilled, (state, action) => { state.kitchens.unshift(action.payload); });
  },
});

export const { setFilters, clearFilters, clearCurrentKitchen, clearError, updateLocalKitchen, addItem, updateItem, removeItem } = kitchenSlice.actions;
export const selectKitchens = (state: { kitchen: KitchenState }) => state.kitchen.kitchens;
export const selectCurrentKitchen = (state: { kitchen: KitchenState }) => state.kitchen.currentKitchen;
export const selectKitchenLoading = (state: { kitchen: KitchenState }) => state.kitchen.isLoading;
export const selectKitchenError = (state: { kitchen: KitchenState }) => state.kitchen.error;
export default kitchenSlice.reducer;
