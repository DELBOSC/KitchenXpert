/**
 * Project Slice Tests
 * Tests for project Redux slice - CRUD operations and state management
 */

import { configureStore } from '@reduxjs/toolkit';
import projectReducer, {
  fetchProjects,
  fetchProjectById,
  createProject,
  updateProject,
  deleteProject,
  updateProjectStatus,
  setFilters,
  clearFilters,
  clearCurrentProject,
  clearError,
  selectProjects,
  selectCurrentProject,
  selectProjectLoading,
  selectProjectError,
  Project,
  ProjectState,
} from '../../features/project/project-slice';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Project Slice', () => {
  let store: ReturnType<typeof configureStore<{ project: ProjectState }>>;

  const mockProject: Project = {
    id: 'project-123',
    userId: 'user-123',
    name: 'Kitchen Renovation 2024',
    description: 'Complete kitchen redesign project',
    status: 'in_progress',
    budget: 25000,
    timeline: {
      start: '2024-01-01',
      end: '2024-03-31',
    },
    collaborators: [
      {
        userId: 'collaborator-1',
        role: 'designer',
        user: {
          email: 'designer@example.com',
          firstName: 'Jane',
          lastName: 'Designer',
        },
      },
    ],
    kitchens: [{ id: 'kitchen-1', name: 'Main Kitchen' }],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-15T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    store = configureStore({
      reducer: { project: projectReducer },
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = store.getState().project;
      expect(state.projects).toEqual([]);
      expect(state.currentProject).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.filters).toEqual({});
      expect(state.pagination).toEqual({ page: 1, limit: 20, total: 0, totalPages: 0 });
    });
  });

  describe('Synchronous Actions', () => {
    describe('setFilters', () => {
      it('should set filters correctly', () => {
        const filters = { status: 'in_progress', search: 'kitchen' };
        store.dispatch(setFilters(filters));

        const state = store.getState().project;
        expect(state.filters).toEqual(filters);
      });
    });

    describe('clearFilters', () => {
      it('should clear all filters', () => {
        store.dispatch(setFilters({ status: 'in_progress', search: 'test' }));
        store.dispatch(clearFilters());

        const state = store.getState().project;
        expect(state.filters).toEqual({});
      });
    });

    describe('clearCurrentProject', () => {
      it('should clear current project', () => {
        store = configureStore({
          reducer: { project: projectReducer },
          preloadedState: {
            project: {
              projects: [],
              currentProject: mockProject,
              isLoading: false,
              error: null,
              filters: {},
              pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
            },
          },
        });

        store.dispatch(clearCurrentProject());

        const state = store.getState().project;
        expect(state.currentProject).toBeNull();
      });
    });

    describe('clearError', () => {
      it('should clear error state', () => {
        store = configureStore({
          reducer: { project: projectReducer },
          preloadedState: {
            project: {
              projects: [],
              currentProject: null,
              isLoading: false,
              error: 'Some error',
              filters: {},
              pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
            },
          },
        });

        store.dispatch(clearError());

        const state = store.getState().project;
        expect(state.error).toBeNull();
      });
    });
  });

  describe('Async Thunks', () => {
    describe('fetchProjects', () => {
      it('should fetch projects successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [mockProject],
              meta: { total: 1, page: 1, totalPages: 1 },
            }),
        });

        await store.dispatch(fetchProjects({ page: 1, limit: 20 }));

        const state = store.getState().project;
        expect(state.projects).toHaveLength(1);
        expect(state.projects[0]).toEqual(mockProject);
        expect(state.isLoading).toBe(false);
        expect(state.pagination.total).toBe(1);
      });

      it('should handle fetch projects failure', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Failed to fetch projects' }),
        });

        await store.dispatch(fetchProjects({ page: 1, limit: 20 }));

        const state = store.getState().project;
        expect(state.error).toBe('Failed to fetch projects');
        expect(state.isLoading).toBe(false);
      });

      it('should handle pagination correctly', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [mockProject],
              meta: { total: 50, page: 2, totalPages: 5 },
            }),
        });

        await store.dispatch(fetchProjects({ page: 2, limit: 10 }));

        const state = store.getState().project;
        expect(state.pagination.page).toBe(2);
        expect(state.pagination.total).toBe(50);
        expect(state.pagination.totalPages).toBe(5);
      });

      it('should apply filters when fetching', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [],
              meta: { total: 0, page: 1, totalPages: 0 },
            }),
        });

        await store.dispatch(
          fetchProjects({
            page: 1,
            limit: 20,
            filters: { status: 'in_progress', search: 'kitchen' },
          })
        );

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('status=in_progress'),
          expect.any(Object)
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('search=kitchen'),
          expect.any(Object)
        );
      });
    });

    describe('fetchProjectById', () => {
      it('should fetch single project successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockProject }),
        });

        await store.dispatch(fetchProjectById('project-123'));

        const state = store.getState().project;
        expect(state.currentProject).toEqual(mockProject);
        expect(state.isLoading).toBe(false);
      });

      it('should handle fetch project by ID failure', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Project not found' }),
        });

        await store.dispatch(fetchProjectById('non-existent-id'));

        const state = store.getState().project;
        expect(state.error).toBe('Project not found');
      });
    });

    describe('createProject', () => {
      it('should create project successfully', async () => {
        const newProject = { ...mockProject, id: 'new-project-123' };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: newProject }),
        });

        await store.dispatch(
          createProject({
            name: 'New Project',
            description: 'A new project',
          })
        );

        const state = store.getState().project;
        expect(state.projects).toContainEqual(newProject);
        expect(state.currentProject).toEqual(newProject);
      });

      it('should add new project to beginning of list', async () => {
        store = configureStore({
          reducer: { project: projectReducer },
          preloadedState: {
            project: {
              projects: [mockProject],
              currentProject: null,
              isLoading: false,
              error: null,
              filters: {},
              pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
            },
          },
        });

        const newProject = { ...mockProject, id: 'new-project-123', name: 'New Project' };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: newProject }),
        });

        await store.dispatch(createProject({ name: 'New Project' }));

        const state = store.getState().project;
        expect(state.projects[0]).toEqual(newProject);
        expect(state.projects).toHaveLength(2);
      });
    });

    describe('updateProject', () => {
      it('should update project successfully', async () => {
        store = configureStore({
          reducer: { project: projectReducer },
          preloadedState: {
            project: {
              projects: [mockProject],
              currentProject: mockProject,
              isLoading: false,
              error: null,
              filters: {},
              pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
            },
          },
        });

        const updatedProject = { ...mockProject, name: 'Updated Project Name' };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: updatedProject }),
        });

        await store.dispatch(
          updateProject({
            id: 'project-123',
            updates: { name: 'Updated Project Name' },
          })
        );

        const state = store.getState().project;
        expect(state.projects[0].name).toBe('Updated Project Name');
        expect(state.currentProject?.name).toBe('Updated Project Name');
      });

      it('should update project in list and current project', async () => {
        store = configureStore({
          reducer: { project: projectReducer },
          preloadedState: {
            project: {
              projects: [mockProject, { ...mockProject, id: 'project-456', name: 'Other Project' }],
              currentProject: mockProject,
              isLoading: false,
              error: null,
              filters: {},
              pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
            },
          },
        });

        const updatedProject = { ...mockProject, budget: 30000 };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: updatedProject }),
        });

        await store.dispatch(
          updateProject({
            id: 'project-123',
            updates: { budget: 30000 },
          })
        );

        const state = store.getState().project;
        expect(state.projects[0].budget).toBe(30000);
        expect(state.currentProject?.budget).toBe(30000);
      });
    });

    describe('deleteProject', () => {
      it('should delete project successfully', async () => {
        store = configureStore({
          reducer: { project: projectReducer },
          preloadedState: {
            project: {
              projects: [mockProject],
              currentProject: mockProject,
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

        await store.dispatch(deleteProject('project-123'));

        const state = store.getState().project;
        expect(state.projects).toHaveLength(0);
        expect(state.currentProject).toBeNull();
      });

      it('should only clear currentProject if it matches deleted project', async () => {
        const otherProject = { ...mockProject, id: 'project-456', name: 'Other Project' };

        store = configureStore({
          reducer: { project: projectReducer },
          preloadedState: {
            project: {
              projects: [mockProject, otherProject],
              currentProject: otherProject,
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

        await store.dispatch(deleteProject('project-123'));

        const state = store.getState().project;
        expect(state.projects).toHaveLength(1);
        expect(state.currentProject).toEqual(otherProject);
      });
    });

    describe('updateProjectStatus', () => {
      it('should update project status successfully', async () => {
        store = configureStore({
          reducer: { project: projectReducer },
          preloadedState: {
            project: {
              projects: [mockProject],
              currentProject: mockProject,
              isLoading: false,
              error: null,
              filters: {},
              pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
            },
          },
        });

        const updatedProject = { ...mockProject, status: 'completed' as const };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: updatedProject }),
        });

        await store.dispatch(
          updateProjectStatus({
            id: 'project-123',
            status: 'completed',
          })
        );

        const state = store.getState().project;
        expect(state.projects[0].status).toBe('completed');
        expect(state.currentProject?.status).toBe('completed');
      });

      it('should handle status transition from draft to active', async () => {
        const draftProject = { ...mockProject, status: 'draft' as const };

        store = configureStore({
          reducer: { project: projectReducer },
          preloadedState: {
            project: {
              projects: [draftProject],
              currentProject: draftProject,
              isLoading: false,
              error: null,
              filters: {},
              pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
            },
          },
        });

        const activatedProject = { ...draftProject, status: 'in_progress' as const };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: activatedProject }),
        });

        await store.dispatch(
          updateProjectStatus({
            id: 'project-123',
            status: 'in_progress',
          })
        );

        const state = store.getState().project;
        expect(state.projects[0].status).toBe('in_progress');
      });
    });
  });

  describe('Selectors', () => {
    const mockState = {
      project: {
        projects: [mockProject],
        currentProject: mockProject,
        isLoading: true,
        error: 'Some error',
        filters: { status: 'in_progress' },
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
    };

    it('selectProjects should return projects array', () => {
      expect(selectProjects(mockState)).toEqual([mockProject]);
    });

    it('selectCurrentProject should return current project', () => {
      expect(selectCurrentProject(mockState)).toEqual(mockProject);
    });

    it('selectProjectLoading should return loading state', () => {
      expect(selectProjectLoading(mockState)).toBe(true);
    });

    it('selectProjectError should return error state', () => {
      expect(selectProjectError(mockState)).toBe('Some error');
    });

    it('selectProjects should return empty array when no projects', () => {
      const emptyState = {
        project: {
          ...mockState.project,
          projects: [],
        },
      };
      expect(selectProjects(emptyState)).toEqual([]);
    });

    it('selectCurrentProject should return null when no current project', () => {
      const noCurrentState = {
        project: {
          ...mockState.project,
          currentProject: null,
        },
      };
      expect(selectCurrentProject(noCurrentState)).toBeNull();
    });
  });
});
