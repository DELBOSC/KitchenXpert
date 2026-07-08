import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  // Mirrors the backend ProjectStatus enum (Prisma/Zod). 'active' was invalid
  // (rejected 400 on create) — the backend never emits it.
  status: 'draft' | 'in_progress' | 'review' | 'approved' | 'completed' | 'archived';
  budget?: number;
  timeline?: { start?: string; end?: string };
  collaborators?: {
    userId: string;
    role: string;
    user?: { email: string; firstName: string; lastName: string };
  }[];
  kitchens?: { id: string; name: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFilters {
  status?: string;
  search?: string;
}

export interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
  filters: ProjectFilters;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const initialState: ProjectState = {
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,
  filters: {},
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
};

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
export const fetchProjects = createAsyncThunk<
  { data: Project[]; total: number; page: number; totalPages: number },
  { page?: number; limit?: number; filters?: ProjectFilters }
>('project/fetchProjects', async ({ page = 1, limit = 20, filters = {} }, { rejectWithValue }) => {
  try {
    const params = new URLSearchParams({ page: String(page), limit: String(limit), ...filters });
    const response = await fetch(`${API_URL}/projects?${params.toString()}`, {
      credentials: 'include',
    });
    const data = (await response.json()) as {
      data: Project[];
      meta: { total: number; page: number; totalPages: number };
      error?: string;
    };
    if (!response.ok) {
      throw new Error(data.error);
    }
    return { data: data.data, ...data.meta };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return rejectWithValue(message);
  }
});

export const fetchProjectById = createAsyncThunk<Project, string>(
  'project/fetchProjectById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/projects/${id}`, { credentials: 'include' });
      const data = (await response.json()) as { data: Project; error?: string };
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

export const createProject = createAsyncThunk<Project, Partial<Project>>(
  'project/createProject',
  async (projectData, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });
      const data = (await response.json()) as { data: Project; error?: string };
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

export const updateProject = createAsyncThunk<Project, { id: string; updates: Partial<Project> }>(
  'project/updateProject',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/projects/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = (await response.json()) as { data: Project; error?: string };
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

export const deleteProject = createAsyncThunk<string, string>(
  'project/deleteProject',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/projects/${id}`, {
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

export const updateProjectStatus = createAsyncThunk<Project, { id: string; status: string }>(
  'project/updateStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/projects/${id}/status`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = (await response.json()) as { data: Project; error?: string };
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

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<ProjectFilters>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearCurrentProject: (state) => {
      state.currentProject = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.isLoading = false;
        state.projects = action.payload.data;
        state.pagination = {
          page: action.payload.page,
          limit: state.pagination.limit,
          total: action.payload.total,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.isLoading = false;
        state.error =
          (action.payload as string) ?? action.error?.message ?? 'An unknown error occurred';
      })
      .addCase(fetchProjectById.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentProject = action.payload;
      })
      .addCase(fetchProjectById.rejected, (state, action) => {
        state.isLoading = false;
        state.error =
          (action.payload as string) ?? action.error?.message ?? 'An unknown error occurred';
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.projects.unshift(action.payload);
        state.currentProject = action.payload;
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        const idx = state.projects.findIndex((p) => p.id === action.payload.id);
        if (idx !== -1) {
          state.projects[idx] = action.payload;
        }
        if (state.currentProject?.id === action.payload.id) {
          state.currentProject = action.payload;
        }
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.projects = state.projects.filter((p) => p.id !== action.payload);
        if (state.currentProject?.id === action.payload) {
          state.currentProject = null;
        }
      })
      .addCase(updateProjectStatus.fulfilled, (state, action) => {
        const idx = state.projects.findIndex((p) => p.id === action.payload.id);
        if (idx !== -1) {
          state.projects[idx] = action.payload;
        }
        if (state.currentProject?.id === action.payload.id) {
          state.currentProject = action.payload;
        }
      });
  },
});

export const { setFilters, clearFilters, clearCurrentProject, clearError } = projectSlice.actions;
export const selectProjects = (state: { project: ProjectState }) => state.project.projects;
export const selectCurrentProject = (state: { project: ProjectState }) =>
  state.project.currentProject;
export const selectProjectLoading = (state: { project: ProjectState }) => state.project.isLoading;
export const selectProjectError = (state: { project: ProjectState }) => state.project.error;
export default projectSlice.reducer;
