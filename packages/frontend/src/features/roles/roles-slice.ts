import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
}
export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions?: Permission[];
  userCount?: number;
  createdAt: string;
}

export interface RolesState {
  roles: Role[];
  currentRole: Role | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: RolesState = { roles: [], currentRole: null, isLoading: false, error: null };

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
export const fetchRoles = createAsyncThunk<Role[]>(
  'roles/fetchRoles',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/roles`, { credentials: 'include' });
      const data = (await response.json()) as { data: Role[]; error?: string };
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

export const fetchRoleById = createAsyncThunk<Role, string>(
  'roles/fetchRoleById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/roles/${id}`, { credentials: 'include' });
      const data = (await response.json()) as { data: Role; error?: string };
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

export const createRole = createAsyncThunk<
  Role,
  { name: string; description?: string; permissionIds?: string[] }
>('roles/createRole', async (roleData, { rejectWithValue }) => {
  try {
    const response = await fetch(`${API_URL}/roles`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roleData),
    });
    const data = (await response.json()) as { data: Role; error?: string };
    if (!response.ok) {
      throw new Error(data.error);
    }
    return data.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return rejectWithValue(message);
  }
});

export const updateRole = createAsyncThunk<Role, { id: string; updates: Partial<Role> }>(
  'roles/updateRole',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/roles/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = (await response.json()) as { data: Role; error?: string };
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

export const deleteRole = createAsyncThunk<string, string>(
  'roles/deleteRole',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/roles/${id}`, {
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

export const setRolePermissions = createAsyncThunk<Role, { id: string; permissionIds: string[] }>(
  'roles/setPermissions',
  async ({ id, permissionIds }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/roles/${id}/permissions`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionIds }),
      });
      const data = (await response.json()) as { data: Role; error?: string };
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

const rolesSlice = createSlice({
  name: 'roles',
  initialState,
  reducers: {
    clearCurrentRole: (state) => {
      state.currentRole = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoles.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRoles.fulfilled, (state, action) => {
        state.isLoading = false;
        state.roles = action.payload;
      })
      .addCase(fetchRoles.rejected, (state, action) => {
        state.isLoading = false;
        state.error =
          (action.payload as string) ?? action.error?.message ?? 'An unknown error occurred';
      })
      .addCase(fetchRoleById.fulfilled, (state, action) => {
        state.currentRole = action.payload;
      })
      .addCase(createRole.fulfilled, (state, action) => {
        state.roles.push(action.payload);
      })
      .addCase(updateRole.fulfilled, (state, action) => {
        const idx = state.roles.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) {
          state.roles[idx] = action.payload;
        }
        if (state.currentRole?.id === action.payload.id) {
          state.currentRole = action.payload;
        }
      })
      .addCase(deleteRole.fulfilled, (state, action) => {
        state.roles = state.roles.filter((r) => r.id !== action.payload);
        if (state.currentRole?.id === action.payload) {
          state.currentRole = null;
        }
      })
      .addCase(setRolePermissions.fulfilled, (state, action) => {
        const idx = state.roles.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) {
          state.roles[idx] = action.payload;
        }
        if (state.currentRole?.id === action.payload.id) {
          state.currentRole = action.payload;
        }
      });
  },
});

export const { clearCurrentRole, clearError } = rolesSlice.actions;
export const selectRoles = (state: { roles: RolesState }) => state.roles.roles;
export const selectCurrentRole = (state: { roles: RolesState }) => state.roles.currentRole;
export const selectRolesLoading = (state: { roles: RolesState }) => state.roles.isLoading;
export default rolesSlice.reducer;
