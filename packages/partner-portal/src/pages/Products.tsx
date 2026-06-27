import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  Upload,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  setFilters,
  setPage,
  clearError,
} from '@/store/slices/productsSlice';
import { Product, ProductCreateInput } from '@/services/api';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().min(1, 'Subcategory is required'),
  price: z.number().positive('Price must be positive'),
  currency: z.string().default('EUR'),
  dimensions: z.object({
    width: z.number().positive('Width must be positive'),
    height: z.number().positive('Height must be positive'),
    depth: z.number().positive('Depth must be positive'),
    unit: z.string().default('cm'),
  }),
  materials: z.array(z.string()).min(1, 'At least one material is required'),
  colors: z.array(z.string()).min(1, 'At least one color is required'),
  images: z.array(z.string()).default([]),
  modelUrl: z.string().optional(),
  stock: z.number().min(0, 'Stock cannot be negative'),
});

type ProductFormData = z.infer<typeof productSchema>;

const categories = [
  { value: 'cabinets', label: 'Cabinets' },
  { value: 'countertops', label: 'Countertops' },
  { value: 'appliances', label: 'Appliances' },
  { value: 'sinks', label: 'Sinks & Faucets' },
  { value: 'storage', label: 'Storage Solutions' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'accessories', label: 'Accessories' },
];

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export function Products() {
  const dispatch = useAppDispatch();
  const { products, total, page, pageSize, totalPages, isLoading, error, filters } = useAppSelector(
    (state) => state.products
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(filters.search);
  const [materialsInput, setMaterialsInput] = useState('');
  const [colorsInput, setColorsInput] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      currency: 'EUR',
      dimensions: { unit: 'cm', width: 0, height: 0, depth: 0 },
      materials: [],
      colors: [],
      images: [],
      stock: 0,
    },
  });

  const materials = watch('materials') || [];
  const colors = watch('colors') || [];

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch, page, filters]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => dispatch(clearError()), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleSearch = useCallback(() => {
    dispatch(setFilters({ search: searchInput }));
  }, [dispatch, searchInput]);

  const handleFilterChange = (key: string, value: string) => {
    dispatch(setFilters({ [key]: value }));
  };

  const openAddModal = () => {
    setEditingProduct(null);
    reset({
      currency: 'EUR',
      dimensions: { unit: 'cm', width: 0, height: 0, depth: 0 },
      materials: [],
      colors: [],
      images: [],
      stock: 0,
    });
    setMaterialsInput('');
    setColorsInput('');
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    reset({
      name: product.name,
      sku: product.sku,
      description: product.description,
      category: product.category,
      subcategory: product.subcategory,
      price: product.price,
      currency: product.currency,
      dimensions: product.dimensions,
      materials: product.materials,
      colors: product.colors,
      images: product.images,
      modelUrl: product.modelUrl,
      stock: product.stock,
    });
    setMaterialsInput('');
    setColorsInput('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    reset();
  };

  const addMaterial = () => {
    if (materialsInput.trim() && !materials.includes(materialsInput.trim())) {
      setValue('materials', [...materials, materialsInput.trim()]);
      setMaterialsInput('');
    }
  };

  const removeMaterial = (material: string) => {
    setValue(
      'materials',
      materials.filter((m) => m !== material)
    );
  };

  const addColor = () => {
    if (colorsInput.trim() && !colors.includes(colorsInput.trim())) {
      setValue('colors', [...colors, colorsInput.trim()]);
      setColorsInput('');
    }
  };

  const removeColor = (color: string) => {
    setValue(
      'colors',
      colors.filter((c) => c !== color)
    );
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      if (editingProduct) {
        await dispatch(updateProduct({ id: editingProduct.id, data })).unwrap();
      } else {
        await dispatch(createProduct(data as ProductCreateInput)).unwrap();
      }
      closeModal();
      dispatch(fetchProducts());
    } catch {
      // Error handled by Redux
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteProduct(id)).unwrap();
      setDeleteConfirm(null);
    } catch {
      // Error handled by Redux
    }
  };

  const getStatusBadge = (status: Product['status']) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
    };
    return styles[status] || styles.draft;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="mt-1 text-gray-500">Manage your product catalog</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </button>
      </div>

      {/* Error Message */}
      {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div className="flex gap-4">
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleSearch}
            className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center">
            <Package className="h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500">No products found</p>
            <button
              onClick={openAddModal}
              className="mt-4 text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Add your first product
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-gray-200">
                          {product.images[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200">
                              <Package className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">{product.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {product.sku}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 capitalize">
                      {product.category}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {product.currency} {product.price.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {product.stock}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${getStatusBadge(
                          product.status
                        )}`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setViewingProduct(product)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(product)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(product.id)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
            <div className="text-sm text-gray-500">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}{' '}
              results
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => dispatch(setPage(page - 1))}
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
                    onClick={() => dispatch(setPage(pageNum))}
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
                onClick={() => dispatch(setPage(page + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Product Name *
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">SKU *</label>
                  <input
                    {...register('sku')}
                    type="text"
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.sku ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.sku && <p className="mt-1 text-xs text-red-600">{errors.sku.message}</p>}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Description *
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
                )}
              </div>

              {/* Category */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Category *</label>
                  <select
                    {...register('category')}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.category ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-xs text-red-600">{errors.category.message}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Subcategory *
                  </label>
                  <input
                    {...register('subcategory')}
                    type="text"
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.subcategory ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.subcategory && (
                    <p className="mt-1 text-xs text-red-600">{errors.subcategory.message}</p>
                  )}
                </div>
              </div>

              {/* Price & Stock */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Price *</label>
                  <input
                    {...register('price', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.price ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.price && (
                    <p className="mt-1 text-xs text-red-600">{errors.price.message}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Currency</label>
                  <select
                    {...register('currency')}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Stock *</label>
                  <input
                    {...register('stock', { valueAsNumber: true })}
                    type="number"
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.stock ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.stock && (
                    <p className="mt-1 text-xs text-red-600">{errors.stock.message}</p>
                  )}
                </div>
              </div>

              {/* Dimensions */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Dimensions *</label>
                <div className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <input
                      {...register('dimensions.width', { valueAsNumber: true })}
                      type="number"
                      placeholder="Width"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <input
                      {...register('dimensions.height', { valueAsNumber: true })}
                      type="number"
                      placeholder="Height"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <input
                      {...register('dimensions.depth', { valueAsNumber: true })}
                      type="number"
                      placeholder="Depth"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <select
                      {...register('dimensions.unit')}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="cm">cm</option>
                      <option value="mm">mm</option>
                      <option value="in">in</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Materials */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Materials *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={materialsInput}
                    onChange={(e) => setMaterialsInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMaterial())}
                    placeholder="Add material"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="button"
                    onClick={addMaterial}
                    className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  >
                    Add
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {materials.map((material) => (
                    <span
                      key={material}
                      className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                    >
                      {material}
                      <button
                        type="button"
                        onClick={() => removeMaterial(material)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                {errors.materials && (
                  <p className="mt-1 text-xs text-red-600">{errors.materials.message}</p>
                )}
              </div>

              {/* Colors */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Colors *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={colorsInput}
                    onChange={(e) => setColorsInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
                    placeholder="Add color"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="button"
                    onClick={addColor}
                    className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  >
                    Add
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <span
                      key={color}
                      className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-800"
                    >
                      {color}
                      <button
                        type="button"
                        onClick={() => removeColor(color)}
                        className="ml-2 text-purple-600 hover:text-purple-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                {errors.colors && (
                  <p className="mt-1 text-xs text-red-600">{errors.colors.message}</p>
                )}
              </div>

              {/* Image Upload Placeholder */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Images</label>
                <div className="flex h-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-500">
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">Click to upload or drag and drop</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{viewingProduct.name}</h2>
              <button
                onClick={() => setViewingProduct(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-500">SKU</p>
                  <p className="font-medium">{viewingProduct.sku}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${getStatusBadge(
                      viewingProduct.status
                    )}`}
                  >
                    {viewingProduct.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-medium capitalize">{viewingProduct.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Subcategory</p>
                  <p className="font-medium">{viewingProduct.subcategory}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Price</p>
                  <p className="font-medium">
                    {viewingProduct.currency} {viewingProduct.price.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Stock</p>
                  <p className="font-medium">{viewingProduct.stock} units</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p className="mt-1">{viewingProduct.description}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Dimensions</p>
                <p className="font-medium">
                  {viewingProduct.dimensions.width} x {viewingProduct.dimensions.height} x{' '}
                  {viewingProduct.dimensions.depth} {viewingProduct.dimensions.unit}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Materials</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {viewingProduct.materials.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Colors</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {viewingProduct.colors.map((c) => (
                    <span
                      key={c}
                      className="rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-800"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setViewingProduct(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setViewingProduct(null);
                  openEditModal(viewingProduct);
                }}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Edit Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h3 className="text-lg font-bold text-gray-900">Delete Product</h3>
            <p className="mt-2 text-gray-500">
              Are you sure you want to delete this product? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={isLoading}
                className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;
