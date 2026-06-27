/**
 * Kitchen Slice Tests
 * Tests for kitchen Redux slice - CRUD operations, state management, and item manipulation
 */

import { configureStore } from '@reduxjs/toolkit';
import kitchenReducer, {
  fetchKitchens,
  fetchKitchenById,
  createKitchen,
  updateKitchen,
  deleteKitchen,
  duplicateKitchen,
  setFilters,
  clearFilters,
  clearCurrentKitchen,
  clearError,
  updateLocalKitchen,
  addItem,
  updateItem,
  removeItem,
  selectKitchens,
  selectCurrentKitchen,
  selectKitchenLoading,
  selectKitchenError,
  Kitchen,
  KitchenItem,
  KitchenState,
} from '../../features/kitchen/kitchen-slice';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Kitchen Slice', () => {
  let store: ReturnType<typeof configureStore<{ kitchen: KitchenState }>>;

  const mockKitchen: Kitchen = {
    id: 'kitchen-123',
    userId: 'user-123',
    name: 'Modern Kitchen',
    description: 'A beautiful modern kitchen design',
    style: 'modern',
    layout: 'L-shaped',
    dimensions: { width: 400, length: 300, height: 270 },
    budget: 15000,
    status: 'designing',
    items: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-15T00:00:00.000Z',
  };

  const mockKitchenItem: KitchenItem = {
    id: 'item-123',
    type: 'cabinet',
    productId: 'product-123',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { width: 60, height: 80, depth: 50 },
  };

  const mockPaginatedResponse = {
    data: [mockKitchen],
    total: 1,
    page: 1,
    totalPages: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    store = configureStore({
      reducer: { kitchen: kitchenReducer },
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = store.getState().kitchen;
      expect(state.kitchens).toEqual([]);
      expect(state.currentKitchen).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.filters).toEqual({});
      expect(state.pagination).toEqual({ page: 1, limit: 20, total: 0, totalPages: 0 });
    });
  });

  describe('Synchronous Actions', () => {
    describe('setFilters', () => {
      it('should set filters correctly', () => {
        const filters = { status: 'designing', projectId: 'project-123' };
        store.dispatch(setFilters(filters));

        const state = store.getState().kitchen;
        expect(state.filters).toEqual(filters);
      });
    });

    describe('clearFilters', () => {
      it('should clear all filters', () => {
        store.dispatch(setFilters({ status: 'designing', search: 'test' }));
        store.dispatch(clearFilters());

        const state = store.getState().kitchen;
        expect(state.filters).toEqual({});
      });
    });

    describe('clearCurrentKitchen', () => {
      it('should clear current kitchen', () => {
        // Set up store with current kitchen
        store = configureStore({
          reducer: { kitchen: kitchenReducer },
          preloadedState: {
            kitchen: {
              kitchens: [],
              currentKitchen: mockKitchen,
              isLoading: false,
              error: null,
              filters: {},
              pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
            },
          },
        });

        store.dispatch(clearCurrentKitchen());

        const state = store.getState().kitchen;
        expect(state.currentKitchen).toBeNull();
      });
    });

    describe('clearError', () => {
      it('should clear error state', () => {
        store = configureStore({
          reducer: { kitchen: kitchenReducer },
          preloadedState: {
            kitchen: {
              kitchens: [],
              currentKitchen: null,
              isLoading: false,
              error: 'Some error',
              filters: {},
              pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
            },
          },
        });

        store.dispatch(clearError());

        const state = store.getState().kitchen;
        expect(state.error).toBeNull();
      });
    });

    describe('updateLocalKitchen', () => {
      it('should update current kitchen locally', () => {
        store = configureStore({
          reducer: { kitchen: kitchenReducer },
          preloadedState: {
            kitchen: {
              kitchens: [],
              currentKitchen: mockKitchen,
              isLoading: false,
              error: null,
              filters: {},
              pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
            },
          },
        });

        store.dispatch(updateLocalKitchen({ name: 'Updated Kitchen Name' }));

        const state = store.getState().kitchen;
        expect(state.currentKitchen?.name).toBe('Updated Kitchen Name');
      });

      it('should not update if no current kitchen', () => {
        store.dispatch(updateLocalKitchen({ name: 'Updated Kitchen Name' }));

        const state = store.getState().kitchen;
        expect(state.currentKitchen).toBeNull();
      });
    });

    describe('addItem', () => {
      it('should add item to current kitchen', () => {
        store = configureStore({
          reducer: { kitchen: kitchenReducer },
          preloadedState: {
            kitchen: {
              kitchens: [],
              currentKitchen: { ...mockKitchen, items: [] },
              isLoading: false,
              error: null,
              filters: {},
              pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
            },
          },
        });

        store.dispatch(addItem(mockKitchenItem));

        const state = store.getState().kitchen;
        expect(state.currentKitchen?.items).toHaveLength(1);
        expect(state.currentKitchen?.items?.[0]).toEqual(mockKitchenItem);
      });
    });

    describe('updateItem', () => {
      it('should update existing item in current kitchen', () => {
        store = configureStore({
          reducer: { kitchen: kitchenReducer },
          preloadedState: {
            kitchen: {
              kitchens: [],
              currentKitchen: { ...mockKitchen, items: [mockKitchenItem] },
              isLoading: false,
              error: null,
              filters: {},
              pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
            },
          },
        });

        store.dispatch(
          updateItem({
            id: 'item-123',
            updates: { position: { x: 100, y: 50, z: 0 } },
          })
        );

        const state = store.getState().kitchen;
        expect(state.currentKitchen?.items?.[0]?.position).toEqual({ x: 100, y: 50, z: 0 });
      });

      it('should not update non-existent item', () => {
        store = configureStore({
          reducer: { kitchen: kitchenReducer },
          preloadedState: {
            kitchen: {
              kitchens: [],
              currentKitchen: { ...mockKitchen, items: [mockKitchenItem] },
              isLoading: false,
              error: null,
              filters: {},
              pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
            },
          },
        });

        store.dispatch(
          updateItem({
            id: 'non-existent-id',
            updates: { position: { x: 100, y: 50, z: 0 } },
          })
        );

        const state = store.getState().kitchen;
        expect(state.currentKitchen?.items?.[0]?.position).toEqual(mockKitchenItem.position);
      });
    });

    describe('removeItem', () => {
      it('should remove item from current kitchen', () => {
        store = configureStore({
          reducer: { kitchen: kitchenReducer },
          preloadedState: {
            kitchen: {
              kitchens: [],
              currentKitchen: { ...mockKitchen, items: [mockKitchenItem] },
              isLoading: false,
              error: null,
              filters: {},
              pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
            },
          },
        });

        store.dispatch(removeItem('item-123'));

        const state = store.getState().kitchen;
        expect(state.currentKitchen?.items).toHaveLength(0);
      });
    });
  });

  describe('Async Thunks', () => {
    describe('fetchKitchens', () => {
      it('should fetch kitchens successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ data: [mockKitchen], meta: { total: 1, page: 1, totalPages: 1 } }),
        });

        await store.dispatch(fetchKitchens({ page: 1, limit: 20 }));

        const state = store.getState().kitchen;
        expect(state.kitchens).toHaveLength(1);
        expect(state.kitchens[0]).toEqual(mockKitchen);
        expect(state.isLoading).toBe(false);
        expect(state.pagination.total).toBe(1);
      });

      it('should handle fetch kitchens failure', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Failed to fetch kitchens' }),
        });

        await store.dispatch(fetchKitchens({ page: 1, limit: 20 }));

        const state = store.getState().kitchen;
        expect(state.error).toBe('Failed to fetch kitchens');
        expect(state.isLoading).toBe(false);
      });

      it('should apply filters when fetching', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [], meta: { total: 0, page: 1, totalPages: 0 } }),
        });

        await store.dispatch(
          fetchKitchens({
            page: 1,
            limit: 20,
            filters: { status: 'designing', search: 'modern' },
          })
        );

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('status=designing'),
          expect.any(Object)
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('search=modern'),
          expect.any(Object)
        );
      });
    });

    describe('fetchKitchenById', () => {
      it('should fetch single kitchen successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockKitchen }),
        });

        await store.dispatch(fetchKitchenById('kitchen-123'));

        const state = store.getState().kitchen;
        expect(state.currentKitchen).toEqual(mockKitchen);
        expect(state.isLoading).toBe(false);
      });

      it('should handle fetch kitchen by ID failure', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Kitchen not found' }),
        });

        await store.dispatch(fetchKitchenById('non-existent-id'));

        const state = store.getState().kitchen;
        expect(state.error).toBe('Kitchen not found');
      });
    });

    describe('createKitchen', () => {
      it('should create kitchen successfully', async () => {
        const newKitchen = { ...mockKitchen, id: 'new-kitchen-123' };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: newKitchen }),
        });

        await store.dispatch(
          createKitchen({
            name: 'New Kitchen',
            dimensions: { width: 400, length: 300, height: 270 },
          })
        );

        const state = store.getState().kitchen;
        expect(state.kitchens).toContainEqual(newKitchen);
        expect(state.currentKitchen).toEqual(newKitchen);
      });

      it('should add new kitchen to beginning of list', async () => {
        // Pre-populate with existing kitchen
        store = configureStore({
          reducer: { kitchen: kitchenReducer },
          preloadedState: {
            kitchen: {
              kitchens: [mockKitchen],
              currentKitchen: null,
              isLoading: false,
              error: null,
              filters: {},
              pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
            },
          },
        });

        const newKitchen = { ...mockKitchen, id: 'new-kitchen-123', name: 'New Kitchen' };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: newKitchen }),
        });

        await store.dispatch(createKitchen({ name: 'New Kitchen' }));

        const state = store.getState().kitchen;
        expect(state.kitchens[0]).toEqual(newKitchen);
        expect(state.kitchens).toHaveLength(2);
      });
    });

    describe('updateKitchen', () => {
      it('should update kitchen successfully', async () => {
        store = configureStore({
          reducer: { kitchen: kitchenReducer },
          preloadedState: {
            kitchen: {
              kitchens: [mockKitchen],
              currentKitchen: mockKitchen,
              isLoading: false,
              error: null,
              filters: {},
              pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
            },
          },
        });

        const updatedKitchen = { ...mockKitchen, name: 'Updated Kitchen' };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: updatedKitchen }),
        });

        await store.dispatch(
          updateKitchen({
            id: 'kitchen-123',
            updates: { name: 'Updated Kitchen' },
          })
        );

        const state = store.getState().kitchen;
        expect(state.kitchens[0].name).toBe('Updated Kitchen');
        expect(state.currentKitchen?.name).toBe('Updated Kitchen');
      });
    });

    describe('deleteKitchen', () => {
      it('should delete kitchen successfully', async () => {
        store = configureStore({
          reducer: { kitchen: kitchenReducer },
          preloadedState: {
            kitchen: {
              kitchens: [mockKitchen],
              currentKitchen: mockKitchen,
              isLoading: false,
              error: null,
              filters: {},
              pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
            },
          },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { success: true } }),
        });

        await store.dispatch(deleteKitchen('kitchen-123'));

        const state = store.getState().kitchen;
        expect(state.kitchens).toHaveLength(0);
        expect(state.currentKitchen).toBeNull();
      });
    });

    describe('duplicateKitchen', () => {
      it('should duplicate kitchen successfully', async () => {
        const duplicatedKitchen = {
          ...mockKitchen,
          id: 'duplicated-kitchen-123',
          name: 'Modern Kitchen (Copy)',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: duplicatedKitchen }),
        });

        await store.dispatch(duplicateKitchen('kitchen-123'));

        const state = store.getState().kitchen;
        expect(state.kitchens).toContainEqual(duplicatedKitchen);
      });
    });
  });

  describe('Selectors', () => {
    const mockState = {
      kitchen: {
        kitchens: [mockKitchen],
        currentKitchen: mockKitchen,
        isLoading: true,
        error: 'Some error',
        filters: { status: 'designing' },
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
    };

    it('selectKitchens should return kitchens array', () => {
      expect(selectKitchens(mockState)).toEqual([mockKitchen]);
    });

    it('selectCurrentKitchen should return current kitchen', () => {
      expect(selectCurrentKitchen(mockState)).toEqual(mockKitchen);
    });

    it('selectKitchenLoading should return loading state', () => {
      expect(selectKitchenLoading(mockState)).toBe(true);
    });

    it('selectKitchenError should return error state', () => {
      expect(selectKitchenError(mockState)).toBe('Some error');
    });
  });
});
