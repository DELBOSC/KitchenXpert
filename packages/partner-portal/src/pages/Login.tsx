import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ChefHat, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { login, clearError } from '@/store/slices/authSlice';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, error } = useAppSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
    return () => {
      dispatch(clearError());
    };
  }, [isAuthenticated, navigate, dispatch]);

  const onSubmit = async (data: LoginFormData) => {
    dispatch(login(data));
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-center lg:bg-gradient-to-br lg:from-primary-600 lg:to-primary-800 lg:p-12">
        <div className="mx-auto max-w-md text-white">
          <div className="mb-8 flex items-center space-x-3">
            <ChefHat className="h-12 w-12" />
            <span className="text-3xl font-bold">KitchenXpert</span>
          </div>
          <h1 className="mb-6 text-4xl font-bold">Partner Portal</h1>
          <p className="mb-8 text-lg text-primary-100">
            Manage your kitchen products, track orders, and grow your business with
            our comprehensive partner dashboard.
          </p>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500">
                <span className="text-sm font-bold">1</span>
              </div>
              <div>
                <h3 className="font-semibold">Product Management</h3>
                <p className="text-sm text-primary-200">
                  Upload and manage your entire product catalog
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500">
                <span className="text-sm font-bold">2</span>
              </div>
              <div>
                <h3 className="font-semibold">Order Tracking</h3>
                <p className="text-sm text-primary-200">
                  Real-time visibility into customer orders
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500">
                <span className="text-sm font-bold">3</span>
              </div>
              <div>
                <h3 className="font-semibold">Analytics & Insights</h3>
                <p className="text-sm text-primary-200">
                  Data-driven insights to optimize your sales
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-center space-x-2 lg:hidden">
            <ChefHat className="h-10 w-10 text-primary-600" />
            <span className="text-2xl font-bold text-gray-900">KitchenXpert</span>
          </div>

          <h2 className="mb-2 text-center text-2xl font-bold text-gray-900 lg:text-left">
            Welcome back
          </h2>
          <p className="mb-8 text-center text-gray-600 lg:text-left">
            Sign in to your partner account
          </p>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <input
                {...register('email')}
                type="email"
                id="email"
                autoComplete="email"
                className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="you@company.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="current-password"
                  className={`w-full rounded-lg border px-4 py-3 pr-12 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <a
                href="/forgot-password"
                className="text-sm font-medium text-primary-600 hover:text-primary-500"
              >
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-600">
            Not a partner yet?{' '}
            <a
              href="/register"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Apply now
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
