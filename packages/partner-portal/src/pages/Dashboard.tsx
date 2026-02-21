import { useEffect, useState } from 'react';
import {
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import api, { DashboardStats, Order } from '@/services/api';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  iconBg: string;
}

function StatCard({ title, value, change, icon, iconBg }: StatCardProps) {
  const isPositive = change && change > 0;
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {change !== undefined && (
            <div className="mt-2 flex items-center">
              {isPositive ? (
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              )}
              <span
                className={`text-sm font-medium ${
                  isPositive ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {Math.abs(change)}%
              </span>
              <span className="ml-1 text-sm text-gray-500">vs last month</span>
            </div>
          )}
        </div>
        <div className={`rounded-lg p-3 ${iconBg}`}>{icon}</div>
      </div>
    </div>
  );
}

interface RecentOrderProps {
  order: Order;
}

function RecentOrderItem({ order }: RecentOrderProps) {
  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-purple-100 text-purple-800';
      case 'shipped':
        return 'bg-indigo-100 text-indigo-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-4 last:border-0">
      <div className="flex items-center space-x-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          <ShoppingCart className="h-5 w-5 text-gray-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900">{order.orderNumber}</p>
          <p className="text-sm text-gray-500">{order.customerName}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-medium text-gray-900">
          {order.currency} {order.total.toLocaleString()}
        </p>
        <span
          className={`inline-block rounded-full px-2 py-1 text-xs font-medium capitalize ${getStatusColor(
            order.status
          )}`}
        >
          {order.status}
        </span>
      </div>
    </div>
  );
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [salesData, setSalesData] = useState<{ date: string; revenue: number; orders: number }[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const [statsData, ordersData, analyticsData] = await Promise.all([
          api.getDashboardStats(),
          api.getOrders({ page: 1, pageSize: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
          api.getSalesAnalytics({ period: 'day' }),
        ]);
        setStats(statsData);
        setRecentOrders(ordersData.data);
        setSalesData(analyticsData.dailySales);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        // Use mock data for demo purposes
        setStats({
          totalProducts: 156,
          activeProducts: 142,
          totalOrders: 1234,
          pendingOrders: 28,
          totalRevenue: 125678,
          revenueThisMonth: 28945,
          ordersThisMonth: 89,
          conversionRate: 3.2,
        });
        setSalesData([
          { date: '2024-01-15', revenue: 4200, orders: 12 },
          { date: '2024-01-16', revenue: 3800, orders: 10 },
          { date: '2024-01-17', revenue: 5100, orders: 15 },
          { date: '2024-01-18', revenue: 4500, orders: 13 },
          { date: '2024-01-19', revenue: 6200, orders: 18 },
          { date: '2024-01-20', revenue: 5800, orders: 16 },
          { date: '2024-01-21', revenue: 7100, orders: 21 },
        ]);
        setRecentOrders([
          {
            id: '1',
            orderNumber: 'ORD-2024-001',
            partnerId: 'p1',
            customerId: 'c1',
            customerName: 'John Smith',
            customerEmail: 'john@example.com',
            items: [],
            subtotal: 1200,
            tax: 120,
            shipping: 50,
            total: 1370,
            currency: 'EUR',
            status: 'pending',
            shippingAddress: { street: '', city: '', state: '', postalCode: '', country: '' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: '2',
            orderNumber: 'ORD-2024-002',
            partnerId: 'p1',
            customerId: 'c2',
            customerName: 'Maria Garcia',
            customerEmail: 'maria@example.com',
            items: [],
            subtotal: 2500,
            tax: 250,
            shipping: 75,
            total: 2825,
            currency: 'EUR',
            status: 'processing',
            shippingAddress: { street: '', city: '', state: '', postalCode: '', country: '' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: '3',
            orderNumber: 'ORD-2024-003',
            partnerId: 'p1',
            customerId: 'c3',
            customerName: 'Hans Mueller',
            customerEmail: 'hans@example.com',
            items: [],
            subtotal: 890,
            tax: 89,
            shipping: 30,
            total: 1009,
            currency: 'EUR',
            status: 'shipped',
            shippingAddress: { street: '', city: '', state: '', postalCode: '', country: '' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-500">Welcome back! Here's what's happening with your business.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Products"
          value={stats?.totalProducts || 0}
          icon={<Package className="h-6 w-6 text-blue-600" />}
          iconBg="bg-blue-100"
        />
        <StatCard
          title="Total Orders"
          value={stats?.totalOrders || 0}
          change={12.5}
          icon={<ShoppingCart className="h-6 w-6 text-green-600" />}
          iconBg="bg-green-100"
        />
        <StatCard
          title="Revenue This Month"
          value={`EUR ${(stats?.revenueThisMonth || 0).toLocaleString()}`}
          change={8.3}
          icon={<DollarSign className="h-6 w-6 text-purple-600" />}
          iconBg="bg-purple-100"
        />
        <StatCard
          title="Conversion Rate"
          value={`${stats?.conversionRate || 0}%`}
          change={-2.1}
          icon={<TrendingUp className="h-6 w-6 text-orange-600" />}
          iconBg="bg-orange-100"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales Chart */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Sales Overview</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [`EUR ${value.toLocaleString()}`, 'Revenue']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ fill: '#2563eb' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders Chart */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Orders by Day</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [value, 'Orders']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Bar dataKey="orders" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Orders & Quick Stats */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Orders */}
        <div className="lg:col-span-2 rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
            <a
              href="/orders"
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              View all
            </a>
          </div>
          <div>
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <RecentOrderItem key={order.id} order={order} />
              ))
            ) : (
              <p className="py-8 text-center text-gray-500">No recent orders</p>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Quick Stats</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-green-100 p-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Products</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {stats?.activeProducts || 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-yellow-100 p-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pending Orders</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {stats?.pendingOrders || 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-blue-100 p-2">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Orders This Month</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {stats?.ordersThisMonth || 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-purple-100 p-2">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-lg font-semibold text-gray-900">
                    EUR {(stats?.totalRevenue || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
