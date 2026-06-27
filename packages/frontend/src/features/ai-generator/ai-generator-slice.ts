import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';

export interface GenerationRequest {
  id: string;
  type: 'layout' | 'design' | 'optimization' | 'suggestion';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  input: GenerationInput;
  output?: GenerationOutput;
  createdAt: string;
  completedAt?: string;
}

export interface GenerationInput {
  kitchenId?: string;
  dimensions?: { width: number; length: number; height: number };
  style?: string;
  budget?: number;
  preferences?: {
    colorScheme?: string;
    materials?: string[];
    features?: string[];
    accessibility?: boolean;
  };
  constraints?: {
    existingLayout?: unknown;
    mustInclude?: string[];
    mustExclude?: string[];
  };
}

export interface GenerationOutput {
  layout?: unknown;
  products?: { id: string; name: string; quantity: number; position: unknown }[];
  materials?: { surfaceType: string; materialId: string; color: string }[];
  estimatedCost?: number;
  designNotes?: string[];
  alternatives?: GenerationOutput[];
}

/**
 * Cost breakdown per category with min/max ranges (from AI generator)
 */
export interface CostBreakdown {
  cabinets: { min: number; max: number };
  countertops: { min: number; max: number };
  appliances: { min: number; max: number };
  installation: { min: number; max: number };
  total: { min: number; max: number };
}

/**
 * A generated design concept from the AI Generator.
 * This interface matches the backend GeneratedDesign shape.
 */
export interface GeneratedDesign {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  fullImageUrl: string;
  style: string;
  estimatedCost: { min: number; max: number; currency: string };
  features: string[];
  materials: { cabinets: string; countertops: string; backsplash: string; flooring: string };
  layout: string;
  score: number;
  createdAt: string;
  isAIGenerated: boolean;
  materialRationale?: string;
  layoutExplanation?: string;
  tradeoffs?: string;
  costBreakdown?: CostBreakdown;
}

/**
 * Result of a design generation session from the AI Generator.
 */
export interface AIGenerationResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  projectId?: string;
  designs: GeneratedDesign[];
  preferences: {
    kitchenStyle: string;
    colorPalette: string[];
    layoutPreference: string;
  };
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
  isAIGenerated: boolean;
}

export interface AIGeneratorState {
  currentRequest: GenerationRequest | null;
  history: GenerationRequest[];
  isGenerating: boolean;
  progress: number;
  error: string | null;
  presets: { id: string; name: string; description: string; input: Partial<GenerationInput> }[];
}

const initialState: AIGeneratorState = {
  currentRequest: null,
  history: [],
  isGenerating: false,
  progress: 0,
  error: null,
  presets: [
    {
      id: 'modern',
      name: 'Modern Minimalist',
      description: 'Clean lines and neutral colors',
      input: { style: 'modern', preferences: { colorScheme: 'neutral' } },
    },
    {
      id: 'traditional',
      name: 'Traditional Classic',
      description: 'Warm wood tones and classic design',
      input: { style: 'traditional', preferences: { colorScheme: 'warm' } },
    },
    {
      id: 'industrial',
      name: 'Industrial Loft',
      description: 'Raw materials and open concept',
      input: { style: 'industrial', preferences: { materials: ['metal', 'concrete'] } },
    },
    {
      id: 'scandinavian',
      name: 'Scandinavian',
      description: 'Light, airy, and functional',
      input: { style: 'scandinavian', preferences: { colorScheme: 'light' } },
    },
  ],
};

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
export const generateLayout = createAsyncThunk<GenerationRequest, GenerationInput>(
  'aiGenerator/generateLayout',
  async (input, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/kitchen-generator/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'layout', ...input }),
      });
      const data = (await response.json()) as { data: GenerationRequest; error?: string };
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

