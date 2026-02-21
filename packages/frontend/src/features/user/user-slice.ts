import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface UserFilters { role?: string; isActive?: boolean; search?: string; }

export interface UserState {
  users: User[];
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;
  filters: UserFilters;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const initialState: UserState = {
  users: [], currentUser: null, isLoading: false, error: null, filters: {},
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
};

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
export const fetchUsers = createAsyncThunk<
  { data: User[]; total: number; page: number; totalPages: number },
  { page?: number; limit?: number; filters?: UserFilters }
>('user/fetchUsers', async ({ page = 1, limit = 20, filters = {} }, { rejectWithValue }) => {
  try {
    const params = new URLSearchParams({ page: String(page), limit: String(limit), ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined)) });
    const response = await fetch(`${API_URL}/users?${params}`, { credentials: 'include' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return { data: data.data, ...data.meta };
  } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
});

export const fetchUserById = createAsyncThunk<User, string>('user/fetchUserById', async (id, { rejectWithValue }) => {
  try {
    const response = await fetch(`${API_URL}/users/${id}`, { credentials: 'include' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data.data;
  } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
});

export const updateUser = createAsyncThunk<User, { id: string; updates: Partial<User> }>('user/updateUser', async ({ id, updates }, { rejectWithValue }) => {
  try {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data.data;
  } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
});

export const deleteUser = createAsyncThunk<string, string>('user/deleteUser', async (id, { rejectWithValue }) => {
  try {
    const response = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE', credentials: 'include' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return id;
  } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
});

export const toggleUserActive = createAsyncThunk<User, string>('user/toggleUserActive', async (id, { rejectWithValue }) => {
  try {
    const response = await fetch(`${API_URL}/admin/users/${id}/toggle-active`, { method: 'PUT', credentials: 'include' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data.data;
  } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
});

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<UserFilters>) => { state.filters = action.payload; },
    clearFilters: (state) => { state.filters = {}; },
    clearCurrentUser: (state) => { state.currentUser = null; },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.isLoading = false; state.users = action.payload.data;
        state.pagination = { page: action.payload.page, limit: state.pagination.limit, total: action.payload.total, totalPages: action.payload.totalPages };
      })
      .addCase(fetchUsers.rejected, (state, action) => { state.isLoading = false; state.error = (action.payload as string) ?? action.error?.message ?? 'An unknown error occurred'; })
      .addCase(fetchUserById.fulfilled, (state, action) => { state.currentUser = action.payload; })
      .addCase(updateUser.fulfilled, (state, action) => {
        const idx = state.users.findIndex(u => u.id === action.payload.id);
        if (idx !== -1) state.users[idx] = action.payload;
        if (state.currentUser?.id === action.payload.id) state.currentUser = action.payload;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.users = state.users.filter(u => u.id !== action.payload);
        if (state.currentUser?.id === action.payload) state.currentUser = null;
      })
      .addCase(toggleUserActive.fulfilled, (state, action) => {
        const idx = state.users.findIndex(u => u.id === action.payload.id);
        if (idx !== -1) state.users[idx] = action.payload;
      });
  },
});

export const { setFilters, clearFilters, clearCurrentUser, clearError } = userSlice.actions;
export const selectUsers = (state: { user: UserState }) => state.user.users;
export const selectCurrentUser = (state: { user: UserState }) => state.user.currentUser;
export const selectUserLoading = (state: { user: UserState }) => state.user.isLoading;
export default userSlice.reducer;
