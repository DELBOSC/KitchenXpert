import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api, { Product, ProductCreateInput, ProductUpdateInput, ApiError, PaginatedResponse } from '@/services/api';

interface ProductsState {
  products: Product[];
  selectedProduct: Product | null;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  filters: {
    search: string;
    category: string;
    status: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
}

const initialState: ProductsState = {
  products: [],
  selectedProduct: null,
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
  isLoading: false,
  error: null,
  filters: {
    search: '',
    category: '',
    status: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
};

interface FetchProductsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const fetchProducts = createAsyncThunk<
  PaginatedResponse<Product>,
  FetchProductsParams | undefined,
  { rejectValue: string }
>('products/fetchProducts', async (params, { rejectWithValue, getState }) => {
  try {
    const state = getState() as { products: ProductsState };
    const { filters, page, pageSize } = state.products;
    const queryParams = {
      page: params?.page ?? page,
      pageSize: params?.pageSize ?? pageSize,
      search: params?.search ?? filters.search || undefined,
      category: params?.category ?? filters.category || undefined,
      status: params?.status ?? filters.status || undefined,
      sortBy: params?.sortBy ?? filters.sortBy,
      sortOrder: params?.sortOrder ?? filters.sortOrder,
    };
    return await api.getProducts(queryParams);
  } catch (error) {
    const apiError = error as ApiError;
    return rejectWithValue(apiError.message);
  }
});

export const fetchProduct = createAsyncThunk<Product, string, { rejectValue: string }>(
  'products/fetchProduct',
  async (id, { rejectWithValue }) => {
    try {
      return await api.getProduct(id);
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message);
    }
  }
);

export const createProduct = createAsyncThunk<
  Product,
  ProductCreateInput,
  { rejectValue: string }
>('products/createProduct', async (data, { rejectWithValue }) => {
  try {
    return await api.createProduct(data);
  } catch (error) {
    const apiError = error as ApiError;
    return rejectWithValue(apiError.message);
  }
});

export const updateProduct = createAsyncThunk<
  Product,
  { id: string; data: ProductUpdateInput },
  { rejectValue: string }
>('products/updateProduct', async ({ id, data }, { rejectWithValue }) => {
  try {
    return await api.updateProduct(id, data);
  } catch (error) {
    const apiError = error as ApiError;
    return rejectWithValue(apiError.message);
  }
});

export const deleteProduct = createAsyncThunk<string, string, { rejectValue: string }>(
  'products/deleteProduct',
  async (id, { rejectWithValue }) => {
    try {
      await api.deleteProduct(id);
      return id;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message);
    }
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedProduct: (state) => {
      state.selectedProduct = null;
    },
    setFilters: (state, action: PayloadAction<Partial<ProductsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.page = 1;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
    setPageSize: (state, action: PayloadAction<number>) => {
      state.pageSize = action.payload;
      state.page = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Products
      .addCase(fetchProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.products = action.payload.data;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pageSize = action.payload.pageSize;
        state.totalPages = action.payload.totalPages;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch products';
      })
      // Fetch Single Product
      .addCase(fetchProduct.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedProduct = action.payload;
      })
      .addCase(fetchProduct.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch product';
      })
      // Create Product
      .addCase(createProduct.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        state.products.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to create product';
      })
      // Update Product
      .addCase(updateProduct.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.products.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.products[index] = action.payload;
        }
        if (state.selectedProduct?.id === action.payload.id) {
          state.selectedProduct = action.payload;
        }
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to update product';
      })
      // Delete Product
      .addCase(deleteProduct.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        state.products = state.products.filter((p) => p.id !== action.payload);
        state.total -= 1;
        if (state.selectedProduct?.id === action.payload) {
          state.selectedProduct = null;
        }
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to delete product';
      });
  },
});

export const { clearError, clearSelectedProduct, setFilters, setPage, setPageSize } =
  productsSlice.actions;
export default productsSlice.reducer;
