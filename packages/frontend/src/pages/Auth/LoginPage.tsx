import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import AuthLayout from './AuthLayout';
import { SeoHead } from '../../components/seo/SeoHead';
import { Button, Input, Checkbox, Separator } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageProvider';

export default function LoginPage(): React.ReactElement {
  const { t } = useTranslation();
  const { login, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { withPrefix } = useLanguage();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [resetting, setResetting] = useState(false);

  // Escape hatch for a stuck session: a stale/expired cookie (e.g. after a JWT
  // secret rotation) makes the app see you as logged-out, so the Header shows no
  // logout — yet the dead httpOnly cookie lingers and blocks a clean login.
  // logout() hits the now-PUBLIC /auth/logout, which clears the cookie regardless
  // of token validity. See auth-routes.ts (optionalAuth).
  const handleResetSession = async (): Promise<void> => {
    setResetting(true);
    try {
      await logout();
      toast.success(
        t('auth.sessionReset', 'Session réinitialisée — vous pouvez vous reconnecter.')
      );
    } catch {
      toast.error(t('auth.sessionResetError', 'Échec de la réinitialisation de la session.'));
    } finally {
      setResetting(false);
    }
  };

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email) {
      next.email = t('auth.emailRequired', 'Email requis');
    }
    if (!password) {
      next.password = t('auth.passwordRequired', 'Mot de passe requis');
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await login(email, password);
      toast.success(t('auth.loginSuccess', 'Connexion réussie'));
      // returnTo (set by ProtectedRoute) sends the user back where they were before the
      // session died. Only accept a same-origin internal path (leading single '/') to
      // avoid an open-redirect; it is already locale-prefixed, so no withPrefix. Otherwise
      // land on /<lang>/dashboard (a bare /dashboard is read as a bad locale by
      // LocaleAwareShell).
      const raw = searchParams.get('returnTo');
      const returnTo = raw ? decodeURIComponent(raw) : null;
      const safe = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//');
      navigate(safe ? returnTo : withPrefix('/dashboard'));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('auth.loginError', 'Identifiants invalides');
      setErrors({ form: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SeoHead
        title="Connexion"
        description="Connectez-vous à KitchenXpert pour retrouver vos cuisines, devis et collaborations en cours."
        canonical="https://kitchenxpert.com/login"
      />
      <AuthLayout
        title={t('auth.welcomeBack', 'Bon retour parmi nous')}
        subtitle={t(
          'auth.loginSubtitle',
          'Connectez-vous pour retrouver vos projets et vos cuisines.'
        )}
        footer={
          <>
            {t('auth.noAccount', 'Pas encore de compte ?')}{' '}
            <Link
              to="/register"
              className="font-medium text-white underline-offset-4 hover:underline"
            >
              {t('auth.registerAction', 'Créer un compte')}
            </Link>
          </>
        }
      >
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {errors.form && (
            <div
              role="alert"
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200"
            >
              {errors.form}
            </div>
          )}

          <Input
            type="email"
            autoComplete="email"
            label={t('common.email', 'Email')}
            placeholder="vous@exemple.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) {
                setErrors((p) => ({ ...p, email: undefined }));
              }
            }}
            error={errors.email}
            leftIcon={<Mail className="h-4 w-4" />}
            required
          />

          <Input
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            label={t('common.password', 'Mot de passe')}
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) {
                setErrors((p) => ({ ...p, password: undefined }));
              }
            }}
            error={errors.password}
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="kx-focus rounded p-0.5 text-white/50 hover:text-white"
                aria-label={showPassword ? 'Masquer' : 'Afficher'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            required
          />

          <div className="flex items-center justify-between pt-1">
            <Checkbox
              label={t('auth.rememberMe', 'Se souvenir de moi')}
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <Link to="/forgot-password" className="text-sm text-white/70 hover:text-white">
              {t('auth.forgotPassword', 'Oublié ?')}
            </Link>
          </div>

          <Button type="submit" loading={loading} fullWidth size="lg">
            {t('auth.loginAction', 'Se connecter')}
          </Button>

          <Separator label={t('common.or', 'OU')} className="my-6" />

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              type="button"
              size="md"
              onClick={() => toast.info('SSO bientôt disponible')}
            >
              Google
            </Button>
            <Button
              variant="outline"
              type="button"
              size="md"
              onClick={() => toast.info('SSO bientôt disponible')}
            >
              Apple
            </Button>
          </div>

          {/* Stuck-session escape hatch — clears a stale cookie via public logout */}
          <button
            type="button"
            onClick={handleResetSession}
            disabled={resetting}
            className="mt-6 block w-full text-center text-xs text-white/40 transition-colors hover:text-white/70 disabled:opacity-50"
          >
            {t('auth.resetSession', 'Session bloquée ? Réinitialiser')}
          </button>
        </form>
      </AuthLayout>
    </>
  );
}
