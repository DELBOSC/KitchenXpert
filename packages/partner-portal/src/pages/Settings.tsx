import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Building2,
  Key,
  CreditCard,
  Bell,
  Shield,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Check,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { updateProfile } from '@/store/slices/authSlice';
import api from '@/services/api';

const profileSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  contactName: z.string().min(2, 'Contact name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Valid phone number is required'),
  address: z.string().min(5, 'Address is required'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

type Tab = 'profile' | 'security' | 'api' | 'billing' | 'notifications';

export function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  // Mock API key for demo
  const [apiKey] = useState('pk_live_abc123xyz789def456ghi012jkl345mno678pqr901');

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
    reset: resetProfile,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  useEffect(() => {
    if (user) {
      resetProfile({
        companyName: user.companyName,
        contactName: user.contactName,
        email: user.email,
        phone: user.phone,
        address: user.address,
      });
    }
  }, [user, resetProfile]);

  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setErrorMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      setIsLoading(true);
      await dispatch(updateProfile(data)).unwrap();
      setSuccessMessage('Profile updated successfully');
    } catch {
      setErrorMessage('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      setIsLoading(true);
      await api.changePassword(data.currentPassword, data.newPassword);
      setSuccessMessage('Password changed successfully');
      resetPassword();
    } catch {
      setErrorMessage('Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-gray-500">Manage your account settings and preferences</p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-600">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar */}
        <div className="lg:w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <tab.icon className={`mr-3 h-5 w-5 ${activeTab === tab.id ? 'text-primary-600' : 'text-gray-400'}`} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-lg font-semibold text-gray-900">Company Profile</h2>
              <form onSubmit={handleSubmitProfile(onProfileSubmit)} className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Company Name
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        {...registerProfile('companyName')}
                        type="text"
                        className={`w-full rounded-lg border py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          profileErrors.companyName ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                    </div>
                    {profileErrors.companyName && (
                      <p className="mt-1 text-xs text-red-600">{profileErrors.companyName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Contact Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        {...registerProfile('contactName')}
                        type="text"
                        className={`w-full rounded-lg border py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          profileErrors.contactName ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                    </div>
                    {profileErrors.contactName && (
                      <p className="mt-1 text-xs text-red-600">{profileErrors.contactName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Email Address
                    </label>
                    <input
                      {...registerProfile('email')}
                      type="email"
                      className={`w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        profileErrors.email ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {profileErrors.email && (
                      <p className="mt-1 text-xs text-red-600">{profileErrors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <input
                      {...registerProfile('phone')}
                      type="tel"
                      className={`w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        profileErrors.phone ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {profileErrors.phone && (
                      <p className="mt-1 text-xs text-red-600">{profileErrors.phone.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Business Address
                  </label>
                  <textarea
                    {...registerProfile('address')}
                    rows={3}
                    className={`w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      profileErrors.address ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {profileErrors.address && (
                    <p className="mt-1 text-xs text-red-600">{profileErrors.address.message}</p>
                  )}
                </div>

                {user?.tier && (
                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Partner Tier</p>
                        <p className="text-sm text-gray-500 capitalize">{user.tier} Plan</p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${
                          user.tier === 'enterprise'
                            ? 'bg-purple-100 text-purple-800'
                            : user.tier === 'premium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {user.tier}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="mb-6 text-lg font-semibold text-gray-900">Change Password</h2>
                <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="max-w-md space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Current Password
                    </label>
                    <input
                      {...registerPassword('currentPassword')}
                      type="password"
                      className={`w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        passwordErrors.currentPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {passwordErrors.currentPassword && (
                      <p className="mt-1 text-xs text-red-600">{passwordErrors.currentPassword.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      New Password
                    </label>
                    <input
                      {...registerPassword('newPassword')}
                      type="password"
                      className={`w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        passwordErrors.newPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {passwordErrors.newPassword && (
                      <p className="mt-1 text-xs text-red-600">{passwordErrors.newPassword.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Confirm New Password
                    </label>
                    <input
                      {...registerPassword('confirmPassword')}
                      type="password"
                      className={`w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        passwordErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {passwordErrors.confirmPassword && (
                      <p className="mt-1 text-xs text-red-600">{passwordErrors.confirmPassword.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Password
                  </button>
                </form>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Two-Factor Authentication</h2>
                <p className="mb-4 text-sm text-gray-500">
                  Add an extra layer of security to your account by enabling two-factor authentication.
                </p>
                <button className="rounded-lg border border-primary-600 px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50">
                  Enable 2FA
                </button>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-6">
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">API Keys</h2>
                <p className="mb-6 text-sm text-gray-500">
                  Use your API key to integrate KitchenXpert with your systems. Keep your key secure and never share it publicly.
                </p>

                <div className="mb-6 rounded-lg border border-gray-200 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Live API Key</span>
                    <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-lg bg-gray-100 px-4 py-2 font-mono text-sm">
                      {showApiKey ? apiKey : '••••••••••••••••••••••••••••••••••••••••'}
                    </div>
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      {showApiKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={copyApiKey}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      {copiedKey ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate Key
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">API Usage</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Requests Today</p>
                    <p className="text-2xl font-bold text-gray-900">1,234</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Requests This Month</p>
                    <p className="text-2xl font-bold text-gray-900">45,678</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Rate Limit</p>
                    <p className="text-2xl font-bold text-gray-900">1000/min</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Current Plan</h2>
                <div className="flex items-center justify-between rounded-lg border border-primary-200 bg-primary-50 p-4">
                  <div>
                    <p className="font-semibold text-gray-900 capitalize">{user?.tier || 'Basic'} Plan</p>
                    <p className="text-sm text-gray-500">Billed monthly</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">EUR 299</p>
                    <p className="text-sm text-gray-500">per month</p>
                  </div>
                </div>
                <button className="mt-4 rounded-lg border border-primary-600 px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50">
                  Upgrade Plan
                </button>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Payment Method</h2>
                <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-16 items-center justify-center rounded bg-gray-100">
                      <CreditCard className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Visa ending in 4242</p>
                      <p className="text-sm text-gray-500">Expires 12/2025</p>
                    </div>
                  </div>
                  <button className="text-sm font-medium text-primary-600 hover:text-primary-700">
                    Update
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Billing History</h2>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Amount</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Invoice</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {[
                        { date: 'Jan 1, 2024', description: 'Premium Plan - Monthly', amount: 299 },
                        { date: 'Dec 1, 2023', description: 'Premium Plan - Monthly', amount: 299 },
                        { date: 'Nov 1, 2023', description: 'Premium Plan - Monthly', amount: 299 },
                      ].map((invoice, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3 text-sm text-gray-900">{invoice.date}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{invoice.description}</td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                            EUR {invoice.amount}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button className="text-sm font-medium text-primary-600 hover:text-primary-700">
                              Download
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-lg font-semibold text-gray-900">Notification Preferences</h2>
              <div className="space-y-6">
                {[
                  { id: 'orders', label: 'New Orders', description: 'Get notified when you receive new orders' },
                  { id: 'products', label: 'Product Updates', description: 'Notifications about product approval status' },
                  { id: 'reports', label: 'Weekly Reports', description: 'Receive weekly sales and performance reports' },
                  { id: 'promotions', label: 'Promotions', description: 'Updates about promotions and special offers' },
                  { id: 'security', label: 'Security Alerts', description: 'Important security notifications' },
                ].map((pref) => (
                  <div key={pref.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{pref.label}</p>
                      <p className="text-sm text-gray-500">{pref.description}</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" defaultChecked className="peer sr-only" />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;
