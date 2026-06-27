# KitchenXpert — Mode Sandbox

> "Try it before you sign up." Coohom's main edge over the competition was that
> you reach the 3D designer in 0 clicks. This is our answer.

## Le funnel

```
                ┌─────────────────────────────────┐
                │ Visiteur arrive sur /           │
                └────────────────┬────────────────┘
                                 │ Clic « Essayer le designer »
                                 ▼
                ┌─────────────────────────────────┐
                │ /designer/sandbox               │
                │   - onboarding modal            │
                │   - choix : vide / template /   │
                │     plan importé                │
                └────────────────┬────────────────┘
                                 │ Choix
                                 ▼
       ┌────────────────────────────────────────────────┐
       │ Designer 3D (canvas + watermark + IA limitée)  │
       │  - localStorage `kx-sandbox-project-v1`        │
       │  - autosave throttle 30 s                      │
       │  - 3 IA gratuites · 1 PDF watermarké           │
       └─────────┬─────────────────────────┬────────────┘
                 │                         │
   Friction hit  │                         │ 15 min écoulées
   (PDF/IA/path) │                         │
                 ▼                         ▼
       ┌──────────────────────────────────────────┐
       │ SignupPromptModal (copie adaptée au triggr) │
       └────────────────────┬─────────────────────┘
                            │ Clic CTA
                            ▼
                ┌─────────────────────────┐
                │ /register               │
                │  ↓ inscription réussie  │
                └───────────┬─────────────┘
                            │
                            ▼
                ┌─────────────────────────┐
                │ /dashboard              │
                │  + SandboxMigrationBanner│
                │    « Importer mon projet »│
                └───────────┬─────────────┘
                            │ Clic « Importer »
                            ▼
                ┌─────────────────────────┐
                │ POST /projects/import-  │
                │ sandbox  (1 transaction │
                │ Prisma : Project +      │
                │ Kitchen + KitchenItems) │
                └───────────┬─────────────┘
                            │ 201 + projectId
                            ▼
                ┌─────────────────────────┐
                │ /projects/:id (vrai     │
                │ designer authentifié)   │
                └─────────────────────────┘
```

## Architecture

### Frontend

| Fichier                                                                                                                    | Rôle                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [`src/sandbox/store.ts`](packages/frontend/src/sandbox/store.ts)                                                           | Zustand store + persist v1, throttle 30 s, quota 4 MB warning                             |
| [`src/sandbox/templates.ts`](packages/frontend/src/sandbox/templates.ts)                                                   | 6 layouts pré-configurés (L, U, parallèle, îlot, ouverte, atypique)                       |
| [`src/sandbox/useDesignerStore.ts`](packages/frontend/src/sandbox/useDesignerStore.ts)                                     | Adapter `sandbox-or-auth` — composants designer ne savent pas dans quel mode ils tournent |
| [`src/sandbox/useSandboxLimits.ts`](packages/frontend/src/sandbox/useSandboxLimits.ts)                                     | Compteurs IA + déclenche `SignupPromptModal`                                              |
| [`src/sandbox/useSandboxAnalytics.ts`](packages/frontend/src/sandbox/useSandboxAnalytics.ts)                               | `trackSandbox()` Plausible-compatible + CustomEvent                                       |
| [`src/sandbox/migrateSandbox.ts`](packages/frontend/src/sandbox/migrateSandbox.ts)                                         | POST `/projects/import-sandbox`                                                           |
| [`src/components/sandbox/SandboxOnboardingModal.tsx`](packages/frontend/src/components/sandbox/SandboxOnboardingModal.tsx) | Modal 3 choix + grille 6 templates                                                        |
| [`src/components/sandbox/SandboxWatermark.tsx`](packages/frontend/src/components/sandbox/SandboxWatermark.tsx)             | Filigrane bas-droit cliquable → /register                                                 |
| [`src/components/sandbox/SignupPromptModal.tsx`](packages/frontend/src/components/sandbox/SignupPromptModal.tsx)           | Modal friction (copie adaptée au trigger)                                                 |
| [`src/components/sandbox/SandboxMigrationBanner.tsx`](packages/frontend/src/components/sandbox/SandboxMigrationBanner.tsx) | Bannière dashboard post-signup                                                            |
| [`src/pages/SandboxDesignerPage.tsx`](packages/frontend/src/pages/SandboxDesignerPage.tsx)                                 | Wrapper de la route `/designer/sandbox`                                                   |

### Backend

| Fichier                                                                                                                    | Changement                                                                         |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [`packages/backend/src/api/routes/project-routes.ts`](packages/backend/src/api/routes/project-routes.ts)                   | + `POST /projects/import-sandbox` + Zod `importSandboxSchema`                      |
| [`packages/backend/src/api/controllers/project-controller.ts`](packages/backend/src/api/controllers/project-controller.ts) | + `importSandbox` action (1 transaction Prisma : Project → Kitchen → KitchenItems) |

