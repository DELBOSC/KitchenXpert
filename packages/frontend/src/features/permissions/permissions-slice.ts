import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
  createdAt: string;
}
export interface GroupedPermissions {
  [resource: string]: Permission[];
}

export interface PermissionsState {
  permissions: Permission[];
  groupedPermissions: GroupedPermissions;
  resources: string[];
  actions: string[];
  isLoading: boolean;
  error: string | null;
}

const initialState: PermissionsState = {
  permissions: [],
  groupedPermissions: {},
  resources: [],
  actions: [],
  isLoading: false,
  error: null,
};

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
export const fetchPermissions = createAsyncThunk<Permission[]>(
  'permissions/fetchPermissions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/permissions`, { credentials: 'include' });
      const data = (await response.json()) as { data: Permission[]; error?: string };
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

export const fetchGroupedPermissions = createAsyncThunk<GroupedPermissions>(
  'permissions/fetchGrouped',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/permissions/grouped`, { credentials: 'include' });
      const data = (await response.json()) as { data: GroupedPermissions; error?: string };
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

export const fetchResources = createAsyncThunk<string[]>(
  'permissions/fetchResources',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/permissions/resources`, { credentials: 'include' });
      const data = (await response.json()) as { data: string[]; error?: string };
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

export const fetchActions = createAsyncThunk<string[]>(
  'permissions/fetchActions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/permissions/actions`, { credentials: 'include' });
      const data = (await response.json()) as { data: string[]; error?: string };
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

export const createPermission = createAsyncThunk<
  Permission,
  { name: string; resource: string; action: string; description?: string }
>('permissions/create', async (permData, { rejectWithValue }) => {
  try {
    const response = await fetch(`${API_URL}/permissions`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(permData),
    });
    const data = (await response.json()) as { data: Permission; error?: string };
    if (!response.ok) {
      throw new Error(data.error);
    }
    return data.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return rejectWithValue(message);
  }
});

export const deletePermission = createAsyncThunk<string, string>(
  'permissions/delete',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/permissions/${id}`, {
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

export const seedPermissions = createAsyncThunk<void>(
  'permissions/seed',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/permissions/seed`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error);
      }
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

const permissionsSlice = createSlice({
  name: 'permissions',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPermissions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPermissions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.permissions = action.payload;
      })
      .addCase(fetchPermissions.rejected, (state, action) => {
        state.isLoading = false;
        state.error =
          (action.payload as string) ?? action.error?.message ?? 'An unknown error occurred';
      })
      .addCase(fetchGroupedPermissions.fulfilled, (state, action) => {
        state.groupedPermissions = action.payload;
      })
      .addCase(fetchResources.fulfilled, (state, action) => {
        state.resources = action.payload;
      })
      .addCase(fetchActions.fulfilled, (state, action) => {
        state.actions = action.payload;
      })
      .addCase(createPermission.fulfilled, (state, action) => {
        state.permissions.push(action.payload);
      })
      .addCase(deletePermission.fulfilled, (state, action) => {
        state.permissions = state.permissions.filter((p) => p.id !== action.payload);
      });
  },
});

export const { clearError } = permissionsSlice.actions;
export const selectPermissions = (state: { permissions: PermissionsState }) =>
  state.permissions.permissions;
export const selectGroupedPermissions = (state: { permissions: PermissionsState }) =>
  state.permissions.groupedPermissions;
export const selectPermissionsLoading = (state: { permissions: PermissionsState }) =>
  state.permissions.isLoading;
export default permissionsSlice.reducer;
