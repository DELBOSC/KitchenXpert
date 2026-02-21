/**
 * Redux Store Configuration
 */

import { configureStore } from '@reduxjs/toolkit';
import projectReducer from '../features/project/project-slice';
import catalogReducer from '../features/catalog/catalog-slice';

export const store = configureStore({
  reducer: {
    project: projectReducer,
    catalog: catalogReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks - export from a separate hooks file for use in components
export default store;
