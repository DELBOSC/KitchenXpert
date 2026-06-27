import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api, { Partner, LoginCredentials, ApiError } from '@/services/api';

interface AuthState {
  user: Partner | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

export const checkAuth = createAsyncThunk<Partner, void, { rejectValue: string }>(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      return await api.getProfile();
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message);
    }
  }
);

export const login = createAsyncThunk<
  { user: Partner; token: string },
  LoginCredentials,
  { rejectValue: string }
>('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const response = await api.login(credentials);
    return { user: response.user, token: response.token };
  } catch (error) {
    const apiError = error as ApiError;
    return rejectWithValue(apiError.message);
  }
});

export const logout = createAsyncThunk<void, void, { rejectValue: string }>(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await api.logout();
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message);
    }
  }
);

export const fetchProfile = createAsyncThunk<Partner, void, { rejectValue: string }>(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      return await api.getProfile();
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message);
    }
  }
);

export const updateProfile = createAsyncThunk<Partner, Partial<Partner>, { rejectValue: string }>(
  'auth/updateProfile',
  async (data, { rejectWithValue }) => {
    try {
      return await api.updateProfile(data);
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      state.isAuthenticated = true;
    },
  },
  extraReducers: (builder) => {
    builder
      // Check Auth
      .addCase(checkAuth.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      })
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Login failed';
      })
      // Logout
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.error = null;
      })
      .addCase(logout.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      })
      // Fetch Profile
      .addCase(fetchProfile.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch profile';
      })
      // Update Profile
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to update profile';
      });
  },
});

export const { clearError, setToken } = authSlice.actions;
export default authSlice.reducer;
