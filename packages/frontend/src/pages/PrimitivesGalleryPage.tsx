import { Check, Inbox, Search } from 'lucide-react';
import React from 'react';

import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  CardFooter,
} from '../components/ui/Card';
import { Container } from '../components/ui/Container';
import { EmptyState, ErrorState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Select } from '../components/ui/Select';
import { Separator } from '../components/ui/Separator';
import { Skeleton, SkeletonText } from '../components/ui/Skeleton';
import { Textarea } from '../components/ui/Textarea';
import { Tooltip } from '../components/ui/Tooltip';

/**
 * Dev-only visual-regression gallery for the UI primitives.
 *
 * Renders every Button / Card / Input variant statically so the Playwright
 * visual-regression suite can screenshot each primitive in isolation — the
 * safety net that lets us later swap `cn()` for tailwind-merge with automatic
 * proof (see CLAUDE.md §11 P2 "cn()→tailwind-merge").
 *
 * ⚠️ DETERMINISM CONTRACT (do not break):
 *   - Zero data, zero async, zero randomness/Date — a screenshot must be
 *     byte-stable across runs.
 *   - NEVER wrap cells in a framer-motion mount animation (`fadeUp`/`scaleIn`):
 *     those are JS-driven and are NOT frozen by Playwright's
 *     `animations: 'disabled'` (CSS-only) → they would flake the capture. The
 *     primitives' own `whileHover`/`whileTap` are interaction-triggered and stay
 *     static while unhovered, so they are safe.
 *
 * This route is registered ONLY when `import.meta.env.VITE_DEV_GALLERY` is set
 * at build time (see router.tsx). Vercel prod builds omit the flag → the route
 * is tree-shaken out and never exposed.
 */

const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost', 'danger', 'outline'] as const;
const BUTTON_SIZES = ['sm', 'md', 'lg'] as const;
const CARD_VARIANTS = ['default', 'elevated', 'interactive', 'glass'] as const;
const BADGE_VARIANTS = ['default', 'success', 'warning', 'danger', 'info', 'outline'] as const;
const AVATAR_SIZES = ['sm', 'md', 'lg'] as const;

function Cell({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex flex-col items-start gap-2">
      <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">{label}</span>
      {children}
    </div>
  );
}

