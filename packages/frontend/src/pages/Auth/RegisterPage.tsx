import { Mail, Lock, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import AuthLayout from './AuthLayout';
import { SeoHead } from '../../components/seo/SeoHead';
import { Button, Input, Checkbox } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext';

type PasswordStrength = { score: 0 | 1 | 2 | 3 | 4; label: string; color: string };

function scorePassword(pw: string): PasswordStrength {
  let score = 0;
  if (pw.length >= 8) {score++;}
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) {score++;}
  if (/\d/.test(pw)) {score++;}
  if (/[^A-Za-z0-9]/.test(pw)) {score++;}
  const labels = ['Trop faible', 'Faible', 'Correct', 'Bon', 'Excellent'];
  const colors = ['bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-400'];
  return { score: score as PasswordStrength['score'], label: labels[score]!, color: colors[score]! };
}

export default function RegisterPage(): React.ReactElement {
  const { t } = useTranslation();
  const { register } = useAuth();
  const toast = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const strength = useMemo(() => scorePassword(password), [password]);

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!firstName) {next.firstName = 'Prénom requis';}
    if (!lastName) {next.lastName = 'Nom requis';}
    if (!email) {next.email = 'Email requis';}
    if (password.length < 8) {next.password = '8 caractères minimum';}
    if (password !== confirmPassword) {next.confirmPassword = 'Les mots de passe ne correspondent pas';}
    if (!acceptTerms) {next.terms = 'Vous devez accepter les CGV';}
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await register(email, password, firstName, lastName);
      toast.success(t('auth.registerSuccess', 'Compte créé'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de création';
      setErrors({ form: message });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SeoHead
        title="Créer un compte"
        description="Créez votre compte KitchenXpert gratuit en 15 secondes. Concevez des cuisines en 3D, comparez les fournisseurs, exportez vos devis."
        canonical="https://kitchenxpert.com/register"
      />
    <AuthLayout
      title="Créez votre espace"
      subtitle="Démarrez gratuitement. Mettez à niveau quand vous êtes prêt."
      footer={
        <>
          Déjà un compte ?{' '}
          <Link to="/login" className="font-medium text-white underline-offset-4 hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {errors.form && (
          <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {errors.form}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="text"
            label="Prénom"
            autoComplete="given-name"
            placeholder="Alex"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            error={errors.firstName}
            leftIcon={<UserIcon className="h-4 w-4" />}
            required
          />
          <Input
            type="text"
            label="Nom"
            autoComplete="family-name"
            placeholder="Dubois"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            error={errors.lastName}
            required
          />
        </div>

        <Input
          type="email"
          autoComplete="email"
          label="Email"
          placeholder="vous@exemple.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          leftIcon={<Mail className="h-4 w-4" />}
          required
        />

        <div>
          <Input
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            label="Mot de passe"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          {password && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${i < strength.score ? strength.color : 'bg-white/10'}`}
                  />
                ))}
              </div>
              <p className="mt-1 text-xs text-white/50">Force : {strength.label}</p>
            </div>
          )}
        </div>

        <Input
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          label="Confirmation"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
          leftIcon={<Lock className="h-4 w-4" />}
          required
        />

        <div className="pt-1">
          <Checkbox
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            label={
              <>
                J&apos;accepte les{' '}
                <Link to="/legal/cgv" className="underline hover:text-white">CGV</Link>
                {' '}et la{' '}
                <Link to="/legal/privacy" className="underline hover:text-white">politique de confidentialité</Link>.
              </>
            }
          />
          {errors.terms && <p className="mt-1 text-xs text-rose-400">{errors.terms}</p>}
        </div>

        <Button type="submit" loading={loading} fullWidth size="lg">
          Créer mon compte
        </Button>

        <p className="pt-2 text-center text-xs text-white/40">
          Essai gratuit · Aucune carte bancaire requise
        </p>
      </form>
    </AuthLayout>
    </>
  );
}
