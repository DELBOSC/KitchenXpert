import { KeyRound, LogOut, Shield, Mail, Phone, Check } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Avatar, Badge, Button, Card, CardBody, CardHeader, CardTitle, CardDescription,
  Container, Dialog, Input, PageHeader, Select, Skeleton, Switch,
} from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';

interface Preferences {
  language?: string;
  theme?: string;
  currency?: string;
  notifications?: boolean;
}

export default function ProfilePage(): React.ReactElement {
  const { user, logout, updateUser } = useAuth();
  const toast = useToast();
  const mountedRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [preferences, setPreferences] = useState<Preferences>({ language: 'fr', theme: 'system', currency: 'EUR', notifications: true });
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [showPwModal, setShowPwModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();

    void (async () => {
      try {
        const [profileRes, prefRes] = await Promise.allSettled([
          fetch('/api/v1/users/me', { credentials: 'include', signal: controller.signal }),
          fetch('/api/v1/users/me/preferences', { credentials: 'include', signal: controller.signal }),
        ]);
        if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
          const data = await profileRes.value.json();
          if (mountedRef.current && data.data) {
            setFirstName(data.data.firstName || '');
            setLastName(data.data.lastName || '');
            setPhone(data.data.phone || '');
          }
        }
        if (prefRes.status === 'fulfilled' && prefRes.value.ok) {
          const data = await prefRes.value.json();
          if (mountedRef.current && data.data) {setPreferences(data.data);}
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {toast.error('Impossible de charger le profil');}
      } finally {
        if (mountedRef.current) {setLoading(false);}
      }
    })();

    return () => { mountedRef.current = false; controller.abort(); };
  }, [toast]);

  const saveProfile = async (): Promise<void> => {
    setSavingProfile(true);
    try {
      await updateUser({ name: `${firstName} ${lastName}`.trim() });
      const res = await fetch('/api/v1/users/me', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, phone }),
      });
      if (!res.ok) {throw new Error('Échec de la mise à jour');}
      toast.success('Profil mis à jour');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      if (mountedRef.current) {setSavingProfile(false);}
    }
  };

  const savePreferences = async (): Promise<void> => {
    setSavingPrefs(true);
    try {
      const res = await fetch('/api/v1/users/me/preferences', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });
      if (!res.ok) {throw new Error('Échec de la mise à jour');}
      toast.success('Préférences enregistrées');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      if (mountedRef.current) {setSavingPrefs(false);}
    }
  };

  const changePassword = async (): Promise<void> => {
    if (newPassword !== confirmPassword) {return toast.error('Les mots de passe ne correspondent pas');}
    if (newPassword.length < 8) {return toast.error('8 caractères minimum');}
    setChangingPw(true);
    try {
      const res = await fetch('/api/v1/auth/password/change', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {throw new Error('Mot de passe actuel incorrect');}
      setShowPwModal(false);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      toast.success('Mot de passe modifié');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      if (mountedRef.current) {setChangingPw(false);}
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <Container size="md" className="py-10">
          <Skeleton className="mb-4 h-10 w-1/3" />
          <Skeleton className="mb-8 h-4 w-2/3" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="mb-4 h-40 w-full" />
          ))}
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Container size="md" className="py-10">
        <PageHeader
          title="Mon profil"
          description="Gérez vos informations, vos préférences et votre sécurité."
        />

        {/* Identity card */}
        <Card variant="elevated" className="mb-6 p-6">
          <div className="flex items-center gap-4">
            <Avatar name={`${firstName} ${lastName}`.trim() || user?.email} size="xl" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-semibold">
                {`${firstName} ${lastName}`.trim() || user?.email}
              </h2>
              <div className="mt-1 flex items-center gap-2 text-sm text-white/60">
                <Mail className="h-3.5 w-3.5" /> {user?.email}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="success" dot>Compte vérifié</Badge>
                <Badge variant="info">{user?.role || 'user'}</Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Personal info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
            <CardDescription>Ces informations apparaissent sur vos devis.</CardDescription>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <Input label="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <Input label="Téléphone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} leftIcon={<Phone className="h-4 w-4" />} placeholder="+33 6 12 34 56 78" />
            <div className="flex justify-end">
              <Button onClick={saveProfile} loading={savingProfile} leftIcon={<Check className="h-4 w-4" />}>
                Enregistrer
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Preferences */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Préférences</CardTitle>
            <CardDescription>Langue, thème, devise et notifications.</CardDescription>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Select label="Langue" value={preferences.language ?? 'fr'} onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}>
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="de">Deutsch</option>
              </Select>
              <Select label="Thème" value={preferences.theme ?? 'system'} onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })}>
                <option value="system">Système</option>
                <option value="light">Clair</option>
                <option value="dark">Sombre</option>
              </Select>
              <Select label="Devise" value={preferences.currency ?? 'EUR'} onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
              </Select>
            </div>
            <Switch
              label="Notifications par email"
              description="Mises à jour de vos projets, devis reçus, alertes prix."
              checked={!!preferences.notifications}
              onChange={(e) => setPreferences({ ...preferences, notifications: e.target.checked })}
            />
            <div className="flex justify-end">
              <Button onClick={savePreferences} loading={savingPrefs} leftIcon={<Check className="h-4 w-4" />}>
                Enregistrer
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Security */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sécurité</CardTitle>
            <CardDescription>Mot de passe et accès à votre compte.</CardDescription>
          </CardHeader>
          <CardBody className="space-y-3">
            <Button variant="outline" onClick={() => setShowPwModal(true)} leftIcon={<KeyRound className="h-4 w-4" />}>
              Changer mon mot de passe
            </Button>
            <Link
              to="/legal/privacy-settings"
              className="kx-focus inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
            >
              <Shield className="h-4 w-4" />
              Mes données & RGPD
            </Link>
          </CardBody>
        </Card>

        {/* Logout */}
        <div className="flex justify-end pt-4">
          <Button variant="danger" onClick={logout} leftIcon={<LogOut className="h-4 w-4" />}>
            Se déconnecter
          </Button>
        </div>
      </Container>

      <Dialog
        open={showPwModal}
        onClose={() => setShowPwModal(false)}
        title="Changer de mot de passe"
        description="Votre mot de passe actuel est requis pour confirmer l'opération."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowPwModal(false)}>Annuler</Button>
            <Button onClick={changePassword} loading={changingPw} disabled={!currentPassword || !newPassword || !confirmPassword}>
              Modifier
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input type="password" label="Mot de passe actuel" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          <Input type="password" label="Nouveau mot de passe" description="8 caractères minimum" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <Input type="password" label="Confirmation" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </div>
      </Dialog>
    </div>
  );
}
