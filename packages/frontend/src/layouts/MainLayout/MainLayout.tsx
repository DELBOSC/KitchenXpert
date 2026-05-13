import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';

import Header from '../../components/common/Header/Header';
import OfflineIndicator from '../../components/common/OfflineIndicator';
import Sidebar from '../../components/common/Sidebar/Sidebar';
import { useAuth } from '../../contexts/AuthContext';

export default function MainLayout(): React.ReactElement {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <OfflineIndicator />
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex">
        {isAuthenticated && (
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        )}

        <main className={`flex-1 ${isAuthenticated ? 'lg:ml-0' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
