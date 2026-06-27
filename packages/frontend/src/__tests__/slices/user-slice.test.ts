/**
 * User Slice Tests
 * Tests for user Redux slice - CRUD operations, state management, and admin actions
 */

import { configureStore } from '@reduxjs/toolkit';
import userReducer, {
  fetchUsers,
  fetchUserById,
  updateUser,
  deleteUser,
  toggleUserActive,
  setFilters,
  clearFilters,
  clearCurrentUser,
  clearError,
  selectUsers,
  selectCurrentUser,
  selectUserLoading,
  User,
  UserState,
} from '../../features/user/user-slice';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('User Slice', () => {
  let store: ReturnType<typeof configureStore<{ user: UserState }>>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'user',
    avatar: 'https://example.com/avatar.jpg',
    isActive: true,
    isVerified: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    lastLoginAt: '2024-01-15T00:00:00.000Z',
  };

  const mockAdminUser: User = {
    ...mockUser,
    id: 'admin-123',
    email: 'admin@example.com',
    role: 'admin',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    store = configureStore({
      reducer: { user: userReducer },
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = store.getState().user;
      expect(state.users).toEqual([]);
      expect(state.currentUser).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.filters).toEqual({});
      expect(state.pagination).toEqual({ page: 1, limit: 20, total: 0, totalPages: 0 });
    });
  });

  describe('Synchronous Actions', () => {
    describe('setFilters', () => {
      it('should set filters correctly', () => {
        const filters = { role: 'admin', isActive: true, search: 'john' };
        store.dispatch(setFilters(filters));

        const state = store.getState().user;
        expect(state.filters).toEqual(filters);
      });

      it('should handle boolean filter values', () => {
        store.dispatch(setFilters({ isActive: false }));

        const state = store.getState().user;
        expect(state.filters.isActive).toBe(false);
      });
    });

    describe('clearFilters', () => {
      it('should clear all filters', () => {
        store.dispatch(setFilters({ role: 'admin', search: 'test' }));
        store.dispatch(clearFilters());

        const state = store.getState().user;
        expect(state.filters).toEqual({});
      });
    });

    describe('clearCurrentUser', () => {
      it('should clear current user', () => {
        store = configureStore({
          reducer: { user: userReducer },
          preloadedState: {
            user: {
              users: [],
              currentUser: mockUser,
              isLoading: false,
              error: null,
              filters: {},
              pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
            },
          },
        });

        store.dispatch(clearCurrentUser());

        const state = store.getState().user;
        expect(state.currentUser).toBeNull();
      });
    });

    describe('clearError', () => {
      it('should clear error state', () => {
        store = configureStore({
          reducer: { user: userReducer },
          preloadedState: {
            user: {
              users: [],
              currentUser: null,
              isLoading: false,
              error: 'Some error',
              filters: {},
              pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
            },
          },
        });

        store.dispatch(clearError());

        const state = store.getState().user;
        expect(state.error).toBeNull();
      });
    });
  });

  describe('Async Thunks', () => {
    describe('fetchUsers', () => {
      it('should fetch users successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [mockUser, mockAdminUser],
              meta: { total: 2, page: 1, totalPages: 1 },
            }),
        });

        await store.dispatch(fetchUsers({ page: 1, limit: 20 }));

        const state = store.getState().user;
        expect(state.users).toHaveLength(2);
        expect(state.isLoading).toBe(false);
        expect(state.pagination.total).toBe(2);
      });

      it('should handle fetch users failure', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Unauthorized' }),
        });

        await store.dispatch(fetchUsers({ page: 1, limit: 20 }));

        const state = store.getState().user;
        expect(state.error).toBe('Unauthorized');
        expect(state.isLoading).toBe(false);
      });

      it('should apply filters when fetching', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [mockAdminUser],
              meta: { total: 1, page: 1, totalPages: 1 },
            }),
        });

        await store.dispatch(
          fetchUsers({
            page: 1,
            limit: 20,
            filters: { role: 'admin', isActive: true },
          })
        );

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('role=admin'),
          expect.any(Object)
        );
      });

      it('should filter out undefined values from params', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [],
              meta: { total: 0, page: 1, totalPages: 0 },
            }),
        });

        await store.dispatch(
          fetchUsers({
            page: 1,
            limit: 20,
            filters: { role: undefined, search: 'test' },
          })
        );

        const calledUrl = mockFetch.mock.calls[0][0];
        expect(calledUrl).not.toContain('role=undefined');
        expect(calledUrl).toContain('search=test');
      });
    });

    describe('fetchUserById', () => {
      it('should fetch single user successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockUser }),
        });

        await store.dispatch(fetchUserById('user-123'));

        const state = store.getState().user;
        expect(state.currentUser).toEqual(mockUser);
      });

      it('should handle fetch user by ID failure', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'User not found' }),
        });

        await store.dispatch(fetchUserById('non-existent'));

        // The current implementation doesn't set error for fetchUserById failure
        // but the state should remain unchanged
        const state = store.getState().user;
        expect(state.currentUser).toBeNull();
      });
    });

    describe('updateUser', () => {
      it('should update user successfully', async () => {
        store = configureStore({
          reducer: { user: userReducer },
          preloadedState: {
            user: {
              users: [mockUser],
              currentUser: mockUser,
              isLoading: false,
              error: null,
              filters: {},
              pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
            },
          },
        });

        const updatedUser = { ...mockUser, firstName: 'Jane' };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: updatedUser }),
        });

        await store.dispatch(
          updateUser({
            id: 'user-123',
            updates: { firstName: 'Jane' },
          })
        );

        const state = store.getState().user;
        expect(state.users[0].firstName).toBe('Jane');
        expect(state.currentUser?.firstName).toBe('Jane');
      });

      it('should handle update user failure', async () => {
        store = configureStore({
          reducer: { user: userReducer },
          preloadedState: {
            user: {
              users: [mockUser],
              currentUser: mockUser,
              isLoading: false,
              error: null,
              filters: {},
              pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
            },
          },
        });

        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Update failed' }),
        });

        await store.dispatch(
          updateUser({
            id: 'user-123',
            updates: { firstName: 'Jane' },
          })
        );

        const state = store.getState().user;
        // Original data should be preserved
        expect(state.users[0].firstName).toBe('John');
      });
    });

    describe('deleteUser', () => {
      it('should delete user successfully', async () => {
        store = configureStore({
          reducer: { user: userReducer },
          preloadedState: {
            user: {
              users: [mockUser, mockAdminUser],
              currentUser: mockUser,
              isLoading: false,
              error: null,
              filters: {},
              pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
            },
          },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { success: true } }),
        });

        await store.dispatch(deleteUser('user-123'));

        const state = store.getState().user;
        expect(state.users).toHaveLength(1);
        expect(state.users[0].id).toBe('admin-123');
        expect(state.currentUser).toBeNull();
      });

      it('should not clear currentUser if deleting different user', async () => {
        store = configureStore({
          reducer: { user: userReducer },
          preloadedState: {
            user: {
              users: [mockUser, mockAdminUser],
              currentUser: mockAdminUser,
              isLoading: false,
              error: null,
              filters: {},
              pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
            },
          },
        });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { success: true } }),
        });

        await store.dispatch(deleteUser('user-123'));

        const state = store.getState().user;
        expect(state.currentUser).toEqual(mockAdminUser);
      });
    });

    describe('toggleUserActive', () => {
      it('should toggle user active status successfully', async () => {
        const activeUser = { ...mockUser, isActive: true };

        store = configureStore({
          reducer: { user: userReducer },
          preloadedState: {
            user: {
              users: [activeUser],
              currentUser: null,
              isLoading: false,
              error: null,
              filters: {},
              pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
            },
          },
        });

        const deactivatedUser = { ...activeUser, isActive: false };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: deactivatedUser }),
        });

        await store.dispatch(toggleUserActive('user-123'));

        const state = store.getState().user;
        expect(state.users[0].isActive).toBe(false);
      });

      it('should handle toggle failure', async () => {
        store = configureStore({
          reducer: { user: userReducer },
          preloadedState: {
            user: {
              users: [mockUser],
              currentUser: null,
              isLoading: false,
              error: null,
              filters: {},
              pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
            },
          },
        });

        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Cannot deactivate admin' }),
        });

        await store.dispatch(toggleUserActive('user-123'));

        const state = store.getState().user;
        // Original state should be preserved
        expect(state.users[0].isActive).toBe(true);
      });
    });
  });

  describe('Selectors', () => {
    const mockState = {
      user: {
        users: [mockUser, mockAdminUser],
        currentUser: mockUser,
        isLoading: true,
        error: 'Some error',
        filters: { role: 'user' },
        pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
      },
    };

    it('selectUsers should return users array', () => {
      expect(selectUsers(mockState)).toEqual([mockUser, mockAdminUser]);
    });

    it('selectCurrentUser should return current user', () => {
      expect(selectCurrentUser(mockState)).toEqual(mockUser);
    });

    it('selectUserLoading should return loading state', () => {
      expect(selectUserLoading(mockState)).toBe(true);
    });

    it('selectUsers should return empty array when no users', () => {
      const emptyState = {
        user: {
          ...mockState.user,
          users: [],
        },
      };
      expect(selectUsers(emptyState)).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle pagination correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [mockUser],
            meta: { total: 100, page: 5, totalPages: 10 },
          }),
      });

      await store.dispatch(fetchUsers({ page: 5, limit: 10 }));

      const state = store.getState().user;
      expect(state.pagination.page).toBe(5);
      expect(state.pagination.total).toBe(100);
      expect(state.pagination.totalPages).toBe(10);
    });

    it('should handle empty search results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [],
            meta: { total: 0, page: 1, totalPages: 0 },
          }),
      });

      await store.dispatch(
        fetchUsers({
          page: 1,
          limit: 20,
          filters: { search: 'nonexistent' },
        })
      );

      const state = store.getState().user;
      expect(state.users).toEqual([]);
      expect(state.pagination.total).toBe(0);
    });

    it('should update user in list without affecting other users', async () => {
      store = configureStore({
        reducer: { user: userReducer },
        preloadedState: {
          user: {
            users: [mockUser, mockAdminUser],
            currentUser: null,
            isLoading: false,
            error: null,
            filters: {},
            pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
          },
        },
      });

      const updatedUser = { ...mockUser, email: 'newemail@example.com' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: updatedUser }),
      });

      await store.dispatch(
        updateUser({
          id: 'user-123',
          updates: { email: 'newemail@example.com' },
        })
      );

      const state = store.getState().user;
      expect(state.users[0].email).toBe('newemail@example.com');
      expect(state.users[1].email).toBe('admin@example.com'); // Unchanged
    });
  });
});