### Tests

| Fichier                                                                                                                            | Couvre                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [`packages/frontend/src/sandbox/__tests__/store.test.ts`](packages/frontend/src/sandbox/__tests__/store.test.ts)                   | Store unit : init, addItem, consumeAi, persistence, migration v99                   |
| [`packages/frontend/e2e-critical/flow-3-sandbox-designer.spec.ts`](packages/frontend/e2e-critical/flow-3-sandbox-designer.spec.ts) | E2E : reach without auth, watermark, onboarding, template URL, migration round-trip |

## Limitations volontaires (incentives signup)

| Surface                        | Limite sandbox                       | Compte                        |
| ------------------------------ | ------------------------------------ | ----------------------------- |
| Catalogues                     | ✅ Accès complet (argument de vente) | ✅ Accès complet              |
| Designer 3D                    | ✅ Drag-drop, undo, save local       | ✅ + collaboration temps réel |
| IA chat / auto-layout          | 3 utilisations                       | 20 / heure                    |
| Path-tracer HD                 | Preview basse résolution             | 4K + path-tracing             |
| PDF devis                      | Filigrané (téléchargement bloqué)    | Clean PDF + DXF + BOM         |
| Comparateur multi-fournisseurs | ❌ Modal signup                      | ✅                            |
| Sauvegarde cloud               | ❌ localStorage (5 MB)               | ✅                            |
| Multi-projets                  | ❌ 1 projet (nouveau écrase)         | ✅ Illimité                   |

## Métriques cibles à suivre (Plausible)

| Événement                          | Cible                                                         |
| ---------------------------------- | ------------------------------------------------------------- |
| `sandbox_session_start`            | Volume hebdomadaire — KPI top                                 |
| `sandbox_session_duration`         | **médiane > 5 min** = engagement réussi                       |
| `sandbox_friction_hit` (any)       | **30 % des sessions > 5 min**                                 |
| `sandbox_signup_intent` (clic CTA) | **15 % des sessions**                                         |
| `sandbox_signup_completed`         | **8 % des sessions** (taux de conversion sandbox → compte)    |
| `imported: 'yes'`                  | **≥ 70 % des signups venus du sandbox** importent leur projet |

Funnel cible : 100 sessions → 50 > 5 min → 30 friction → 15 intent → 8 signup →
6 import.

## A/B tests à mettre en place

Une fois 500 sessions/jour atteintes, tester en parallèle :

1. **CTA wording** : « Essayer le designer » vs « Démarrer ma cuisine » vs «
   Voir la démo 3D »
2. **Friction timing** : modal 15 min vs 10 min vs 20 min
3. **Onboarding default** : modal-first vs auto-cuisine-vide-skip-modal
4. **Friction copy** : value-prop direct (« Téléchargez sans filigrane ») vs
   FOMO (« Vos 3 IA gratuites sont écoulées »)
5. **Migration banner placement** : top of dashboard vs modal post-signup (avant
   arrivée dashboard)

Outil suggéré : **Plausible Experiments** (gratuit, RGPD-friendly, sans cookie).

## Limites & TODOs connus

- **Le canvas 3D n'est PAS branché** — `SandboxDesignerPage` rend un
  placeholder. Intégration : refactorer `KitchenDesignerPage` pour consommer
  `useDesignerStore()` au lieu de l'API directe, puis remplacer
  `<DesignerCanvasPlaceholder />` par le vrai canvas. ~4-6 h
- **Import PDF/DXF** : modal stub seulement — pipeline d'OCR + parsing à
  brancher (Phase ultérieure)
- **Hints contextuels** (drag #1, item #5, item #10) : non implémentés — la
  mécanique d'écoute est en place via `trackSandbox('sandbox_first_action')` ;
  reste à brancher un composant `<DesignerHint />` qui affiche les bulles
- **Plausible non instrumenté** dans `index.html` — `trackSandbox()` ne fait
  rien tant que la balise script Plausible n'est pas ajoutée à index.html (1
  ligne à ajouter quand le compte Plausible est créé)
- **Pas d'A/B framework** — Plausible Experiments ou GrowthBook EU à brancher
  quand le volume le justifie

## Comment tester localement

```bash
# 1. Backend + DB up
docker compose -f config/docker/docker-compose.dev.yml up -d
pnpm --filter backend dev      # http://localhost:4000

# 2. Frontend
pnpm --filter frontend dev     # http://localhost:3005

# 3. Visiter le sandbox sans login
open http://localhost:3005/designer/sandbox

# 4. Inspecter le state
console: JSON.parse(localStorage.getItem('kx-sandbox-project-v1'))

# 5. Tests
pnpm --filter frontend test src/sandbox/__tests__/store.test.ts
PLAYWRIGHT_SUITE=critical pnpm --filter frontend exec \
  playwright test e2e-critical/flow-3-sandbox-designer.spec.ts
```
