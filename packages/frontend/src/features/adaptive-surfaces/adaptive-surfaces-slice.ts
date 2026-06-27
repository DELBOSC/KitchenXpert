import {
  createSlice,
  createAsyncThunk,
  createSelector,
  type PayloadAction,
} from '@reduxjs/toolkit';

export interface Surface {
  id: string;
  type: 'countertop' | 'backsplash' | 'cabinet' | 'floor' | 'wall';
  materialId: string;
  color: string;
  finish: string;
  texture?: string;
  dimensions: { width: number; height: number; depth?: number };
  position: { x: number; y: number; z: number };
}

export interface Material {
  id: string;
  name: string;
  type: string;
  category: string;
  color: string;
  finish: string;
  textureUrl?: string;
  pricePerUnit: number;
  durability: number;
  maintenanceLevel: string;
  ecoRating?: string;
}

export interface SurfaceRecommendation {
  surfaceId: string;
  suggestedMaterials: Material[];
  colorHarmony: string[];
  reason: string;
}

export interface AdaptiveSurfacesState {
  surfaces: Surface[];
  materials: Material[];
  selectedSurfaceId: string | null;
  recommendations: SurfaceRecommendation[];
  colorPalette: string[];
  isAnalyzing: boolean;
  isLoading: boolean;
  error: string | null;
  previewMode: boolean;
}

const initialState: AdaptiveSurfacesState = {
  surfaces: [],
  materials: [],
  selectedSurfaceId: null,
  recommendations: [],
  colorPalette: [],
  isAnalyzing: false,
  isLoading: false,
  error: null,
  previewMode: false,
};

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
export const fetchMaterials = createAsyncThunk<Material[], { type?: string; category?: string }>(
  'adaptiveSurfaces/fetchMaterials',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
      );
      const response = await fetch(`${API_URL}/materials?${params.toString()}`, {
        credentials: 'include',
      });
      const data = (await response.json()) as { data: Material[]; error?: string };
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

export const analyzeSurfaces = createAsyncThunk<
  SurfaceRecommendation[],
  { kitchenId: string; style?: string }
>('adaptiveSurfaces/analyze', async ({ kitchenId, style }, { rejectWithValue }) => {
  try {
    const response = await fetch(`${API_URL}/ai/analyze-surfaces`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kitchenId, style }),
    });
    const data = (await response.json()) as {
      data: { recommendations: SurfaceRecommendation[] };
      error?: string;
    };
    if (!response.ok) {
      throw new Error(data.error);
    }
    return data.data.recommendations;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return rejectWithValue(message);
  }
});

export const generateColorPalette = createAsyncThunk<
  string[],
  { baseColor: string; style?: string }
>('adaptiveSurfaces/generatePalette', async ({ baseColor, style }, { rejectWithValue }) => {
  try {
    const response = await fetch(`${API_URL}/ai/color-palette`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseColor, style }),
    });
    const data = (await response.json()) as { data: { colors: string[] }; error?: string };
    if (!response.ok) {
      throw new Error(data.error);
    }
    return data.data.colors;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return rejectWithValue(message);
  }
});

export const applyMaterialToSurface = createAsyncThunk<
  Surface,
  { surfaceId: string; materialId: string }
