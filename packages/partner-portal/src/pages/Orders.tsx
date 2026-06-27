import { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShoppingCart,
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import api, { Order, PaginatedResponse } from '@/services/api';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const statusConfig: Record<
  Order['status'],
  { color: string; icon: React.ReactNode; label: string }
> = {
  pending: {
    color: 'bg-yellow-100 text-yellow-800',
    icon: <Clock className="h-4 w-4" />,
    label: 'Pending',
  },
  confirmed: {
    color: 'bg-blue-100 text-blue-800',
    icon: <CheckCircle className="h-4 w-4" />,
    label: 'Confirmed',
  },
  processing: {
    color: 'bg-purple-100 text-purple-800',
    icon: <Package className="h-4 w-4" />,
    label: 'Processing',
  },
  shipped: {
    color: 'bg-indigo-100 text-indigo-800',
    icon: <Truck className="h-4 w-4" />,
    label: 'Shipped',
  },
  delivered: {
    color: 'bg-green-100 text-green-800',
    icon: <CheckCircle className="h-4 w-4" />,
    label: 'Delivered',
  },
  cancelled: {
    color: 'bg-red-100 text-red-800',
    icon: <XCircle className="h-4 w-4" />,
    label: 'Cancelled',
  },
};

export function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<{
    orderId: string;
    status: Order['status'];
  } | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const response: PaginatedResponse<Order> = await api.getOrders({
        page,
        pageSize,
        status: statusFilter || undefined,
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      setOrders(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err) {
      setError('Failed to load orders');
      // Mock data for demo
      setOrders([
        {
          id: '1',
          orderNumber: 'ORD-2024-0001',
          partnerId: 'p1',
          customerId: 'c1',
          customerName: 'John Smith',
          customerEmail: 'john.smith@email.com',
          items: [
            {
              productId: 'p1',
              productName: 'Modern Kitchen Cabinet',
              sku: 'CAB-001',
              quantity: 4,
              unitPrice: 450,
              total: 1800,
            },
            {
              productId: 'p2',
              productName: 'Granite Countertop',
              sku: 'CNT-002',
              quantity: 1,
              unitPrice: 1200,
              total: 1200,
            },
          ],
          subtotal: 3000,
          tax: 300,
          shipping: 150,
          total: 3450,
          currency: 'EUR',
          status: 'pending',
          shippingAddress: {
            street: '123 Main St',
            city: 'Berlin',
            state: 'Berlin',
            postalCode: '10115',
            country: 'Germany',
          },
          createdAt: '2024-01-20T10:30:00Z',
          updatedAt: '2024-01-20T10:30:00Z',
        },
        {
          id: '2',
          orderNumber: 'ORD-2024-0002',
          partnerId: 'p1',
          customerId: 'c2',
          customerName: 'Maria Garcia',
          customerEmail: 'maria.garcia@email.com',
          items: [
            {
              productId: 'p3',
              productName: 'Stainless Steel Sink',
              sku: 'SNK-003',
              quantity: 2,
              unitPrice: 350,
              total: 700,
            },
          ],
          subtotal: 700,
          tax: 70,
          shipping: 50,
          total: 820,
          currency: 'EUR',
          status: 'processing',
          shippingAddress: {
            street: '456 Oak Ave',
            city: 'Munich',
            state: 'Bavaria',
            postalCode: '80331',
            country: 'Germany',
          },
          createdAt: '2024-01-19T14:20:00Z',
          updatedAt: '2024-01-20T09:00:00Z',
        },
        {
          id: '3',
          orderNumber: 'ORD-2024-0003',
          partnerId: 'p1',
          customerId: 'c3',
          customerName: 'Hans Mueller',
          customerEmail: 'hans.mueller@email.com',
          items: [
            {
              productId: 'p4',
              productName: 'LED Under Cabinet Light',
              sku: 'LGT-004',
              quantity: 6,
              unitPrice: 75,
              total: 450,
            },
            {
              productId: 'p5',
              productName: 'Drawer Organizer Set',
              sku: 'ORG-005',
              quantity: 3,
              unitPrice: 45,
              total: 135,
            },
          ],
          subtotal: 585,
          tax: 58.5,
          shipping: 25,
          total: 668.5,
          currency: 'EUR',
          status: 'shipped',
          shippingAddress: {
            street: '789 Pine Rd',
            city: 'Hamburg',
            state: 'Hamburg',
            postalCode: '20095',
            country: 'Germany',
          },
          trackingNumber: 'DHL-123456789',
          createdAt: '2024-01-18T08:45:00Z',
          updatedAt: '2024-01-19T16:30:00Z',
        },
        {
          id: '4',
          orderNumber: 'ORD-2024-0004',
          partnerId: 'p1',
          customerId: 'c4',
          customerName: 'Sophie Laurent',
          customerEmail: 'sophie.laurent@email.com',
          items: [
            {
              productId: 'p1',
              productName: 'Modern Kitchen Cabinet',
              sku: 'CAB-001',
              quantity: 8,
              unitPrice: 450,
              total: 3600,
            },
          ],
          subtotal: 3600,
          tax: 360,
          shipping: 200,
          total: 4160,
          currency: 'EUR',
          status: 'delivered',
          shippingAddress: {
            street: '321 Elm St',
            city: 'Frankfurt',
            state: 'Hesse',
            postalCode: '60311',
            country: 'Germany',
          },
          trackingNumber: 'UPS-987654321',
          createdAt: '2024-01-15T11:00:00Z',
          updatedAt: '2024-01-18T14:00:00Z',
        },
      ]);
      setTotal(4);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchOrders();
  };

  const handleStatusUpdate = async () => {
    if (!updatingStatus) return;
    try {
      setIsLoading(true);
      await api.updateOrderStatus(
        updatingStatus.orderId,
        updatingStatus.status,
        trackingNumber || undefined
      );
      setUpdatingStatus(null);
      setTrackingNumber('');
      fetchOrders();
    } catch {
      setError('Failed to update order status');
    } finally {
      setIsLoading(false);
    }
  };

  const getNextStatuses = (currentStatus: Order['status']): Order['status'][] => {
    switch (currentStatus) {
      case 'pending':
        return ['confirmed', 'cancelled'];
      case 'confirmed':
        return ['processing', 'cancelled'];
      case 'processing':
        return ['shipped', 'cancelled'];
      case 'shipped':
        return ['delivered'];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="mt-1 text-gray-500">Manage and track customer orders</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-800 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order number or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div className="flex flex-wrap gap-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            onClick={handleSearch}
            className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Filter className="mr-2 h-4 w-4" />
            Apply
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center">
            <ShoppingCart className="h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => {
                  const config = statusConfig[order.status];
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="font-medium text-gray-900">{order.orderNumber}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {order.customerName}
                        </div>
                        <div className="text-sm text-gray-500">{order.customerEmail}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {order.currency} {order.total.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}
                        >
                          {config.icon}
                          {config.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {format(new Date(order.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <button
                          onClick={() => setViewingOrder(order)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
            <div className="text-sm text-gray-500">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}{' '}
              orders
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium ${
                      pageNum === page
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{viewingOrder.orderNumber}</h2>
                <p className="text-sm text-gray-500">
                  Placed on {format(new Date(viewingOrder.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              <button
                onClick={() => setViewingOrder(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Customer Info */}
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="mb-3 font-semibold text-gray-900">Customer Information</h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-gray-500">Name:</span> {viewingOrder.customerName}
                  </p>
                  <p>
                    <span className="text-gray-500">Email:</span> {viewingOrder.customerEmail}
                  </p>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="mb-3 font-semibold text-gray-900">Shipping Address</h3>
                <div className="text-sm">
                  <p>{viewingOrder.shippingAddress.street}</p>
                  <p>
                    {viewingOrder.shippingAddress.city}, {viewingOrder.shippingAddress.state}{' '}
                    {viewingOrder.shippingAddress.postalCode}
                  </p>
                  <p>{viewingOrder.shippingAddress.country}</p>
                </div>
              </div>
            </div>

            {/* Order Status */}
            <div className="mt-6 rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Order Status</h3>
                  <span
                    className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                      statusConfig[viewingOrder.status].color
                    }`}
                  >
                    {statusConfig[viewingOrder.status].icon}
                    {statusConfig[viewingOrder.status].label}
                  </span>
                </div>
                {getNextStatuses(viewingOrder.status).length > 0 && (
                  <div className="flex gap-2">
                    {getNextStatuses(viewingOrder.status).map((status) => (
                      <button
                        key={status}
                        onClick={() => setUpdatingStatus({ orderId: viewingOrder.id, status })}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                          status === 'cancelled'
                            ? 'border border-red-300 text-red-600 hover:bg-red-50'
                            : 'bg-primary-600 text-white hover:bg-primary-700'
                        }`}
                      >
                        Mark as {statusConfig[status].label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {viewingOrder.trackingNumber && (
                <div className="mt-3 text-sm">
                  <span className="text-gray-500">Tracking Number:</span>{' '}
                  <span className="font-medium">{viewingOrder.trackingNumber}</span>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="mt-6">
              <h3 className="mb-4 font-semibold text-gray-900">Order Items</h3>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        SKU
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {viewingOrder.items.map((item) => (
                      <tr key={item.productId}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {item.productName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{item.sku}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-500">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-500">
                          {viewingOrder.currency} {item.unitPrice.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                          {viewingOrder.currency} {item.total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Order Summary */}
            <div className="mt-6 flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span>
                    {viewingOrder.currency} {viewingOrder.subtotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tax</span>
                  <span>
                    {viewingOrder.currency} {viewingOrder.tax.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Shipping</span>
                  <span>
                    {viewingOrder.currency} {viewingOrder.shipping.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold">
                  <span>Total</span>
                  <span>
                    {viewingOrder.currency} {viewingOrder.total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewingOrder(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {updatingStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h3 className="text-lg font-bold text-gray-900">Update Order Status</h3>
            <p className="mt-2 text-gray-500">
              Change status to{' '}
              <span className="font-medium capitalize">{updatingStatus.status}</span>
            </p>

            {updatingStatus.status === 'shipped' && (
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Tracking Number
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setUpdatingStatus(null);
                  setTrackingNumber('');
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={isLoading}
                className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-white ${
                  updatingStatus.status === 'cancelled'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-primary-600 hover:bg-primary-700'
                } disabled:opacity-50`}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Orders;
