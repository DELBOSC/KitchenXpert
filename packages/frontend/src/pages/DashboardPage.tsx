import { motion } from 'framer-motion';
import {
  Plus,
  FolderOpen,
  Library,
  UserCircle2,
  ArrowRight,
  TrendingUp,
  Clock,
  Euro,
  Layers,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { SandboxMigrationBanner } from '../components/sandbox/SandboxMigrationBanner';
import {
  Badge,
  Card,
  Container,
  EmptyState,
  ErrorState,
  PageHeader,
  Skeleton,
  fadeUp,
  stagger,
} from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchProjects,
  selectProjects,
  selectProjectLoading,
  type Project,
} from '../features/project/project-slice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getErrorMessage } from '../utils/error-handling';

const STATUS_TONE: Record<string, 'default' | 'info' | 'warning' | 'success'> = {
  draft: 'default',
  in_progress: 'info',
  review: 'warning',
  approved: 'info',
  completed: 'success',
  archived: 'default',
};

export default function DashboardPage(): React.ReactElement {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();

  const projects = useAppSelector(selectProjects);
  const isLoading = useAppSelector(selectProjectLoading);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setError(null);
    const promise = dispatch(fetchProjects({ page: 1, limit: 6 }));
    promise.unwrap().catch((err: unknown) => {
      setError(getErrorMessage(err, t('common.error')));
    });
    return () => {
      promise.abort();
    };
  }, [dispatch, retryCount, t]);

  const recent = projects.slice(0, 6);
  const stats = {
    projects: projects.length,
    inProgress: projects.filter((p) => p.status === 'active').length,
    completed: projects.filter((p) => p.status === 'completed').length,
    totalBudget: projects.reduce((acc, p) => acc + (p.budget || 0), 0),
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Container size="xl" className="py-10">
        {/* Surfaces a residual sandbox project — renders nothing if absent */}
        <SandboxMigrationBanner />

        <PageHeader
          title={
            <>
              Bonjour,{' '}
              <span className="bg-gradient-to-r from-indigo-300 to-fuchsia-300 bg-clip-text text-transparent">
                {user?.name?.split(' ')[0] || 'chez vous'}
              </span>
            </>
          }
          description="Voici où vous en êtes aujourd'hui."
          actions={
            <Link
              to="/designer"
              className="kx-focus inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-white/90"
            >
              <Plus className="h-4 w-4" />
              Nouveau design
            </Link>
          }
        />

        <StatsGrid stats={stats} loading={isLoading && recent.length === 0} />

        <section className="mt-10">
          <h2 className="mb-4 text-xs uppercase tracking-widest text-white/40">Accès rapides</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              icon={<Plus className="h-5 w-5" />}
              title="Nouveau design"
              desc="Créez une cuisine de zéro"
              to="/designer"
              accent="from-indigo-500/30"
            />
            <QuickAction
              icon={<FolderOpen className="h-5 w-5" />}
              title="Mes projets"
              desc="Reprendre où j'en étais"
              to="/projects"
              accent="from-fuchsia-500/30"
            />
            <QuickAction
              icon={<Library className="h-5 w-5" />}
              title="Catalogue"
              desc="Produits & marques"
              to="/catalog"
              accent="from-cyan-500/30"
            />
            <QuickAction
              icon={<UserCircle2 className="h-5 w-5" />}
              title="Profil"
              desc="Paramètres & compte"
              to="/profile"
              accent="from-emerald-500/30"
            />
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-widest text-white/40">Projets récents</h2>
            {recent.length > 0 && (
              <Link
                to="/projects"
                className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white"
              >
                Tout voir <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {error && !isLoading && (
            <ErrorState
              title="Impossible de charger vos projets"
              description={error}
              onRetry={() => setRetryCount((c) => c + 1)}
            />
          )}

          {isLoading && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-5">
                  <Skeleton className="mb-3 h-4 w-3/4" />
                  <Skeleton className="mb-4 h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </Card>
              ))}
            </div>
          )}

          {!isLoading && !error && recent.length === 0 && (
            <EmptyState
              icon={<Layers className="h-5 w-5" />}
              title="Aucun projet pour l'instant"
              description="Créez votre premier projet pour organiser vos cuisines et leurs versions."
              action={
                <Link
                  to="/projects/new"
                  className="kx-focus inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 hover:bg-white/90"
                >
                  <Plus className="h-4 w-4" /> Créer un projet
                </Link>
              }
            />
          )}

          {!isLoading && !error && recent.length > 0 && (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: stagger(0.05) } }}
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              {recent.map((project) => (
                <motion.div
                  key={project.id}
                  variants={{ hidden: fadeUp.initial, show: fadeUp.animate }}
                >
                  <ProjectCard project={project} t={t} language={i18n.language} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>
      </Container>
    </div>
  );
}

// ---------------------------------------------------------------------------
function StatsGrid({
  stats,
  loading,
}: {
  stats: { projects: number; inProgress: number; completed: number; totalBudget: number };
  loading: boolean;
}): React.ReactElement {
  const items = [
    { icon: <Layers className="h-4 w-4" />, label: 'Projets', value: stats.projects },
    { icon: <Clock className="h-4 w-4" />, label: 'En cours', value: stats.inProgress },
    { icon: <TrendingUp className="h-4 w-4" />, label: 'Terminés', value: stats.completed },
    {
      icon: <Euro className="h-4 w-4" />,
      label: 'Budget cumulé',
      value: new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(stats.totalBudget),
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} variant="elevated" className="p-5">
          <div className="flex items-center gap-2 text-white/50">
            {item.icon}
            <span className="text-xs uppercase tracking-wider">{item.label}</span>
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">
            {loading ? <Skeleton className="h-8 w-20" /> : item.value}
          </div>
        </Card>
      ))}
    </div>
  );
}

function QuickAction({
  icon,
  title,
  desc,
  to,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  to: string;
  accent: string;
}): React.ReactElement {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.06]"
    >
      <div
        className={`absolute -top-12 -right-12 h-28 w-28 rounded-full bg-gradient-to-br ${accent} to-transparent blur-2xl transition group-hover:scale-110`}
        aria-hidden
      />
      <div className="relative">
        <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white">
          {icon}
        </div>
        <div className="font-semibold">{title}</div>
        <div className="mt-0.5 text-sm text-white/50">{desc}</div>
      </div>
    </Link>
  );
}

function ProjectCard({
  project,
  t,
  language,
}: {
  project: Project;
  t: (k: string) => string;
  language: string;
}): React.ReactElement {
  const tone = STATUS_TONE[project.status] ?? 'default';
  const dateStr = new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(project.updatedAt));

  return (
    <Link
      to={`/projects/${project.id}`}
      className="group block rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.05]"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="line-clamp-1 text-sm font-semibold text-white group-hover:text-white">
          {project.name}
        </h3>
        <Badge variant={tone} dot>
          {t(`project.status.${project.status}`)}
        </Badge>
      </div>
      {project.description && (
        <p className="mb-4 line-clamp-2 text-xs text-white/50">{project.description}</p>
      )}
      <div className="flex items-center justify-between text-xs text-white/40">
        <span>{dateStr}</span>
        {!!project.budget && project.budget > 0 && (
          <span className="font-medium text-white/80">
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
