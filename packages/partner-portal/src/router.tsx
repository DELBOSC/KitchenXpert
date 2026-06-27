import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import { Layout } from '@/components/Layout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Products } from '@/pages/Products';
import { Orders } from '@/pages/Orders';
import { Analytics } from '@/pages/Analytics';
import { Settings } from '@/pages/Settings';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'products',
        element: <Products />,
      },
      {
        path: 'orders',
        element: <Orders />,
      },
      {
        path: 'analytics',
        element: <Analytics />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;
