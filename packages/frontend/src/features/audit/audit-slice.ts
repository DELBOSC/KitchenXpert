import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: { email: string; firstName: string; lastName: string };
}

export interface AuditFilters { userId?: string; action?: string; resource?: string; startDate?: string; endDate?: string; }

export interface AuditState {
  logs: AuditLog[];
  isLoading: boolean;
  error: string | null;
  filters: AuditFilters;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  stats: { byAction: Record<string, number>; byResource: Record<string, number> } | null;
}

const initialState: AuditState = {
  logs: [], isLoading: false, error: null, filters: {},
  pagination: { page: 1, limit: 50, total: 0, totalPages: 0 }, stats: null,
};

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
export const fetchAuditLogs = createAsyncThunk<
  { data: AuditLog[]; total: number; page: number; totalPages: number },
  { page?: number; limit?: number; filters?: AuditFilters }
>('audit/fetchLogs', async ({ page = 1, limit = 50, filters = {} }, { rejectWithValue }) => {
  try {
    const params = new URLSearchParams({ page: String(page), limit: String(limit), ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
    const response = await fetch(`${API_URL}/audit?${params}`, { credentials: 'include' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return { data: data.data, ...data.meta };
  } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
});

export const fetchUserAuditLogs = createAsyncThunk<AuditLog[], { userId: string; limit?: number }>(
  'audit/fetchUserLogs', async ({ userId, limit = 100 }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/audit/user/${userId}?limit=${limit}`, { credentials: 'include' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

export const fetchResourceHistory = createAsyncThunk<AuditLog[], { resource: string; resourceId: string }>(
  'audit/fetchResourceHistory', async ({ resource, resourceId }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/audit/resource/${resource}/${resourceId}/history`, { credentials: 'include' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

export const fetchAuditStats = createAsyncThunk<{ byAction: Record<string, number>; byResource: Record<string, number> }, { startDate?: string; endDate?: string }>(
  'audit/fetchStats', async ({ startDate, endDate } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const response = await fetch(`${API_URL}/audit/stats?${params}`, { credentials: 'include' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

export const exportAuditLogs = createAsyncThunk<AuditLog[], AuditFilters>('audit/export', async (filters = {}, { rejectWithValue }) => {
  try {
    const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
    const response = await fetch(`${API_URL}/audit/export?${params}`, { credentials: 'include' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data.data;
  } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
});

const auditSlice = createSlice({
  name: 'audit',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<AuditFilters>) => { state.filters = action.payload; },
    clearFilters: (state) => { state.filters = {}; },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAuditLogs.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchAuditLogs.fulfilled, (state, action) => {
        state.isLoading = false; state.logs = action.payload.data;
        state.pagination = { page: action.payload.page, limit: state.pagination.limit, total: action.payload.total, totalPages: action.payload.totalPages };
      })
      .addCase(fetchAuditLogs.rejected, (state, action) => { state.isLoading = false; state.error = (action.payload as string) ?? action.error?.message ?? 'An unknown error occurred'; })
      .addCase(fetchUserAuditLogs.fulfilled, (state, action) => { state.logs = action.payload; })
      .addCase(fetchResourceHistory.fulfilled, (state, action) => { state.logs = action.payload; })
      .addCase(fetchAuditStats.fulfilled, (state, action) => { state.stats = action.payload; });
  },
});

export const { setFilters, clearFilters, clearError } = auditSlice.actions;
export const selectAuditLogs = (state: { audit: AuditState }) => state.audit.logs;
export const selectAuditLoading = (state: { audit: AuditState }) => state.audit.isLoading;
export const selectAuditStats = (state: { audit: AuditState }) => state.audit.stats;
export default auditSlice.reducer;
