import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchProjects,
  selectProjects,
  selectProjectLoading,
  selectProjectError,
  type Project,
} from '../features/project/project-slice';
import { getErrorMessage } from '../utils/error-handling';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  review: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  archived: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

export default function DashboardPage(): React.ReactElement {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();

  const projects = useAppSelector(selectProjects);
  const isLoading = useAppSelector(selectProjectLoading);
  const reduxError = useAppSelector(selectProjectError);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setError(null);
    const promise = dispatch(fetchProjects({ page: 1, limit: 5 }));
    promise.unwrap().catch((err: unknown) => {
      const message = getErrorMessage(err, t('common.error'));
      setError(message);
    });
    return () => {
      promise.abort();
    };
  }, [dispatch, retryCount, t]);

  const recentProjects = projects.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('dashboard.greeting', { name: user?.name || t('dashboard.defaultUser') })} <span role="img" aria-hidden="true">👋</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('dashboard.welcome')}
          </p>
        </header>

        {/* Quick Actions */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('dashboard.quickActions')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickActionCard
              title={t('dashboard.newDesign')}
              description={t('dashboard.newDesignDesc')}
              href="/designer"
              icon="+"
            />
            <QuickActionCard
              title={t('dashboard.myProjects')}
              description={t('dashboard.myProjectsDesc')}
              href="/projects"
              icon="📁"
            />
            <QuickActionCard
              title={t('dashboard.catalog')}
              description={t('dashboard.catalogDesc')}
              href="/catalog"
              icon="📚"
            />
            <QuickActionCard
              title={t('dashboard.profileCard')}
              description={t('dashboard.profileCardDesc')}
              href="/profile"
              icon="👤"
            />
          </div>
        </section>

        {/* Recent Projects */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('dashboard.recentProjects')}
            </h2>
            {recentProjects.length > 0 && (
              <Link to="/projects" className="text-blue-600 hover:underline dark:text-blue-400 text-sm">
                {t('dashboard.viewAll')}
              </Link>
            )}
          </div>

          {/* Error */}
          {error && !isLoading && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center mb-4" role="alert">
              <p className="text-red-600 dark:text-red-400 mb-3">{t('common.error')}: {error}</p>
              <button
                onClick={() => setRetryCount((c) => c + 1)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                {t('common.retry')}
              </button>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 animate-pulse" aria-hidden="true">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                </div>
              ))}
            </div>
          )}

          {/* Projects List */}
          {!isLoading && !error && recentProjects.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentProjects.map((project) => (
                <ProjectCard key={project.id} project={project} t={t} language={i18n.language} />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && recentProjects.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                {t('dashboard.noProjects')}{' '}
                <Link to="/projects/new" className="text-blue-600 hover:underline dark:text-blue-400">
                  {t('dashboard.createFirstDesign')}
                </Link>
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function QuickActionCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
}): React.ReactElement {
  return (
    <Link
      to={href}
      className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow hover:shadow-lg dark:hover:bg-gray-700 transition-shadow"
    >
      <div className="text-3xl mb-3"><span role="img" aria-hidden="true">{icon}</span></div>
      <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </Link>
  );
}

function ProjectCard({
  project,
  t,
  language,
}: {
  project: Project;
  t: (key: string, opts?: Record<string, unknown>) => string;
  language: string;
}): React.ReactElement {
  const statusClass = STATUS_COLORS[project.status] || STATUS_COLORS.draft;
  const dateStr = new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(project.updatedAt));

  return (
    <Link
      to={`/projects/${project.id}`}
      className="bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-lg dark:hover:bg-gray-700 transition-shadow p-5 block"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1">
          {project.name}
        </h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ml-2 ${statusClass}`}>
          {t(`project.status.${project.status}`)}
        </span>
      </div>
      {project.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
          {project.description}
        </p>
      )}
      <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
        <span>{dateStr}</span>
        {project.budget !== undefined && project.budget > 0 && (
          <span className="font-medium text-gray-600 dark:text-gray-300">
            {new Intl.NumberFormat(language, {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0,
            }).format(project.budget)}
          </span>
        )}
      </div>
    </Link>
  );
}
