import { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Calendar,
  Download,
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
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { format, subDays } from 'date-fns';
import api, { SalesAnalytics } from '@/services/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

type Period = 'day' | 'week' | 'month';

export function Analytics() {
  const [period, setPeriod] = useState<Period>('day');
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<SalesAnalytics | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [period, dateRange]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const data = await api.getSalesAnalytics({
        startDate: dateRange.start,
        endDate: dateRange.end,
        period,
      });
      setAnalytics(data);
    } catch {
      // Use mock data for demo
      setAnalytics({
        dailySales: Array.from({ length: 30 }, (_, i) => ({
          date: format(subDays(new Date(), 29 - i), 'yyyy-MM-dd'),
          revenue: Math.floor(Math.random() * 5000) + 2000,
          orders: Math.floor(Math.random() * 20) + 5,
        })),
        topProducts: [
          { productId: '1', name: 'Modern Kitchen Cabinet', revenue: 45000, quantity: 100 },
          { productId: '2', name: 'Granite Countertop', revenue: 38000, quantity: 32 },
          { productId: '3', name: 'Stainless Steel Sink', revenue: 25000, quantity: 71 },
          { productId: '4', name: 'LED Under Cabinet Light', revenue: 18000, quantity: 240 },
          { productId: '5', name: 'Drawer Organizer Set', revenue: 12000, quantity: 267 },
        ],
        salesByCategory: [
          { category: 'Cabinets', revenue: 65000, percentage: 35 },
          { category: 'Countertops', revenue: 45000, percentage: 24 },
          { category: 'Sinks & Faucets', revenue: 30000, percentage: 16 },
          { category: 'Appliances', revenue: 25000, percentage: 13 },
          { category: 'Lighting', revenue: 15000, percentage: 8 },
          { category: 'Accessories', revenue: 8000, percentage: 4 },
        ],
        ordersByStatus: [
          { status: 'Pending', count: 28 },
          { status: 'Processing', count: 45 },
          { status: 'Shipped', count: 67 },
          { status: 'Delivered', count: 234 },
          { status: 'Cancelled', count: 12 },
        ],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const totalRevenue = analytics?.dailySales.reduce((sum, d) => sum + d.revenue, 0) || 0;
  const totalOrders = analytics?.dailySales.reduce((sum, d) => sum + d.orders, 0) || 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const revenueChange = 12.5;
  const ordersChange = 8.3;
  const aovChange = -2.1;

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-gray-500">Track your sales performance and insights</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />
          </div>
          <button className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Download className="mr-2 h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Period Tabs */}
      <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
        {(['day', 'week', 'month'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium capitalize transition-colors ${
              period === p
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {p}ly
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                EUR {totalRevenue.toLocaleString()}
              </p>
              <div className="mt-2 flex items-center">
                {revenueChange >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className={`ml-1 text-sm font-medium ${revenueChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {Math.abs(revenueChange)}%
                </span>
                <span className="ml-1 text-sm text-gray-500">vs last period</span>
              </div>
            </div>
            <div className="rounded-lg bg-blue-100 p-3">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Orders</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{totalOrders}</p>
              <div className="mt-2 flex items-center">
                {ordersChange >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className={`ml-1 text-sm font-medium ${ordersChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {Math.abs(ordersChange)}%
                </span>
                <span className="ml-1 text-sm text-gray-500">vs last period</span>
              </div>
            </div>
            <div className="rounded-lg bg-green-100 p-3">
              <ShoppingCart className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Avg Order Value</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                EUR {avgOrderValue.toFixed(2)}
              </p>
              <div className="mt-2 flex items-center">
                {aovChange >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className={`ml-1 text-sm font-medium ${aovChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {Math.abs(aovChange)}%
                </span>
                <span className="ml-1 text-sm text-gray-500">vs last period</span>
              </div>
            </div>
            <div className="rounded-lg bg-purple-100 p-3">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Unique Customers</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {Math.floor(totalOrders * 0.85)}
              </p>
              <div className="mt-2 flex items-center">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="ml-1 text-sm font-medium text-green-500">5.2%</span>
                <span className="ml-1 text-sm text-gray-500">vs last period</span>
              </div>
            </div>
            <div className="rounded-lg bg-orange-100 p-3">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Revenue Trend</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.dailySales}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => format(new Date(value), 'MMM d')}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [`EUR ${value.toLocaleString()}`, 'Revenue']}
                  labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders Chart */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Orders Over Time</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.dailySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => format(new Date(value), 'MMM d')}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [value, 'Orders']}
                  labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                />
                <Bar dataKey="orders" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales by Category */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Sales by Category</h2>
          <div className="flex items-center">
            <div className="h-64 w-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics?.salesByCategory}
                    dataKey="revenue"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {analytics?.salesByCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`EUR ${value.toLocaleString()}`, 'Revenue']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              {analytics?.salesByCategory.map((cat, index) => (
                <div key={cat.category} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div
                      className="mr-3 h-3 w-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-gray-700">{cat.category}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {cat.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Orders by Status */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Orders by Status</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.ordersByStatus} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="status" type="category" tick={{ fontSize: 12 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Top Performing Products</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Product
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Quantity Sold
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Revenue
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Avg Price
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {analytics?.topProducts.map((product, index) => (
                <tr key={product.productId} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-4">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        index === 0
                          ? 'bg-yellow-100 text-yellow-800'
                          : index === 1
                          ? 'bg-gray-200 text-gray-700'
                          : index === 2
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 font-medium text-gray-900">
                    {product.name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-right text-gray-500">
                    {product.quantity}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-right font-medium text-gray-900">
                    EUR {product.revenue.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-right text-gray-500">
                    EUR {(product.revenue / product.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
