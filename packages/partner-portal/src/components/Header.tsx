import { Menu, Bell, Search, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAppSelector } from '@/store';

interface HeaderProps {
  onMenuClick: () => void;
  isSidebarCollapsed: boolean;
}

export function Header({ onMenuClick, isSidebarCollapsed }: HeaderProps) {
  const { user } = useAppSelector((state) => state.auth);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return 'bg-purple-100 text-purple-800';
      case 'premium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <header
      className={`fixed right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 transition-all duration-300 ${
        isSidebarCollapsed ? 'left-16' : 'left-64'
      }`}
    >
      <div className="flex items-center space-x-4">
        <button onClick={onMenuClick} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
          <Menu className="h-5 w-5" />
        </button>

        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products, orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 rounded-lg border border-gray-300 bg-gray-50 py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            3
          </span>
        </button>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center space-x-3 rounded-lg p-2 hover:bg-gray-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-medium text-white">
              {user?.companyName?.charAt(0).toUpperCase() || 'P'}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-sm font-medium text-gray-900">{user?.companyName || 'Partner'}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
              <div className="border-b border-gray-200 px-4 py-3">
                <p className="text-sm font-medium text-gray-900">{user?.companyName}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
                {user?.tier && (
                  <span
                    className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-medium capitalize ${getTierBadgeColor(
                      user.tier
                    )}`}
                  >
                    {user.tier}
                  </span>
                )}
              </div>
              <div className="py-2">
                <a
                  href="/settings"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Account Settings
                </a>
                <a
                  href="/settings?tab=billing"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Billing
                </a>
                <a
                  href="/settings?tab=api"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  API Keys
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
