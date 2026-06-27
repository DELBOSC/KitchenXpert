import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';

export interface VRScene {
  id: string;
  kitchenId: string;
  name: string;
  sceneData: Record<string, unknown>;
  cameraPosition: { x: number; y: number; z: number };
  cameraTarget: { x: number; y: number; z: number };
  lightingPreset: string;
  environmentMap?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VRSettings {
  quality: 'low' | 'medium' | 'high' | 'ultra';
  antialiasing: boolean;
  shadows: boolean;
  reflections: boolean;
  ambientOcclusion: boolean;
  bloomEffect: boolean;
  fov: number;
  nearPlane: number;
  farPlane: number;
}

export interface VRState {
  isVRMode: boolean;
  currentScene: VRScene | null;
  settings: VRSettings;
  isLoading: boolean;
  error: string | null;
  viewMode: '3d' | 'vr' | 'ar';
  selectedObjectId: string | null;
  isWalkthrough: boolean;
  walkthroughPath: { x: number; y: number; z: number }[];
}

const defaultSettings: VRSettings = {
  quality: 'high',
  antialiasing: true,
  shadows: true,
  reflections: true,
  ambientOcclusion: true,
  bloomEffect: false,
  fov: 75,
  nearPlane: 0.1,
  farPlane: 1000,
};

const initialState: VRState = {
  isVRMode: false,
  currentScene: null,
  settings: defaultSettings,
  isLoading: false,
  error: null,
  viewMode: '3d',
  selectedObjectId: null,
  isWalkthrough: false,
  walkthroughPath: [],
};

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
export const loadVRScene = createAsyncThunk<VRScene, string>(
  'vr/loadScene',
  async (kitchenId, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/kitchens/${kitchenId}/vr-scene`, {
        credentials: 'include',
      });
      const data = (await response.json()) as { data: VRScene; error?: string };
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

export const saveVRScene = createAsyncThunk<
  VRScene,
  { kitchenId: string; sceneData: Partial<VRScene> }
>('vr/saveScene', async ({ kitchenId, sceneData }, { rejectWithValue }) => {
  try {
    const response = await fetch(`${API_URL}/kitchens/${kitchenId}/vr-scene`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sceneData),
    });
    const data = (await response.json()) as { data: VRScene; error?: string };
    if (!response.ok) {
      throw new Error(data.error);
    }
    return data.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return rejectWithValue(message);
  }
});

export const generateVRPreview = createAsyncThunk<{ imageUrl: string }, string>(
  'vr/generatePreview',
  async (kitchenId, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/kitchens/${kitchenId}/vr-preview`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = (await response.json()) as { data: { imageUrl: string }; error?: string };
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

const vrSlice = createSlice({
  name: 'vr',
  initialState,
  reducers: {
    enterVRMode: (state) => {
      state.isVRMode = true;
      state.viewMode = 'vr';
    },
    exitVRMode: (state) => {
      state.isVRMode = false;
      state.viewMode = '3d';
    },
    setViewMode: (state, action: PayloadAction<'3d' | 'vr' | 'ar'>) => {
      state.viewMode = action.payload;
    },
    updateSettings: (state, action: PayloadAction<Partial<VRSettings>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    resetSettings: (state) => {
      state.settings = defaultSettings;
    },
    selectObject: (state, action: PayloadAction<string | null>) => {
      state.selectedObjectId = action.payload;
    },
    startWalkthrough: (state, action: PayloadAction<{ x: number; y: number; z: number }[]>) => {
      state.isWalkthrough = true;
      state.walkthroughPath = action.payload;
    },
    stopWalkthrough: (state) => {
      state.isWalkthrough = false;
      state.walkthroughPath = [];
    },
    updateCameraPosition: (state, action: PayloadAction<{ x: number; y: number; z: number }>) => {
      if (state.currentScene) {
        state.currentScene.cameraPosition = action.payload;
      }
    },
    updateCameraTarget: (state, action: PayloadAction<{ x: number; y: number; z: number }>) => {
      if (state.currentScene) {
        state.currentScene.cameraTarget = action.payload;
      }
    },
    setLightingPreset: (state, action: PayloadAction<string>) => {
      if (state.currentScene) {
        state.currentScene.lightingPreset = action.payload;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    clearScene: (state) => {
      state.currentScene = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadVRScene.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadVRScene.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentScene = action.payload;
      })
      .addCase(loadVRScene.rejected, (state, action) => {
        state.isLoading = false;
        state.error =
          (action.payload as string) ?? action.error?.message ?? 'An unknown error occurred';
      })
      .addCase(saveVRScene.fulfilled, (state, action) => {
        state.currentScene = action.payload;
      })
      .addCase(saveVRScene.rejected, (state, action) => {
        state.error =
          (action.payload as string) ?? action.error?.message ?? 'An unknown error occurred';
      });
  },
});

export const {
  enterVRMode,
  exitVRMode,
  setViewMode,
  updateSettings,
  resetSettings,
  selectObject,
  startWalkthrough,
  stopWalkthrough,
  updateCameraPosition,
  updateCameraTarget,
  setLightingPreset,
  clearError,
  clearScene,
} = vrSlice.actions;

export const selectIsVRMode = (state: { vr: VRState }) => state.vr.isVRMode;
export const selectCurrentScene = (state: { vr: VRState }) => state.vr.currentScene;
export const selectVRSettings = (state: { vr: VRState }) => state.vr.settings;
export const selectViewMode = (state: { vr: VRState }) => state.vr.viewMode;
export const selectSelectedObject = (state: { vr: VRState }) => state.vr.selectedObjectId;
export const selectIsWalkthrough = (state: { vr: VRState }) => state.vr.isWalkthrough;
export const selectVRLoading = (state: { vr: VRState }) => state.vr.isLoading;
export default vrSlice.reducer;
