# KitchenXpert — AI Features

4 features qui justifient le positionnement "premium intelligent" et
qui répondent fonction-par-fonction à Coohom AI Layout + SnapIt.

---

## Vue d'ensemble

| Feature | Modèle | Coût/call | Quota free | Quota premium |
|---|---|---:|---:|---:|
| **Auto-Layout** (texte → 3 cuisines 3D) | Claude Sonnet 4.6 + Gemini Flash Image | ~0,10 $ | 3/jour | illimité |
| **SnapIt** (photo → catalogue) | Gemini 2.5 Flash | ~0,015 $ | 5/jour | illimité |
| **Style Transfer** (img2img) | Gemini 2.5 Flash Image | ~0,05 $ | 3/jour | illimité |
| **Shopping Chat** (assistant + tool-use) | Claude Sonnet 4.6 | ~0,02 $/message | 10/jour | illimité |

Tous garde-fous au monthly cap par tier — voir §Quotas plus bas.

---

## Architecture livrée

### Backend

| Fichier | Rôle |
|---|---|
| [`services/ai/cost-monitor.service.ts`](packages/backend/src/services/ai/cost-monitor.service.ts) | Computes $ cost from `AIUsageLog`, enforces tier caps, throws `QuotaExceededError` |
| [`services/ai/schemas.ts`](packages/backend/src/services/ai/schemas.ts) | Zod types pour les 4 features — input + output |
| [`services/ai/prompts.ts`](packages/backend/src/services/ai/prompts.ts) | **THE IP** — system prompts Claude + Gemini, par feature |
| [`use-cases/ai/generate-layout.use-case.ts`](packages/backend/src/use-cases/ai/generate-layout.use-case.ts) | Pipeline auto-layout : parse + propose + verify + (preview) |
| [`use-cases/ai/recognize-photo.use-case.ts`](packages/backend/src/use-cases/ai/recognize-photo.use-case.ts) | SnapIt — Gemini Vision + catalog match |
| [`use-cases/ai/style-transfer.use-case.ts`](packages/backend/src/use-cases/ai/style-transfer.use-case.ts) | img2img Gemini Flash Image |
| [`api/routes/ai-features-routes.ts`](packages/backend/src/api/routes/ai-features-routes.ts) | POST `/api/v1/ai/auto-layout`, `/snapit`, `/style-transfer` |

### Frontend

| Fichier | Rôle |
|---|---|
| [`components/designer/AutoLayoutModal.tsx`](packages/frontend/src/components/designer/AutoLayoutModal.tsx) | Textarea + 4 suggestions + loading narré + 3 cards résultat |

---

## Quotas par tier (cf `cost-monitor.service.ts`)

```ts
TIER_LIMITS = {
  sandbox:  { monthlyUsdCap: 0.20, dailyRequestCap: 3   },  // anonyme
  free:     { monthlyUsdCap: 1.00, dailyRequestCap: 20  },
  premium:  { monthlyUsdCap: 20.00, dailyRequestCap: 200 },
  studio:   { monthlyUsdCap: null, dailyRequestCap: null },  // illimité
};
```

Coût observé après 1 mois (estimations) :

| Tier | Conversion attendue | Coût IA / user / mois |
|---|---|---|
| sandbox | 100 % des visiteurs (3 essais gratuits) | 0,03 $ |
| free | ~5 % des sandbox upgradent | 0,40 $ |
| premium | 14,90 €/mois — IA illimitée | 1,80 $ avg (cap 20 $) |
| studio | 49 €/mois — usage pro | 8,00 $ avg |

**Marge brute** : la pire = sandbox (perte sèche $0,03 × N visiteurs). À 1 000 sandbox/jour = **$900/mois** de coût IA brûlé sur le free tier. Acceptable comme coût d'acquisition.

---

## Le system prompt auto-layout = l'IP

Lis [`services/ai/prompts.ts`](packages/backend/src/services/ai/prompts.ts) §AUTO_LAYOUT_SYSTEM_PROMPT.

