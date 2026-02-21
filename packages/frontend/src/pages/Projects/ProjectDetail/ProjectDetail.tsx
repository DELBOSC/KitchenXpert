import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CommentThread from '../../../components/projects/CommentThread';

interface Kitchen {
  id: string;
  name: string;
  style: string;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  status: 'draft' | 'designing' | 'finalized';
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
  kitchens: Kitchen[];
  budget?: {
    total: number;
    spent: number;
    currency: string;
  };
  owner: {
    id: string;
    name: string;
    email: string;
  };
}

const STATUS_KEYS: Record<string, string> = {
  draft: 'projects.status.draft',
  in_progress: 'projects.status.in_progress',
  designing: 'projects.status.designing',
  completed: 'projects.status.completed',
  archived: 'projects.status.archived',
};

const ProjectDetail: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    const controller = new AbortController();

    const fetchProject = async (): Promise<void> => {
      if (!projectId) {
        setError(t('projects.projectNotFound'));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/v1/projects/${projectId}`, { credentials: 'include', signal: controller.signal });

        if (!response.ok) {
          if (response.status === 404) {
            setNotFound(true);
            setIsLoading(false);
            return;
          }
          throw new Error(t('projects.fetchError'));
        }

        const data: Project = await response.json();
        setProject(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const errorMessage = err instanceof Error ? err.message : t('projects.fetchError');
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
    return () => controller.abort();
  }, [projectId, retryCount, t]);

  const handleDeleteProject = async (): Promise<void> => {
    if (!projectId) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/v1/projects/${projectId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!mountedRef.current) return;

      if (!response.ok) {
        throw new Error(t('projects.fetchError'));
      }

      navigate('/projects');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('projects.fetchError');
      setError(errorMessage);
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = (status: Project['status'] | Kitchen['status']): string => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      designing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      finalized: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      archived: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 dark:bg-gray-900">
        <div className="animate-pulse" role="status" aria-label={t('common.loading', 'Loading')}>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-8 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-6xl font-bold text-gray-300 dark:text-gray-600 mb-4">404</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{t('common.resourceNotFound', 'Resource not found')}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{t('common.resourceNotFoundDesc', 'The requested resource does not exist or has been deleted.')}</p>
          <button
            onClick={() => navigate('/projects')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('projects.backToProjects', 'Back to projects')}
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 dark:bg-gray-900">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md w-full">
          <h2 className="text-red-800 dark:text-red-400 text-lg font-semibold mb-2">{t('common.error')}</h2>
          <p className="text-red-600 dark:text-red-300">{error}</p>
          <div className="mt-4 flex gap-4">
            <button
              onClick={() => navigate('/projects')}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              {t('projects.backToProjects')}
            </button>
            <button
              onClick={() => { setError(null); setRetryCount((c) => c + 1); }}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              {t('common.tryAgain')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <li>
              <Link to="/projects" className="hover:text-blue-600 dark:hover:text-blue-400">
                {t('nav.projects')}
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-900 dark:text-white font-medium">{project.name}</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-700/30 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(project.status)}`}>
                  {t(STATUS_KEYS[project.status] ?? 'projects.status.draft')}
                </span>
              </div>
              <p className="mt-2 text-gray-600 dark:text-gray-300">{project.description || t('projects.noDescription')}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>{t('projects.created', { date: formatDate(project.createdAt) })}</span>
                <span>{t('projects.updated', { date: formatDate(project.updatedAt) })}</span>
                <span>{t('projects.owner', { name: project.owner.name })}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate(`/projects/${projectId}/edit`)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('projects.editProject')}
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>

          {/* Budget Info */}
          {project.budget && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('projects.budgetOverview')}</h3>
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(project.budget.spent, project.budget.currency)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('projects.spent', { total: formatCurrency(project.budget.total, project.budget.currency) })}
                  </p>
                </div>
                <div className="flex-1 max-w-xs">
                  <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${Math.min((project.budget.spent / project.budget.total) * 100, 100)}%` }}
                      role="progressbar"
                      aria-valuenow={Math.round(Math.min((project.budget.spent / project.budget.total) * 100, 100))}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={t('projects.budgetProgress', 'Budget progress')}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Kitchens Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-700/30 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('projects.kitchensSection', { count: project.kitchens.length })}
            </h2>
            <button
              onClick={() => navigate(`/projects/${projectId}/kitchens/create`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('projects.addKitchen')}
            </button>
          </div>

          {project.kitchens.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg">
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">{t('projects.noKitchens')}</h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400">{t('projects.noKitchensDesc')}</p>
              <button
                onClick={() => navigate(`/projects/${projectId}/kitchens/create`)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('projects.createKitchen')}
              </button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {project.kitchens.map((kitchen) => (
                <Link
                  key={kitchen.id}
                  to={`/projects/${projectId}/kitchens/${kitchen.id}`}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md dark:hover:shadow-gray-700/50 transition-all overflow-hidden group"
                >
                  <div className="h-40 bg-gray-100 dark:bg-gray-700 relative">
                    {kitchen.thumbnailUrl ? (
                      <img
                        src={kitchen.thumbnailUrl}
                        alt={kitchen.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
                        <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                        </svg>
                      </div>
                    )}
                    <span className={`absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(kitchen.status)}`}>
                      {t(STATUS_KEYS[kitchen.status] ?? 'projects.status.draft')}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {kitchen.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{kitchen.style}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      {t('project.dimensions', '{{width}}m x {{depth}}m x {{height}}m', { width: kitchen.dimensions.width, depth: kitchen.dimensions.depth, height: kitchen.dimensions.height })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={() => navigate(`/ai-generator?projectId=${projectId}`)}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-700/30 hover:shadow-md dark:hover:shadow-gray-700/50 transition-shadow text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{t('projects.aiGenerator')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('projects.aiGeneratorDesc')}</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate(`/vr-viewer?projectId=${projectId}`)}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-700/30 hover:shadow-md dark:hover:shadow-gray-700/50 transition-shadow text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{t('projects.vrViewer')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('projects.vrViewerDesc')}</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate(`/projects/${projectId}/export`)}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-700/30 hover:shadow-md dark:hover:shadow-gray-700/50 transition-shadow text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{t('projects.export')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('projects.exportDesc')}</p>
              </div>
            </div>
          </button>
        </div>
      </div>

        {/* Comments Section */}
        {projectId && <CommentThread projectId={projectId} />}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          onKeyDown={(e) => { if (e.key === 'Escape' && !isDeleting) setShowDeleteModal(false); }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full" ref={(el) => { if (el) { const btn = el.querySelector<HTMLElement>('button'); btn?.focus(); } }}>
            <h2 id="delete-modal-title" className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('projects.deleteConfirmTitle')}</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {t('projects.deleteConfirmMessage', { name: project.name })}
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={isDeleting}
                aria-busy={isDeleting}
                className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${isDeleting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {isDeleting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {isDeleting ? t('projects.deleting', 'Deleting...') : t('projects.deleteProject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