export const generateDesign = createAsyncThunk<GenerationRequest, GenerationInput>(
  'aiGenerator/generateDesign',
  async (input, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/kitchen-generator/design`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = (await response.json()) as { data: GenerationRequest; error?: string };
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

export const optimizeLayout = createAsyncThunk<
  GenerationRequest,
  { kitchenId: string; goals?: string[] }
>('aiGenerator/optimize', async ({ kitchenId, goals }, { rejectWithValue }) => {
  try {
    const response = await fetch(`${API_URL}/kitchen-generator/optimize`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kitchenId, goals }),
    });
    const data = (await response.json()) as { data: GenerationRequest; error?: string };
    if (!response.ok) {
      throw new Error(data.error);
    }
    return data.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return rejectWithValue(message);
  }
});

export const getSuggestions = createAsyncThunk<
  GenerationOutput,
  { kitchenId: string; category?: string }
>('aiGenerator/suggestions', async ({ kitchenId, category }, { rejectWithValue }) => {
  try {
    const params = new URLSearchParams({ kitchenId, ...(category && { category }) });
    const response = await fetch(`${API_URL}/kitchen-generator/suggestions?${params.toString()}`, {
      credentials: 'include',
    });
    const data = (await response.json()) as { data: GenerationOutput; error?: string };
    if (!response.ok) {
      throw new Error(data.error);
    }
    return data.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return rejectWithValue(message);
  }
});

export const fetchGenerationHistory = createAsyncThunk<GenerationRequest[], { limit?: number }>(
  'aiGenerator/fetchHistory',
  async ({ limit = 10 } = {}, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/kitchen-generator/history?limit=${limit}`, {
        credentials: 'include',
      });
      const data = (await response.json()) as { data: GenerationRequest[]; error?: string };
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

export const applyGeneration = createAsyncThunk<void, { kitchenId: string; generationId: string }>(
  'aiGenerator/apply',
  async ({ kitchenId, generationId }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/kitchen-generator/apply`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kitchenId, generationId }),
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

const aiGeneratorSlice = createSlice({
  name: 'aiGenerator',
  initialState,
  reducers: {
    setProgress: (state, action: PayloadAction<number>) => {
      state.progress = action.payload;
    },
    clearCurrentRequest: (state) => {
      state.currentRequest = null;
      state.progress = 0;
    },
    clearError: (state) => {
      state.error = null;
    },
    selectHistoryItem: (state, action: PayloadAction<string>) => {
      const item = state.history.find((h) => h.id === action.payload);
      if (item) {
        state.currentRequest = item;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateLayout.pending, (state) => {
        state.isGenerating = true;
        state.progress = 0;
        state.error = null;
      })
      .addCase(generateLayout.fulfilled, (state, action) => {
        state.isGenerating = false;
        state.progress = 100;
        state.currentRequest = action.payload;
        state.history.unshift(action.payload);
      })
      .addCase(generateLayout.rejected, (state, action) => {
        state.isGenerating = false;
        state.error =
          (action.payload as string) ?? action.error?.message ?? 'An unknown error occurred';
      })
      .addCase(generateDesign.pending, (state) => {
        state.isGenerating = true;
        state.progress = 0;
      })
      .addCase(generateDesign.fulfilled, (state, action) => {
        state.isGenerating = false;
        state.progress = 100;
        state.currentRequest = action.payload;
        state.history.unshift(action.payload);
      })
      .addCase(generateDesign.rejected, (state, action) => {
        state.isGenerating = false;
        state.error =
          (action.payload as string) ?? action.error?.message ?? 'An unknown error occurred';
      })
      .addCase(optimizeLayout.pending, (state) => {
        state.isGenerating = true;
      })
      .addCase(optimizeLayout.fulfilled, (state, action) => {
        state.isGenerating = false;
        state.currentRequest = action.payload;
        state.history.unshift(action.payload);
      })
      .addCase(optimizeLayout.rejected, (state, action) => {
        state.isGenerating = false;
        state.error =
          (action.payload as string) ?? action.error?.message ?? 'An unknown error occurred';
      })
      .addCase(fetchGenerationHistory.fulfilled, (state, action) => {
        state.history = action.payload;
      });
  },
});

export const { setProgress, clearCurrentRequest, clearError, selectHistoryItem } =
  aiGeneratorSlice.actions;

export const selectCurrentGeneration = (state: { aiGenerator: AIGeneratorState }) =>
  state.aiGenerator.currentRequest;
export const selectGenerationHistory = (state: { aiGenerator: AIGeneratorState }) =>
  state.aiGenerator.history;
export const selectIsGenerating = (state: { aiGenerator: AIGeneratorState }) =>
  state.aiGenerator.isGenerating;
export const selectGenerationProgress = (state: { aiGenerator: AIGeneratorState }) =>
  state.aiGenerator.progress;
export const selectPresets = (state: { aiGenerator: AIGeneratorState }) =>
  state.aiGenerator.presets;
export const selectAIError = (state: { aiGenerator: AIGeneratorState }) => state.aiGenerator.error;
export default aiGeneratorSlice.reducer;