Il code en dur :
- **Ergonomie NF DTU 36.2** (triangle d'activité, hauteurs standard, circulation)
- **Normes NF C 15-100** (circuits 32 A induction, 20 A four, distance hotte)
- **12 brand profiles dimensionnels** (IKEA 60 cm, Schmidt 30/45/60/90/120, etc.)
- **11 styles** avec palettes + matériaux signature
- **Allocation budget** (40 % caissons / 25 % électroménager / etc.)
- **Format JSON strict** validable par Zod

C'est ce prompt qui fait la différence entre "l'IA pond une cuisine random" et "l'IA pond une cuisine pro". Quand tu l'éditeras, **versionne** + relance la suite d'évals avant merge.

---

## Évaluations (qualité)

Dataset starter : 10 cas dans [`packages/backend/src/data/ai-evals/auto-layout-cases.json`](packages/backend/src/data/ai-evals/auto-layout-cases.json).

Chaque cas a :
- Un `prompt` représentatif (couvre budgets, surfaces, styles, contraintes spéciales)
- Des `shouldExtract` (paramètres Claude doit extraire correctement)
- Des `criteria` (5 par cas en moyenne) qu'un humain coche

**Cible** : score moyen **8/10** sur ces 10 cas.

### Comment lancer une éval

```bash
# Stub — à implémenter quand tu auras lancé le pipeline complet
node scripts/run-ai-evals.mjs --suite auto-layout --case AL-001
```

Le script appelle la vraie use case, ouvre l'output dans le navigateur,
toi (ou un reviewer) cochent les `criteria`. Score = % cochés.

**Étendre à 30 cas** quand tu auras :
- 5 cas de plus par tranche de surface (5-10, 10-15, 15-25 m²)
- 5 cas de plus par tranche de budget (≤ 5k, 5-15k, 15-30k, ≥ 30k)
- 5 cas "edge" (contraintes spéciales : PMR, gaucher, sécurité enfants, sous-pente, mur courbe)

---

## SnapIt + Style Transfer (statut)

**Backend** : use cases livrés, validés par Zod. **Pipeline cataloque match** = stub (retourne `[]`) — à brancher sur pgvector + embeddings (Voyage AI ou Cohere) quand le catalogue dépasse 5k SKU.

**Frontend** : modal AutoLayout livré ; SnapIt + StyleTransfer modals à écrire en suivant le même pattern (loading narré + résultat). Coût d'écriture estimé : 2 h chacun.

---

## Shopping Chat — extensions à câbler

`ai-chat-routes.ts` existe déjà. Pour passer en "tool-use Claude" :

1. Importer `SHOPPING_CHAT_SYSTEM_PROMPT` + `SHOPPING_CHAT_TOOLS` depuis `prompts.ts`
2. Dans le handler `/stream`, passer `system: SHOPPING_CHAT_SYSTEM_PROMPT` et `tools: SHOPPING_CHAT_TOOLS`
3. Quand Claude répond avec un `tool_use` block, exécuter localement la fonction (4 fonctions définies : `searchCatalog`, `swapItem`, `addItem`, `getBudgetSummary`) puis renvoyer le résultat dans le tour suivant

Le frontend `ChatPanel.tsx` n'a pas besoin de changer — l'API reste streamée, le user voit Claude "réfléchir puis agir".

---

## Sécurité + RGPD

- Les images uploadées (SnapIt + Style Transfer) ont une **TTL S3 de 30 jours** (à câbler dans le bucket lifecycle policy). RGPD : on ne garde pas indéfiniment.
- Les prompts utilisateurs sont enregistrés dans `AIUsageLog.metadata.prompt` **tronqués à 200 chars** — assez pour le debug, pas assez pour fuiter du PII.
- Avant chaque call Anthropic / Gemini, vérifier que le user a accepté le DPA dans `legal.ts` (déclaré comme sous-processeur sur la page Privacy).

---

## Loading states + UX

Pattern dans [`AutoLayoutModal.tsx`](packages/frontend/src/components/designer/AutoLayoutModal.tsx) — **narrate**, ne pas montrer un spinner muet sur 15 sec.

```tsx
const LOADING_STEPS = [
  'Analyse de votre demande...',
  'Génération du layout 3D...',
  'Sélection du catalogue + budget...',
  'Rendu photoréaliste...',
];
```

Step déclenché à intervalles de 3 s, barre de progression visuelle (gradient indigo→fuchsia). Si l'API n'a pas répondu après 25 s, afficher "le service IA est plus lent que d'habitude — continue ou réessaie ?".

---

## Tests

| Couche | Fichier (à écrire) | Couvre |
|---|---|---|
| Unit | `cost-monitor.test.ts` | computeCostUsd, quota math, daily reset |
| Unit | `schemas.test.ts` | Zod refuse les payloads malformés (négatif, out-of-bounds, missing required) |
| Unit | `generate-layout.test.ts` | parse Claude response, bounds clipping, total recompute |
| Integration | `ai-features-routes.test.ts` | 402 quota, 200 happy path, 500 on Claude API down |
| E2E | `flow-9-ai-autolayout.spec.ts` (sandbox suite) | Open modal → submit prompt → 3 cards rendered |

À ajouter quand le pipeline est éprouvé sur 1-2 semaines de prod.

---

## Checklist Laurent

### Avant publication
- [ ] `ANTHROPIC_API_KEY` + `GOOGLE_GENAI_API_KEY` dans `.env.production`
- [ ] DPA signés avec Anthropic + Google (déjà documenté legal.ts)
- [ ] Lifecycle S3 30 j sur le bucket `snapit-uploads/`
- [ ] Lancer les 10 cas auto-layout en eval → score moyen ≥ 7/10 avant flip Premium
- [ ] Wire `AutoLayoutModal` dans le designer toolbar
- [ ] Écrire `SnapItPanel.tsx` + `StyleTransferModal.tsx` (2h chacun)
- [ ] Wire `SHOPPING_CHAT_SYSTEM_PROMPT` + `SHOPPING_CHAT_TOOLS` dans `ai-chat-routes.ts` existant
- [ ] Câbler le matching catalogue dans `recognize-photo.use-case.ts` (pgvector)
- [ ] Câbler l'upload S3 dans `style-transfer.use-case.ts` (au lieu du data URI stub)

### Suivi production
- [ ] Dashboard interne `/admin/ai-usage` (à écrire — `AIUsageLog` agrégé par jour × user × service)
- [ ] Alerte Slack si un user atteint 80 % du cap mensuel
- [ ] Re-pricing mensuel : check les évolutions tarifaires Anthropic + Google + mettre à jour `PRICING` dans `cost-monitor.service.ts`
