/**
 * Redux Store Configuration
 */

import { configureStore } from '@reduxjs/toolkit';

import adaptiveSurfacesReducer from '../features/adaptive-surfaces/adaptive-surfaces-slice';
import aiGeneratorReducer from '../features/ai-generator/ai-generator-slice';
import auditReducer from '../features/audit/audit-slice';
import catalogReducer from '../features/catalog/catalog-slice';
import kitchenReducer from '../features/kitchen/kitchen-slice';
import permissionsReducer from '../features/permissions/permissions-slice';
import projectReducer from '../features/project/project-slice';
import questionnaireReducer from '../features/questionnaire/questionnaire-slice';
import rolesReducer from '../features/roles/roles-slice';
import userReducer from '../features/user/user-slice';
import vrReducer from '../features/virtual-reality/vr-slice';
import webhooksReducer from '../features/webhooks/webhooks-slice';

export const store = configureStore({
  // Keys match each slice's `name` (and the `state.<key>` its selectors read).
  // project + catalog are actively consumed (DashboardPage, CatalogPage, …);
  // the rest are fully-implemented, unit-tested domain slices wired here so a
  // future `useAppSelector(s => s.kitchen…)` doesn't hit an undefined state.
  reducer: {
    adaptiveSurfaces: adaptiveSurfacesReducer,
    aiGenerator: aiGeneratorReducer,
    audit: auditReducer,
    catalog: catalogReducer,
    kitchen: kitchenReducer,
    permissions: permissionsReducer,
    project: projectReducer,
    questionnaire: questionnaireReducer,
    roles: rolesReducer,
    user: userReducer,
    vr: vrReducer,
    webhooks: webhooksReducer,
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
