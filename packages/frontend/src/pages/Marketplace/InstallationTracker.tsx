import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Milestone {
  name: string;
  description?: string;
  date: string;
  photos: string[];
  status: string;
}

interface InstallerInfo {
  id: string;
  userId?: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  specialties: string[];
  certifications: string[];
}

interface InstallationProject {
  id: string;
  installerId: string;
  userId: string;
  kitchenId?: string;
  projectId?: string;
  status: string;
  estimatedCost?: number;
  finalCost?: number;
  startDate?: string;
  endDate?: string;
  milestones: Milestone[];
  notes?: string;
  dxfFileUrl?: string;
  bomFileUrl?: string;
  createdAt: string;
  updatedAt: string;
  installer: InstallerInfo;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_ORDER = ['pending', 'accepted', 'in_progress', 'completed'];

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  accepted: 'Accepte',
  in_progress: 'En cours',
  completed: 'Termine',
  cancelled: 'Annule',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  accepted: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  in_progress: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
  completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function InstallationTracker(): React.ReactElement {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Data state
  const [project, setProject] = useState<InstallationProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Is current user the installer?
  const [isInstallerView, setIsInstallerView] = useState(false);

  // Status update
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Milestone form
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [milestoneName, setMilestoneName] = useState('');
  const [milestoneDescription, setMilestoneDescription] = useState('');
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [milestoneError, setMilestoneError] = useState<string | null>(null);

  // ─── Fetch Project ─────────────────────────────────────────────────────────

  const fetchProject = useCallback(
    async (controller: AbortController) => {
      if (!id) {
        return;
      }
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/v1/installers/projects/${id}`, {
          credentials: 'include',
          signal: controller.signal,
        });

        if (!response.ok) {
          if (response.status === 404) {
            setError(t('tracker.projectNotFound', "Projet d'installation introuvable"));
          } else if (response.status === 403) {
            setError(t('tracker.accessDenied', 'Acces refuse'));
          } else {
            throw new Error(t('tracker.loadError', 'Erreur lors du chargement'));
          }
          return;
        }

        const result = (await response.json()) as { data: InstallationProject };
        const proj = result.data;
        setProject(proj);

        // Determine if current user is the installer
        // The API includes installer.userId; we check against the authenticated user by
        // checking if installer.userId is truthy (the backend only returns this if the user
        // is the installer or admin). A simpler heuristic: the project.userId is the requester.
        // If the current user is NOT the requester, they must be the installer.
        // Since we don't have direct access to userId here, we rely on the backend
        // returning installer.userId. If it matches something, we mark installer view.
        setIsInstallerView(proj.installer.userId !== undefined && proj.installer.userId !== null);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        const message =
          err instanceof Error ? err.message : t('tracker.loadError', 'Erreur lors du chargement');
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [id, t]
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchProject(controller);
    return () => controller.abort();
  }, [fetchProject, retryCount]);

  // ─── Update Project Status ─────────────────────────────────────────────────

  const handleStatusUpdate = async (newStatus: string): Promise<void> => {
    if (!id) {
      return;
    }
    setIsUpdating(true);
    setUpdateError(null);

    try {
      const response = await fetch(`/api/v1/installers/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error || t('tracker.updateError', 'Erreur lors de la mise a jour'));
      }

      setRetryCount((c) => c + 1); // Refresh
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t('tracker.updateError', 'Erreur lors de la mise a jour');
      setUpdateError(message);
    } finally {
      setIsUpdating(false);
    }
  };

  // ─── Add Milestone ─────────────────────────────────────────────────────────

  const handleAddMilestone = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!id || !milestoneName.trim()) {
      return;
    }

    setIsAddingMilestone(true);
    setMilestoneError(null);

    try {
      const body: Record<string, string> = {
        name: milestoneName.trim(),
      };
      if (milestoneDescription.trim()) {
        body.description = milestoneDescription.trim();
      }

      const response = await fetch(`/api/v1/installers/projects/${id}/milestone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error || t('tracker.milestoneError', "Erreur lors de l'ajout"));
      }

      setMilestoneName('');
      setMilestoneDescription('');
      setShowMilestoneForm(false);
      setRetryCount((c) => c + 1); // Refresh
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('tracker.milestoneError', "Erreur lors de l'ajout");
      setMilestoneError(message);
    } finally {
      setIsAddingMilestone(false);
    }
  };

  // ─── Status Stepper ────────────────────────────────────────────────────────

  const renderStatusStepper = (currentStatus: string): React.ReactElement => {
    const currentIndex = STATUS_ORDER.indexOf(currentStatus);
    const isCancelled = currentStatus === 'cancelled';

    return (
      <div className="flex items-center justify-between mb-8">
        {STATUS_ORDER.map((status, index) => {
          const isActive = index <= currentIndex && !isCancelled;
          const isCurrent = index === currentIndex && !isCancelled;

          return (
            <React.Fragment key={status}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  } ${isCurrent ? 'ring-4 ring-blue-200 dark:ring-blue-900' : ''}`}
                >
                  {isActive ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-medium text-center ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {t(`tracker.status.${status}`, STATUS_LABELS[status] ?? status)}
                </span>
              </div>
              {index < STATUS_ORDER.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 rounded ${
                    index < currentIndex && !isCancelled
                      ? 'bg-blue-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 space-y-4">
              <div className="flex justify-between">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 space-y-4">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────────────

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">
              {error || t('tracker.projectNotFound', "Projet d'installation introuvable")}
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => navigate('/marketplace')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {t('common.back', 'Retour')}
              </button>
              <button
                onClick={() => setRetryCount((c) => c + 1)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t('common.retry', 'Reessayer')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const milestones = project.milestones || [];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/marketplace')}
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t('common.back', 'Retour')}
        </button>

        {/* Header */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t('tracker.title', "Suivi d'installation")}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {t('tracker.installer', 'Installateur')}:{' '}
                <span className="font-medium text-gray-900 dark:text-white">
                  {project.installer.companyName}
                </span>{' '}
                ({project.installer.contactName})
              </p>
              {project.kitchenId && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {t('tracker.kitchenId', 'Cuisine')}: {project.kitchenId}
                </p>
              )}
            </div>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                STATUS_COLORS[project.status] || STATUS_COLORS.pending
              }`}
            >
              {t(
                `tracker.status.${project.status}`,
                STATUS_LABELS[project.status] || project.status
              )}
            </span>
          </div>

          {/* Status Stepper */}
          {project.status !== 'cancelled' && renderStatusStepper(project.status)}

          {/* Cancelled notice */}
          {project.status === 'cancelled' && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm mb-4">
              {t('tracker.cancelled', 'Ce projet a ete annule.')}
            </div>
          )}

          {/* Installer Actions */}
          {isInstallerView && project.status !== 'completed' && project.status !== 'cancelled' && (
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              {project.status === 'pending' && (
                <button
                  onClick={() => handleStatusUpdate('accepted')}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                >
                  {t('tracker.accept', 'Accepter')}
                </button>
              )}
              {project.status === 'accepted' && (
                <button
                  onClick={() => handleStatusUpdate('in_progress')}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
                >
                  {t('tracker.startWork', 'Demarrer les travaux')}
                </button>
              )}
              {project.status === 'in_progress' && (
                <button
                  onClick={() => handleStatusUpdate('completed')}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                >
                  {t('tracker.markCompleted', 'Marquer comme termine')}
                </button>
              )}
              <button
                onClick={() => handleStatusUpdate('cancelled')}
                disabled={isUpdating}
                className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 text-sm font-medium"
              >
                {t('tracker.cancel', 'Annuler')}
              </button>
            </div>
          )}

          {updateError && (
            <p className="text-red-600 dark:text-red-400 text-sm mt-3">{updateError}</p>
          )}
        </section>

        {/* Milestones Timeline */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 sm:p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('tracker.milestones', 'Jalons du projet')}
            </h2>
            {isInstallerView &&
              project.status !== 'completed' &&
              project.status !== 'cancelled' && (
                <button
                  onClick={() => setShowMilestoneForm(!showMilestoneForm)}
                  className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {showMilestoneForm
                    ? t('common.cancel', 'Annuler')
                    : t('tracker.addMilestone', 'Ajouter un jalon')}
                </button>
              )}
          </div>

          {/* Milestone Form */}
          {showMilestoneForm && (
            <form
              onSubmit={handleAddMilestone}
              className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              <div className="mb-3">
                <label
                  htmlFor="milestoneName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  {t('tracker.milestoneName', 'Nom du jalon')} *
                </label>
                <input
                  id="milestoneName"
                  type="text"
                  value={milestoneName}
                  onChange={(e) => setMilestoneName(e.target.value)}
                  required
                  maxLength={200}
                  placeholder={t(
                    'tracker.milestoneNamePlaceholder',
                    'Ex: Demontage des anciens meubles'
                  )}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div className="mb-3">
                <label
                  htmlFor="milestoneDesc"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  {t('tracker.milestoneDescription', 'Description (optionnel)')}
                </label>
                <textarea
                  id="milestoneDesc"
                  value={milestoneDescription}
                  onChange={(e) => setMilestoneDescription(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white resize-y"
                />
              </div>
              {milestoneError && (
                <p className="text-red-600 dark:text-red-400 text-sm mb-3">{milestoneError}</p>
              )}
              <button
                type="submit"
                disabled={isAddingMilestone || !milestoneName.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
              >
                {isAddingMilestone
                  ? t('common.submitting', 'Ajout en cours...')
                  : t('tracker.submitMilestone', 'Ajouter le jalon')}
              </button>
            </form>
          )}

          {/* Timeline */}
          {milestones.length > 0 ? (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

              <div className="space-y-6">
                {milestones.map((milestone, index) => (
                  <div key={index} className="relative pl-12">
                    {/* Dot */}
                    <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-blue-100 dark:ring-blue-900/50" />

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                          {milestone.name}
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-4">
                          {new Date(milestone.date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      {milestone.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {milestone.description}
                        </p>
                      )}
                      {milestone.photos && milestone.photos.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {milestone.photos.map((photo, pIdx) => (
                            <a
                              key={pIdx}
                              href={photo}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-16 h-16 rounded overflow-hidden bg-gray-200 dark:bg-gray-600"
                            >
                              <img
                                src={photo}
                                alt={`${t('tracker.milestonePhoto', 'Photo')} ${pIdx + 1}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {t('tracker.noMilestones', 'Aucun jalon enregistre pour le moment.')}
            </p>
          )}
        </section>

        {/* Cost Section */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('tracker.costs', 'Couts')}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {t('tracker.estimatedCost', 'Cout estime')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {project.estimatedCost != null
                  ? new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                    }).format(project.estimatedCost)
                  : '--'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {t('tracker.finalCost', 'Cout final')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {project.finalCost != null
                  ? new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                    }).format(project.finalCost)
                  : '--'}
              </p>
            </div>
          </div>
        </section>

        {/* Files Section */}
        {(project.dxfFileUrl || project.bomFileUrl) && (
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 sm:p-8 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('tracker.files', 'Fichiers')}
            </h2>
            <div className="flex flex-wrap gap-4">
              {project.dxfFileUrl && (
                <a
                  href={project.dxfFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                  {t('tracker.downloadDxf', 'Telecharger DXF')}
                </a>
              )}
              {project.bomFileUrl && (
                <a
                  href={project.bomFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                  {t('tracker.downloadBom', 'Telecharger BOM')}
                </a>
              )}
            </div>
          </section>
        )}

        {/* Notes Section */}
        {project.notes && (
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 sm:p-8 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              {t('tracker.notes', 'Notes')}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line text-sm">
              {project.notes}
            </p>
          </section>
        )}

        {/* Dates */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('tracker.dates', 'Dates')}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {t('tracker.createdAt', 'Demande le')}
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date(project.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            {project.startDate && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t('tracker.startDate', 'Debut des travaux')}
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(project.startDate).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            )}
            {project.endDate && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t('tracker.endDate', 'Fin des travaux')}
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(project.endDate).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {t('tracker.lastUpdated', 'Derniere mise a jour')}
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date(project.updatedAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
