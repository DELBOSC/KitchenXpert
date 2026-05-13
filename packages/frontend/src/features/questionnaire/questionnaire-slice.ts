/**
 * Questionnaire Redux Slice
 *
 * Manages questionnaire state including responses, navigation, and validation.
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';

/**
 * Types
 */
export interface QuestionResponse {
  questionId: string;
  value: unknown;
  timestamp: number;
}

export interface SectionResponses {
  [questionId: string]: unknown;
}

export interface ValidationError {
  questionId: string;
  message: {
    en: string;
    fr: string;
  };
}

export interface SectionValidation {
  isValid: boolean;
  errors: ValidationError[];
}

export interface QuestionnaireState {
  // Navigation
  currentSectionIndex: number;
  visitedSections: string[];

  // Responses
  responses: {
    [sectionId: string]: SectionResponses;
  };

  // UI State
  language: 'en' | 'fr';
  isSubmitting: boolean;
  isSaving: boolean;
  isLoadingResponses: boolean;

  // Errors
  error: string | null;

  // Validation
  validation: {
    [sectionId: string]: SectionValidation;
  };

  // Progress
  progress: {
    totalQuestions: number;
    answeredQuestions: number;
    percentage: number;
  };

  // Analysis Results
  analysisResults: unknown | null;
  analysisStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  analysisError: string | null;

  // Persistence
  lastSaved: number | null;
  sessionId: string | null;
}

/**
 * Initial State
 */
const initialState: QuestionnaireState = {
  currentSectionIndex: 0,
  visitedSections: [],
  responses: {},
  language: 'en',
  isSubmitting: false,
  isSaving: false,
  isLoadingResponses: false,
  error: null,
  validation: {},
  progress: {
    totalQuestions: 0,
    answeredQuestions: 0,
    percentage: 0
  },
  analysisResults: null,
  analysisStatus: 'idle',
  analysisError: null,
  lastSaved: null,
  sessionId: null
};

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

/**
 * Async Thunks
 */
export const saveResponses = createAsyncThunk(
  'questionnaire/saveResponses',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { questionnaire: QuestionnaireState };
      const { responses, sessionId } = state.questionnaire;

      const response = await fetch(`${API_URL}/questionnaire/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ responses, sessionId })
      });

      if (!response.ok) {
        throw new Error('Failed to save responses');
      }

      return response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

export const loadResponses = createAsyncThunk(
  'questionnaire/loadResponses',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/questionnaire/load/${sessionId}`, { credentials: 'include' });

      if (!response.ok) {
        throw new Error('Failed to load responses');
      }

      return response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

export const submitQuestionnaire = createAsyncThunk(
  'questionnaire/submit',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { questionnaire: QuestionnaireState };
      const { responses } = state.questionnaire;

      const response = await fetch(`${API_URL}/questionnaire/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ responses })
      });

      if (!response.ok) {
        throw new Error('Failed to submit questionnaire');
      }

      return response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

export const analyzeResponses = createAsyncThunk(
  'questionnaire/analyze',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { questionnaire: QuestionnaireState };
      const { responses } = state.questionnaire;

      const response = await fetch(`${API_URL}/questionnaire/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ responses })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze responses');
      }

      return response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

/**
 * Slice
 */
