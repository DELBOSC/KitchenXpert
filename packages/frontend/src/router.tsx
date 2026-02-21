import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import MainLayout from './layouts/MainLayout/MainLayout';
import DesignerErrorBoundary from './components/common/DesignerErrorBoundary';
import ErrorBoundary from './components/common/ErrorBoundary/ErrorBoundary';
import ErrorFallback from './components/common/ErrorFallback/ErrorFallback';

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/Auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/Auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/Auth/ForgotPasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const KitchenDesignerPage = lazy(() => import('./pages/KitchenDesignerPage'));
const CatalogPage = lazy(() => import('./pages/CatalogPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Projects
const ProjectsList = lazy(() => import('./pages/Projects/ProjectsList/ProjectsList'));
const ProjectDetail = lazy(() => import('./pages/Projects/ProjectDetail/ProjectDetail'));
const CreateProject = lazy(() => import('./pages/Projects/CreateProject/CreateProject'));
const ProjectEdit = lazy(() => import('./pages/Projects/ProjectEdit/ProjectEdit'));
const KitchenCreate = lazy(() => import('./pages/Projects/KitchenCreate/KitchenCreate'));

// Questionnaire
const UserProfile = lazy(() => import('./pages/Questionnaire/UserProfile/UserProfile'));
const SpatialConstraints = lazy(() => import('./pages/Questionnaire/SpatialConstraints/SpatialConstraints'));
const StylePreferences = lazy(() => import('./pages/Questionnaire/StylePreferences/StylePreferences'));
const BudgetPlanning = lazy(() => import('./pages/Questionnaire/BudgetPlanning/BudgetPlanning'));
const AutoDesignResults = lazy(() => import('./pages/Questionnaire/AutoDesignResults/AutoDesignResults'));

// AI Generator
const PreferenceForm = lazy(() => import('./pages/AIGenerator/PreferenceForm/PreferenceForm'));
const GeneratedDesigns = lazy(() => import('./pages/AIGenerator/GeneratedDesigns/GeneratedDesigns'));
const DesignComparison = lazy(() => import('./pages/AIGenerator/DesignComparison/DesignComparison'));

// VR
const VRViewer = lazy(() => import('./pages/VirtualReality/VRViewer/VRViewer'));

// Pricing (public)
const PricingPage = lazy(() => import('./pages/PricingPage/PricingPage'));

// Admin
const UserManagement = lazy(() => import('./pages/Admin/UserManagement/UserManagement'));
const UserDetail = lazy(() => import('./pages/Admin/UserDetail/UserDetail'));
const RoleManagement = lazy(() => import('./pages/Admin/RoleManagement/RoleManagement'));
const AuditLogs = lazy(() => import('./pages/Admin/AuditLogs/AuditLogs'));
const EnrichmentDashboard = lazy(() => import('./pages/Admin/EnrichmentDashboard'));
const DigitalTwinAdmin = lazy(() => import('./pages/Admin/DigitalTwinAdmin'));
const StockAdmin = lazy(() => import('./pages/Admin/StockAdmin'));
const CarbonAdmin = lazy(() => import('./pages/Admin/CarbonAdmin'));

// New Feature Pages
const InstallerMarketplace = lazy(() => import('./pages/Marketplace/InstallerMarketplace'));
const InstallerProfile = lazy(() => import('./pages/Marketplace/InstallerProfile'));
const InstallationTracker = lazy(() => import('./pages/Marketplace/InstallationTracker'));
const RenovationPage = lazy(() => import('./pages/Renovation/RenovationPage'));
const FinancingCalculator = lazy(() => import('./pages/Financing/FinancingCalculator'));
const PriceTrackerPage = lazy(() => import('./pages/PriceTracker/PriceTrackerPage'));
const SmartHomePlanner = lazy(() => import('./pages/SmartHome/SmartHomePlanner'));
const WorkflowSimulator = lazy(() => import('./pages/Workflow/WorkflowSimulator'));
const ComplianceDashboard = lazy(() => import('./pages/Compliance/ComplianceDashboard'));
const CertifiedQuotePage = lazy(() => import('./pages/Quotes/CertifiedQuotePage'));

// AR Viewer
const ARViewerPage = lazy(() => import('./pages/AR/ARViewerPage'));

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }): React.ReactElement {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Admin Route wrapper (requires admin role)
function AdminRoute({ children }: { children: React.ReactNode }): React.ReactElement {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Public Route wrapper (redirects to dashboard if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }): React.ReactElement {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export function AppRouter(): React.ReactElement {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        {/* Designer route — full-screen, outside MainLayout */}
        <Route
          path="/designer/:id"
          element={
            <ProtectedRoute>
              <DesignerErrorBoundary>
                <KitchenDesignerPage />
              </DesignerErrorBoundary>
            </ProtectedRoute>
          }
        />

        {/* All other routes wrapped in MainLayout (Header + Sidebar) */}
        <Route element={<MainLayout />}>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/pricing" element={<Suspense fallback={<LoadingSpinner />}><ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}><PricingPage /></ErrorBoundary></Suspense>} />

          {/* Auth routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPasswordPage />
              </PublicRoute>
            }
          />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <DashboardPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/designer"
            element={
              <ProtectedRoute>
                <DesignerErrorBoundary>
                  <KitchenDesignerPage />
                </DesignerErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <ProfilePage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          {/* Projects */}
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <ProjectsList />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/new"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <CreateProject />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <ProjectDetail />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id/edit"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <ProjectEdit />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id/kitchens/create"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <KitchenCreate />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          {/* Questionnaire */}
          <Route
            path="/questionnaire"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <UserProfile />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/questionnaire/spatial"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <SpatialConstraints />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/questionnaire/style"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <StylePreferences />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/questionnaire/budget"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <BudgetPlanning />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/questionnaire/results"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <AutoDesignResults />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          {/* AI Generator */}
          <Route
            path="/ai-generator"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <PreferenceForm />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-generator/results"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <GeneratedDesigns />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-generator/compare"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <DesignComparison />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          {/* VR */}
          <Route
            path="/vr/:kitchenId?"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <VRViewer />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          {/* F12: AR Viewer */}
          <Route
            path="/ar"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <ARViewerPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          {/* Admin routes */}
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <UserManagement />
                </ErrorBoundary>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users/:id"
            element={
              <AdminRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <UserDetail />
                </ErrorBoundary>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/roles"
            element={
              <AdminRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <RoleManagement />
                </ErrorBoundary>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <AdminRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <AuditLogs />
                </ErrorBoundary>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/enrichment"
            element={
              <AdminRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <EnrichmentDashboard />
                </ErrorBoundary>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/digital-twin"
            element={
              <AdminRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <DigitalTwinAdmin />
                </ErrorBoundary>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/stock"
            element={
              <AdminRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <StockAdmin />
                </ErrorBoundary>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/carbon"
            element={
              <AdminRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <CarbonAdmin />
                </ErrorBoundary>
              </AdminRoute>
            }
          />

          {/* F1: Compliance Dashboard */}
          <Route
            path="/compliance/:kitchenId?"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <ComplianceDashboard />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          {/* F5: Workflow Simulator */}
          <Route
            path="/workflow/:kitchenId?"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <WorkflowSimulator />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          {/* F6: Installer Marketplace */}
          <Route
            path="/marketplace"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <InstallerMarketplace />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/marketplace/installer/:id"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <InstallerProfile />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/marketplace/project/:id"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <InstallationTracker />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          {/* F7: Renovation Before/After */}
          <Route
            path="/renovation"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <RenovationPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          {/* F8: Financing Calculator */}
          <Route
            path="/financing"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <FinancingCalculator />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          {/* F9: Price Tracker */}
          <Route
            path="/price-tracker"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <PriceTrackerPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          {/* F11: Smart Home Planner */}
          <Route
            path="/smart-home/:kitchenId?"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <SmartHomePlanner />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          {/* F13: Certified Quotes */}
          <Route
            path="/certified-quotes"
            element={
              <ProtectedRoute>
                <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />}>
                  <CertifiedQuotePage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default AppRouter;