export function PrimitivesGalleryPage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-[#0a0a0f] px-10 py-10 text-white">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">Primitives — visual gallery</h1>

      {/* ============================ BUTTON ============================ */}
      <section id="gallery-button" className="mb-14">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-white/50">Button</h2>

        <div className="flex flex-col gap-6">
          {BUTTON_VARIANTS.map((variant) => (
            <div key={variant} className="flex flex-wrap items-center gap-4">
              {BUTTON_SIZES.map((size) => (
                <Button key={size} variant={variant} size={size}>
                  {variant} / {size}
                </Button>
              ))}
              <Button variant={variant} size="icon" aria-label={`${variant} icon`}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {/* States */}
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="primary" loading>
              loading
            </Button>
            <Button variant="primary" disabled>
              disabled
            </Button>
            <Button variant="primary" leftIcon={<Check className="h-4 w-4" />}>
              leftIcon
            </Button>
            <Button variant="primary" rightIcon={<Check className="h-4 w-4" />}>
              rightIcon
            </Button>
          </div>
          <div className="w-80">
            <Button variant="primary" fullWidth>
              fullWidth
            </Button>
          </div>
        </div>
      </section>

      {/* ============================= CARD ============================= */}
      <section id="gallery-card" className="mb-14">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-white/50">Card</h2>

        <div className="grid grid-cols-2 gap-6">
          {CARD_VARIANTS.map((variant) => (
            <Cell key={variant} label={variant}>
              <Card variant={variant} className="w-full p-5">
                <div className="text-sm font-medium text-white">Card «{variant}»</div>
                <div className="mt-1 text-xs text-white/60">Surface primitive, variant {variant}.</div>
              </Card>
            </Cell>
          ))}

          <Cell label="composition">
            <Card variant="elevated" className="w-full">
              <CardHeader>
                <CardTitle>Composition</CardTitle>
                <CardDescription>Header · Title · Description · Body · Footer.</CardDescription>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-white/70">Corps de la carte composée.</p>
              </CardBody>
              <CardFooter>
                <Button variant="ghost" size="sm">
                  Annuler
                </Button>
                <Button variant="primary" size="sm">
                  Valider
                </Button>
              </CardFooter>
            </Card>
          </Cell>
        </div>
      </section>

      {/* ============================ INPUT ============================= */}
      <section id="gallery-input" className="mb-14">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-white/50">
          Input · Select · Textarea
        </h2>

        <div className="grid max-w-4xl grid-cols-2 gap-6">
          <Cell label="input default">
            <Input placeholder="Placeholder" defaultValue="" />
          </Cell>
          <Cell label="input + label">
            <Input label="Libellé" placeholder="Avec label" />
          </Cell>
          <Cell label="input error">
            <Input label="Email" error="Adresse invalide" defaultValue="pas-un-email" />
          </Cell>
          <Cell label="input disabled">
            <Input label="Verrouillé" defaultValue="Non éditable" disabled />
          </Cell>
          <Cell label="input leftIcon">
            <Input leftIcon={<Search className="h-4 w-4" />} placeholder="Rechercher" />
          </Cell>
          <Cell label="input rightIcon">
            <Input rightIcon={<Check className="h-4 w-4" />} placeholder="Validé" />
          </Cell>

          <Cell label="select default">
            <Select label="Tri" defaultValue="a">
              <option value="a">Option A</option>
              <option value="b">Option B</option>
            </Select>
          </Cell>
          <Cell label="select error">
            <Select error="Choix requis" defaultValue="a">
              <option value="a">Option A</option>
              <option value="b">Option B</option>
            </Select>
          </Cell>

          <Cell label="textarea default">
            <Textarea label="Notes" placeholder="Votre message" />
          </Cell>
          <Cell label="textarea error">
            <Textarea error="Champ requis" defaultValue="Trop court" />
          </Cell>
        </div>
      </section>

      {/* ============================= MISC ============================= */}
      <section id="gallery-misc" className="mb-14">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-white/50">
          Badge · Avatar · Separator · Skeleton · EmptyState · Label · Container
        </h2>

        <div className="flex flex-col gap-8">
          {/* Badge — 6 variants */}
          <Cell label="badge">
            <div className="flex flex-wrap items-center gap-3">
              {BADGE_VARIANTS.map((variant) => (
                <Badge key={variant} variant={variant}>
                  {variant}
                </Badge>
              ))}
            </div>
          </Cell>

          {/* Avatar — initials fallback (never a src image: network = non-deterministic) */}
          <Cell label="avatar">
            <div className="flex items-center gap-4">
              {AVATAR_SIZES.map((size) => (
                <Avatar key={size} name="Jean Dupont" size={size} />
              ))}
            </div>
          </Cell>

          {/* Separator — horizontal / vertical / labeled */}
          <Cell label="separator">
            <div className="flex w-full max-w-md flex-col gap-4">
              <Separator />
              <div className="flex h-10 items-center gap-4">
                <span className="text-sm text-white/60">gauche</span>
                <Separator orientation="vertical" />
                <span className="text-sm text-white/60">droite</span>
              </div>
              <Separator label="OU" />
            </div>
          </Cell>

          {/* Skeleton — block ×2 + SkeletonText (shimmer frozen by settle()) */}
          <Cell label="skeleton">
            <div className="flex w-full max-w-md flex-col gap-4">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-24 w-full" />
              <SkeletonText lines={3} />
            </div>
          </Cell>

          {/* EmptyState + ErrorState */}
          <div className="grid grid-cols-2 gap-6">
            <Cell label="emptyState">
              <EmptyState
                icon={<Inbox className="h-8 w-8" />}
                title="Aucun projet"
                description="Créez votre première cuisine pour commencer."
                action={
                  <Button variant="primary" size="sm">
                    Nouveau projet
                  </Button>
                }
              />
            </Cell>
            <Cell label="errorState">
              <ErrorState description="Impossible de charger les données." onRetry={() => undefined} />
            </Cell>
          </div>

          {/* Label — default + required */}
          <Cell label="label">
            <div className="flex items-center gap-6">
              <Label>Libellé simple</Label>
              <Label required>Champ requis</Label>
            </div>
          </Cell>

          {/* Container — bg visible to show padding + max-width */}
          <Cell label="container (size=md)">
            <div className="w-full bg-white/[0.02]">
              <Container size="md" className="bg-white/[0.06] py-4">
                <span className="text-sm text-white/70">Container size=md · px-6 · max-w-5xl</span>
              </Container>
            </div>
          </Cell>
        </div>
      </section>

      {/* =========================== TOOLTIP =========================== */}
      {/* Isolated: the bubble is hover-gated (no `open` prop). The spec hovers
          the trigger and waits for the bubble before screenshotting. Generous
          padding + side="bottom" keeps the bubble inside the section's box. */}
      <section id="gallery-tooltip" className="mb-14 p-16">
        <h2 className="mb-8 text-sm font-semibold uppercase tracking-widest text-white/50">Tooltip</h2>
        <div className="flex justify-center">
          <Tooltip label="Astuce : ceci est une infobulle." side="bottom">
            <button
              type="button"
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white"
            >
              Survolez-moi
            </button>
          </Tooltip>
        </div>
      </section>
    </div>
  );
}

export default PrimitivesGalleryPage;