const questionnaireSlice = createSlice({
  name: 'questionnaire',
  initialState,
  reducers: {
    // Navigation
    setCurrentSection(state, action: PayloadAction<number>) {
      state.currentSectionIndex = action.payload;
    },

    goToNextSection(state) {
      state.currentSectionIndex += 1;
    },

    goToPreviousSection(state) {
      if (state.currentSectionIndex > 0) {
        state.currentSectionIndex -= 1;
      }
    },

    markSectionVisited(state, action: PayloadAction<string>) {
      if (!state.visitedSections.includes(action.payload)) {
        state.visitedSections.push(action.payload);
      }
    },

    // Responses
    setResponse(
      state,
      action: PayloadAction<{
        sectionId: string;
        questionId: string;
        value: unknown;
      }>
    ) {
      const { sectionId, questionId, value } = action.payload;

      if (!state.responses[sectionId]) {
        state.responses[sectionId] = {};
      }

      state.responses[sectionId][questionId] = value;
    },

    setMultipleResponses(
      state,
      action: PayloadAction<{
        sectionId: string;
        responses: SectionResponses;
      }>
    ) {
      const { sectionId, responses } = action.payload;
      state.responses[sectionId] = {
        ...state.responses[sectionId],
        ...responses
      };
    },

    clearSectionResponses(state, action: PayloadAction<string>) {
      delete state.responses[action.payload];
    },

    clearAllResponses(state) {
      state.responses = {};
      state.validation = {};
      state.progress = {
        totalQuestions: 0,
        answeredQuestions: 0,
        percentage: 0
      };
    },

    // Language
    setLanguage(state, action: PayloadAction<'en' | 'fr'>) {
      state.language = action.payload;
    },

    // Validation
    setSectionValidation(
      state,
      action: PayloadAction<{
        sectionId: string;
        validation: SectionValidation;
      }>
    ) {
      const { sectionId, validation } = action.payload;
      state.validation[sectionId] = validation;
    },

    clearValidationErrors(state, action: PayloadAction<string>) {
      if (state.validation[action.payload]) {
        state.validation[action.payload] = {
          isValid: true,
          errors: []
        };
      }
    },

    // Progress
    updateProgress(
      state,
      action: PayloadAction<{
        totalQuestions: number;
        answeredQuestions: number;
      }>
    ) {
      const { totalQuestions, answeredQuestions } = action.payload;
      state.progress = {
        totalQuestions,
        answeredQuestions,
        percentage: totalQuestions > 0
          ? Math.round((answeredQuestions / totalQuestions) * 100)
          : 0
      };
    },

    // Session
    setSessionId(state, action: PayloadAction<string>) {
      state.sessionId = action.payload;
    },

    // Error
    clearError(state) {
      state.error = null;
    },

    // Reset
    resetQuestionnaire() {
      return initialState;
    }
  },

  extraReducers: (builder) => {
    // Save responses
    builder
      .addCase(saveResponses.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(saveResponses.fulfilled, (state, action) => {
        state.isSaving = false;
        state.lastSaved = Date.now();
        if (action.payload.sessionId) {
          state.sessionId = action.payload.sessionId;
        }
      })
      .addCase(saveResponses.rejected, (state, action) => {
        state.isSaving = false;
        state.error = (action.payload as string) ?? action.error?.message ?? 'An unknown error occurred';
      });

    // Load responses
    builder
      .addCase(loadResponses.pending, (state) => {
        state.isLoadingResponses = true;
        state.error = null;
      })
      .addCase(loadResponses.fulfilled, (state, action) => {
        state.isLoadingResponses = false;
        state.responses = action.payload.responses || {};
        state.currentSectionIndex = action.payload.currentSectionIndex || 0;
        state.visitedSections = action.payload.visitedSections || [];
      })
      .addCase(loadResponses.rejected, (state, action) => {
        state.isLoadingResponses = false;
        state.error = (action.payload as string) ?? action.error?.message ?? 'An unknown error occurred';
      });

    // Submit questionnaire
    builder
      .addCase(submitQuestionnaire.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(submitQuestionnaire.fulfilled, (state) => {
        state.isSubmitting = false;
      })
      .addCase(submitQuestionnaire.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = (action.payload as string) ?? action.error?.message ?? 'An unknown error occurred';
      });

    // Analyze responses
    builder
      .addCase(analyzeResponses.pending, (state) => {
        state.analysisStatus = 'loading';
        state.analysisError = null;
      })
      .addCase(analyzeResponses.fulfilled, (state, action) => {
        state.analysisStatus = 'succeeded';
        state.analysisResults = action.payload;
      })
      .addCase(analyzeResponses.rejected, (state, action) => {
        state.analysisStatus = 'failed';
        state.analysisError = (action.payload as string) ?? action.error?.message ?? 'Analysis failed';
      });
  }
});

/**
 * Export actions and reducer
 */
export const {
  setCurrentSection,
  goToNextSection,
  goToPreviousSection,
  markSectionVisited,
  setResponse,
  setMultipleResponses,
  clearSectionResponses,
  clearAllResponses,
  setLanguage,
  setSectionValidation,
  clearValidationErrors,
  updateProgress,
  setSessionId,
  clearError,
  resetQuestionnaire
} = questionnaireSlice.actions;

export default questionnaireSlice.reducer;
