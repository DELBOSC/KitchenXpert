import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAppSelector, useAppDispatch } from '@/store';
import { fetchProfile } from '@/store/slices/authSlice';

export function Layout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { isAuthenticated, user, isLoading } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (!user && !isLoading) {
      dispatch(fetchProfile());
    }
  }, [isAuthenticated, user, isLoading, navigate, dispatch]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      <Header onMenuClick={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
      <main
        className={`min-h-screen pt-16 transition-all duration-300 ${
          isSidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;
