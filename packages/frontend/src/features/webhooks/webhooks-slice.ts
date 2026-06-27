import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export interface Webhook {
  id: string;
  partnerId?: string;
  name: string;
  url: string;
  secretLast4?: string;
  events: string[];
  headers?: Record<string, string>;
  isActive: boolean;
  retryCount: number;
  timeout: number;
  lastTriggeredAt?: string;
  createdAt: string;
}

export interface WebhookEvent {
  id: string;
  webhookId: string;
  eventType: string;
  payload: unknown;
  status: 'PENDING' | 'DELIVERED' | 'FAILED';
  responseCode?: number;
  responseTime?: number;
  attempts: number;
  createdAt: string;
}

export interface WebhooksState {
  webhooks: Webhook[];
  currentWebhook: Webhook | null;
  events: WebhookEvent[];
  failedEvents: WebhookEvent[];
  isLoading: boolean;
  error: string | null;
  stats: { deliveryRate: number; totalEvents: number; failedEvents: number } | null;
}

const initialState: WebhooksState = {
  webhooks: [],
  currentWebhook: null,
  events: [],
  failedEvents: [],
  isLoading: false,
  error: null,
  stats: null,
};

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
export const fetchWebhooks = createAsyncThunk<Webhook[]>(
  'webhooks/fetchWebhooks',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/webhooks`, { credentials: 'include' });
      const data = (await response.json()) as { data: Webhook[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error);
      }
      return data.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

export const fetchWebhookById = createAsyncThunk<Webhook, string>(
  'webhooks/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/webhooks/${id}`, { credentials: 'include' });
      const data = (await response.json()) as { data: Webhook; error?: string };
      if (!response.ok) {
        throw new Error(data.error);
      }
      return data.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

export const createWebhook = createAsyncThunk<Webhook, Partial<Webhook>>(
  'webhooks/create',
  async (webhookData, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/webhooks`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookData),
      });
      const data = (await response.json()) as { data: Webhook; error?: string };
      if (!response.ok) {
        throw new Error(data.error);
      }
      return data.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

export const updateWebhook = createAsyncThunk<Webhook, { id: string; updates: Partial<Webhook> }>(
  'webhooks/update',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/webhooks/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = (await response.json()) as { data: Webhook; error?: string };
      if (!response.ok) {
        throw new Error(data.error);
      }
      return data.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

export const deleteWebhook = createAsyncThunk<string, string>(
  'webhooks/delete',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/webhooks/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error);
      }
      return id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

export const toggleWebhook = createAsyncThunk<Webhook, string>(
  'webhooks/toggle',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/webhooks/${id}/toggle`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = (await response.json()) as { data: Webhook; error?: string };
      if (!response.ok) {
        throw new Error(data.error);
      }
      return data.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

export const testWebhook = createAsyncThunk<WebhookEvent, string>(
  'webhooks/test',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/webhooks/${id}/test`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = (await response.json()) as { data: WebhookEvent; error?: string };
      if (!response.ok) {
        throw new Error(data.error);
      }
      return data.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

export const regenerateSecret = createAsyncThunk<{ secretLast4: string }, string>(
  'webhooks/regenerateSecret',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/webhooks/${id}/regenerate-secret`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = (await response.json()) as { data: { secretLast4: string }; error?: string };
      if (!response.ok) {
        throw new Error(data.error);
      }
      return data.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

export const fetchWebhookEvents = createAsyncThunk<WebhookEvent[], { id: string; limit?: number }>(
  'webhooks/fetchEvents',
  async ({ id, limit = 50 }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/webhooks/${id}/events?limit=${limit}`, {
        credentials: 'include',
      });
      const data = (await response.json()) as { data: WebhookEvent[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error);
      }
      return data.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

export const fetchFailedEvents = createAsyncThunk<WebhookEvent[]>(
  'webhooks/fetchFailed',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/webhooks/failed`, { credentials: 'include' });
      const data = (await response.json()) as { data: WebhookEvent[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error);
      }
      return data.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

const webhooksSlice = createSlice({
  name: 'webhooks',
  initialState,
  reducers: {
    clearCurrentWebhook: (state) => {
      state.currentWebhook = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWebhooks.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWebhooks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.webhooks = action.payload;
      })
      .addCase(fetchWebhooks.rejected, (state, action) => {
        state.isLoading = false;
        state.error =
          (action.payload as string) ?? action.error?.message ?? 'An unknown error occurred';
      })
      .addCase(fetchWebhookById.fulfilled, (state, action) => {
        state.currentWebhook = action.payload;
      })
      .addCase(createWebhook.fulfilled, (state, action) => {
        state.webhooks.push(action.payload);
      })
      .addCase(updateWebhook.fulfilled, (state, action) => {
        const idx = state.webhooks.findIndex((w) => w.id === action.payload.id);
        if (idx !== -1) {
          state.webhooks[idx] = action.payload;
        }
        if (state.currentWebhook?.id === action.payload.id) {
          state.currentWebhook = action.payload;
        }
      })
      .addCase(deleteWebhook.fulfilled, (state, action) => {
        state.webhooks = state.webhooks.filter((w) => w.id !== action.payload);
        if (state.currentWebhook?.id === action.payload) {
          state.currentWebhook = null;
        }
      })
      .addCase(toggleWebhook.fulfilled, (state, action) => {
        const idx = state.webhooks.findIndex((w) => w.id === action.payload.id);
        if (idx !== -1) {
          state.webhooks[idx] = action.payload;
        }
      })
      .addCase(fetchWebhookEvents.fulfilled, (state, action) => {
        state.events = action.payload;
      })
      .addCase(fetchFailedEvents.fulfilled, (state, action) => {
        state.failedEvents = action.payload;
      });
  },
});

export const { clearCurrentWebhook, clearError } = webhooksSlice.actions;
export const selectWebhooks = (state: { webhooks: WebhooksState }) => state.webhooks.webhooks;
export const selectCurrentWebhook = (state: { webhooks: WebhooksState }) =>
  state.webhooks.currentWebhook;
export const selectWebhookEvents = (state: { webhooks: WebhooksState }) => state.webhooks.events;
export const selectWebhooksLoading = (state: { webhooks: WebhooksState }) =>
  state.webhooks.isLoading;
export default webhooksSlice.reducer;