>('adaptiveSurfaces/applyMaterial', ({ surfaceId, materialId }, { rejectWithValue, getState }) => {
  try {
    const state = getState() as { adaptiveSurfaces: AdaptiveSurfacesState };
    const surface = state.adaptiveSurfaces.surfaces.find((s) => s.id === surfaceId);
    const material = state.adaptiveSurfaces.materials.find((m) => m.id === materialId);
    if (!surface || !material) {
      throw new Error('Surface or material not found');
    }
    return {
      ...surface,
      materialId,
      color: material.color,
      finish: material.finish,
      texture: material.textureUrl,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return rejectWithValue(message);
  }
});

const adaptiveSurfacesSlice = createSlice({
  name: 'adaptiveSurfaces',
  initialState,
  reducers: {
    setSurfaces: (state, action: PayloadAction<Surface[]>) => {
      state.surfaces = action.payload;
    },
    addSurface: (state, action: PayloadAction<Surface>) => {
      state.surfaces.push(action.payload);
    },
    updateSurface: (state, action: PayloadAction<{ id: string; updates: Partial<Surface> }>) => {
      const idx = state.surfaces.findIndex((s) => s.id === action.payload.id);
      const existing = state.surfaces[idx];
      if (idx !== -1 && existing) {
        state.surfaces[idx] = {
          ...existing,
          ...action.payload.updates,
          id: existing.id,
        } as Surface;
      }
    },
    removeSurface: (state, action: PayloadAction<string>) => {
      state.surfaces = state.surfaces.filter((s) => s.id !== action.payload);
      if (state.selectedSurfaceId === action.payload) {
        state.selectedSurfaceId = null;
      }
    },
    selectSurface: (state, action: PayloadAction<string | null>) => {
      state.selectedSurfaceId = action.payload;
    },
    setColorPalette: (state, action: PayloadAction<string[]>) => {
      state.colorPalette = action.payload;
    },
    togglePreviewMode: (state) => {
      state.previewMode = !state.previewMode;
    },
    clearRecommendations: (state) => {
      state.recommendations = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMaterials.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMaterials.fulfilled, (state, action) => {
        state.isLoading = false;
        state.materials = action.payload;
      })
      .addCase(fetchMaterials.rejected, (state, action) => {
        state.isLoading = false;
        state.error =
          (action.payload as string) ?? action.error?.message ?? 'An unknown error occurred';
      })
      .addCase(analyzeSurfaces.pending, (state) => {
        state.isAnalyzing = true;
      })
      .addCase(analyzeSurfaces.fulfilled, (state, action) => {
        state.isAnalyzing = false;
        state.recommendations = action.payload;
      })
      .addCase(analyzeSurfaces.rejected, (state, action) => {
        state.isAnalyzing = false;
        state.error =
          (action.payload as string) ?? action.error?.message ?? 'An unknown error occurred';
      })
      .addCase(generateColorPalette.fulfilled, (state, action) => {
        state.colorPalette = action.payload;
      })
      .addCase(applyMaterialToSurface.fulfilled, (state, action) => {
        const idx = state.surfaces.findIndex((s) => s.id === action.payload.id);
        if (idx !== -1) {
          state.surfaces[idx] = action.payload;
        }
      });
  },
});

export const {
  setSurfaces,
  addSurface,
  updateSurface,
  removeSurface,
  selectSurface,
  setColorPalette,
  togglePreviewMode,
  clearRecommendations,
  clearError,
} = adaptiveSurfacesSlice.actions;

export const selectSurfaces = (state: { adaptiveSurfaces: AdaptiveSurfacesState }) =>
  state.adaptiveSurfaces.surfaces;
export const selectMaterials = (state: { adaptiveSurfaces: AdaptiveSurfacesState }) =>
  state.adaptiveSurfaces.materials;
export const selectSelectedSurface = createSelector(
  [
    (state: { adaptiveSurfaces: AdaptiveSurfacesState }) => state.adaptiveSurfaces.surfaces,
    (state: { adaptiveSurfaces: AdaptiveSurfacesState }) =>
      state.adaptiveSurfaces.selectedSurfaceId,
  ],
  (surfaces, selectedSurfaceId) => surfaces.find((s) => s.id === selectedSurfaceId)
);
export const selectRecommendations = (state: { adaptiveSurfaces: AdaptiveSurfacesState }) =>
  state.adaptiveSurfaces.recommendations;
export const selectIsAnalyzing = (state: { adaptiveSurfaces: AdaptiveSurfacesState }) =>
  state.adaptiveSurfaces.isAnalyzing;
export default adaptiveSurfacesSlice.reducer;
