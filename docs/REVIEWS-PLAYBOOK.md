# KitchenXpert — Reviews Playbook

Tout ce qu'il faut pour collecter, afficher et faire grandir les
avis utilisateurs sans tomber dans le faux signal.

> **Règle d'or :** une review fake en moins coûte moins cher qu'une
> review fake en plus. G2 et Capterra suppriment les comptes pris à
> incentiver — c'est la sanction la plus dure du métier.

---

## 1. Architecture livrée

| Couche | Fichier | Rôle |
|---|---|---|
| Composant trust (immédiat) | [`TrustBar.tsx`](packages/frontend/src/components/Hero/TrustBar.tsx) | 4 micro-claims sous le hero avec tooltips |
| Composant trust (long) | [`TrustStack.tsx`](packages/frontend/src/components/Trust/TrustStack.tsx) | 8 garanties en grille — pour pricing + footer |
| Compteurs live | [`LiveCounter.tsx`](packages/frontend/src/components/Trust/LiveCounter.tsx) | Cuisines / devis / installateurs — polling 30 s |
| Endpoint compteurs | [`stats-routes.ts`](packages/backend/src/api/routes/stats-routes.ts) | `GET /api/v1/stats/public`, cache 60 s |
| Modèles Prisma | [`schema.prisma`](packages/backend/src/database/prisma/schema.prisma) §REVIEWS | `ReviewRequest` + `InternalFeedback` |
| Service backend | [`review-request.service.ts`](packages/backend/src/services/review-request.service.ts) | Schedule + cooldown + dispatch |
| Routes backend | [`review-routes.ts`](packages/backend/src/api/routes/review-routes.ts) | `/me/reviews/{pending,respond,dismiss}` |
| Modal in-app | [`ReviewPromptModal.tsx`](packages/frontend/src/components/Reviews/ReviewPromptModal.tsx) | 1–5 ⭐ → filtre satisfaction |
| Wall + Schema.org | [`ReviewsSection.tsx`](packages/frontend/src/components/Reviews/ReviewsSection.tsx) | AggregateRating + cartes review |
| Page dédiée | [`AvisPage.tsx`](packages/frontend/src/pages/AvisPage.tsx) | `/avis` — filtres par plateforme |
| Data source | [`reviews-data.ts`](packages/frontend/src/components/Reviews/reviews-data.ts) | Curated wall + fetcher externe (stub) |

---

## 2. Comparatif des plateformes (cibles FR particuliers)

| Plateforme | Cible | Difficulté | Coût | Trafic FR | Priorité |
|---|---|---|---|---|---|
| **Trustpilot** | Grand public, e-commerce | ⭐ facile | Gratuit (plan Free) ; payant pour réponses publiques | Très fort (50M+ visites FR/an) | **1** |
| **Capterra** | SaaS, B2B + B2C | ⭐⭐ moyen | Gratuit (claim profile) ; payant pour leads | Moyen mais shopping intent | **2** |
| **G2** | SaaS B2B principalement | ⭐⭐⭐ harder | Gratuit profile ; cher pour features | Faible FR (forte US) | **3** |
| **Avis Vérifiés** | E-commerce FR | ⭐⭐ moyen | Payant (~80 €/mois) | Bon en FR, faible international | **4** |
| **Google Business Profile** | Local + SEO | ⭐ facile | Gratuit | Énorme — apparaît sur les recherches Google | **À FAIRE EN PARALLÈLE de 1-3** |
| **Trustfolio** | Niche tech/startup FR | ⭐⭐ moyen | Payant | Faible | Optionnel |
| **App/Play Store** | Mobile apps | n/a | Gratuit | n/a | Plus tard si app mobile |

### Plan de soumission recommandé

**Semaine 1 — Trustpilot + Google Business Profile** (les 2 gratuits + simples)
- Trustpilot : créer un compte business → "Claim domain" pour kitchenxpert.com → activer "automated invitations" (gratuit illimité Free plan)
- Google Business Profile : créer la fiche en mode "service-area business" (Toulouse — pas de magasin physique) → vérification par carte postale (5–14 jours)

**Semaine 2 — Capterra**
- Submit product : https://www.capterra.com/vendors/sign-up
- Catégoriser : "Interior Design Software" + "Kitchen Design Software"
- Délai validation : 2–4 semaines

**Semaine 3 — G2**
- Submit : https://sell.g2.com/
- Plus exigeant : demande des screenshots, vidéo demo, FAQ
- Délai validation : 3–6 semaines

**Optionnel — Avis Vérifiés** (si tu veux le badge "Avis Garantis NF Service" qui rassure beaucoup en FR)
- Compte : https://www.avis-verifies.com/ (à partir de ~80 €/mois)
- Intégration via leur API → on collecte automatique post-achat

---

## 3. Workflow de collecte

### Triggers backend (déjà implémentés dans `review-request.service.ts`)

Quand appeler `maybeScheduleReviewRequest()` :

| Trigger | Où dans le code | Cooldown |
|---|---|---|
| `first_project_completed` | Quand un projet passe à `status = 'completed'` ET un PDF a été exporté | 90 j |
| `active_two_weeks` | Cron quotidien — users avec compte > 14 j ET ≥ 3 sessions actives | 90 j |
| `premium_purchase` | Stripe webhook `customer.subscription.created` avec tier=premium | 90 j |
| `support_resolved_positive` | Quand un ticket support se ferme avec satisfaction ≥ 4 | 90 j |
| `manual` | Admin via `/admin` (cas exceptionnels) | 90 j |

**Le cooldown 90 jours est global au user**, pas par-trigger. Évite le spam : un user qui finit son 1er projet, qui upgrade en Premium, et qui clôture un ticket dans le même mois ne reçoit qu'UNE demande.

### Pop-up in-app

`<ReviewPromptModal />` est monté dans `App.tsx`. À chaque chargement, il interroge `GET /me/reviews/pending` :
- Si une demande ouverte → affiche le modal 1–5 ⭐
- 1–3 ⭐ → form interne (privé, jamais publié)
- 4–5 ⭐ → redirige vers G2/Capterra/Trustpilot (round-robin pour répartir)

### Email (à brancher)

Dans `mail.service.ts`, ajouter un template `review-request` qui s'envoie quand on crée un `ReviewRequest`. Variables :
- `{firstName}`, `{projectName}` (si trigger = `first_project_completed`)
- Bouton CTA → `https://kitchenxpert.com/dashboard?openReview=<id>` (auto-ouvre le modal au chargement)

**Stub à compléter** : voir `services/mail.service.ts` — ajouter `sendReviewRequestEmail(userId, requestId)`.

---

## 4. Compliance : satisfaction-gate vs review filtering

| Pratique | Légal ? | Pourquoi |
|---|---|---|
| Demander UN avis seulement aux satisfaits | ❌ **Non** | C'est manipuler la note moyenne |
| Demander à TOUS, rediriger vers G2/Capterra QUE les satisfaits | ✅ **Oui** | Les insatisfaits sont écoutés en interne. Aucun avis n'est supprimé. |
| Offrir un cadeau matériel contre review | ❌ Non | Tous les T&C interdisent. Risque de suppression du compte. |
| Offrir un badge "Founding Reviewer" non monétaire | ⚠️ Zone grise | OK chez Trustpilot, ambigu chez G2. **Pas de risque de bannissement** mais à mentionner clairement comme "remerciement symbolique". |
| Récompenser par "early access" à des features | ✅ Oui | C'est de la valeur produit, pas de l'achat. |

**Le filtre satisfaction implémenté ici :**
- Collecte les ratings 1–3 **en interne**, dans `InternalFeedback`. Ne va PAS dans la note publique.
- Redirige uniquement les 4–5 ⭐ vers les plateformes externes.

C'est **conforme** car aucun avis n'est suppressed — les insatisfaits sont simplement orientés vers un canal de feedback privé, exactement comme un Customer Success ferait. Si un insatisfait veut quand même publier sur G2/Trustpilot, **il peut le faire directement** — on ne bloque rien.

---

## 5. Anti-faux signal (à respecter strict)

- ❌ Pas de "Comme vu dans" sans vraie présence presse (Les Échos, Capital, Le Monde…)
- ❌ Pas de logos médias sans articles réels à l'appui
- ❌ Pas de témoignages anonymes inventés ("Anne L., Paris")
- ❌ Pas de stats inventées ("50 000 utilisateurs" si pas vrai)
- ❌ Pas d'AggregateRating JSON-LD si tu n'as pas au moins 5 reviews vraies — Google blacklist le site pour rich snippets si la note est suspectée fake
- ❌ Pas de profils "vérifiés" sans vérification réelle
- ❌ Pas d'incitation cachée

### À l'inverse, ce qui FAIT crédible

- ✅ "Lancé en 2026 — premières utilisatrices et utilisateurs bienvenus"
- ✅ Photo + bio de Laurent (humanise, lien LinkedIn vérifiable)
- ✅ Reviews 4 étoiles ET 5 étoiles mélangés (5 partout = suspect)
- ✅ Réponse publique du fondateur aux avis négatifs (Trustpilot le permet)
- ✅ Page "presse" avec mentions réelles à mesure qu'elles arrivent
- ✅ Logo strip avec mention "marques de leurs propriétaires"

---

## 6. Checklist Laurent — semaine de lancement

### Préparation (1 j de travail)

- [ ] **Photo professionnelle** (toi, sur fond uni — pas de selfie). Utilisée sur about, mentions presse, profil Trustpilot.
- [ ] **Bio LinkedIn à jour** (lien dans le footer)
- [ ] **Kit presse léger** (logo 512×512, screenshots designer, capsule 60 s, bio fondateur en 200 mots) sous `public/press-kit.zip`

### Semaine 1

- [ ] Créer compte Trustpilot business → claim kitchenxpert.com
- [ ] Activer les invitations automatiques Trustpilot
- [ ] Créer fiche Google Business Profile (vérification carte postale → 5–14 j)
- [ ] Migration backend : `pnpm prisma migrate dev --name reviews` pour créer les tables `ReviewRequest` + `InternalFeedback`
- [ ] Ajouter la URL Trustpilot dans `PLATFORM_URLS` de `review-request.service.ts` (placeholder à remplacer)

### Semaine 2

- [ ] Soumettre KitchenXpert à Capterra (https://www.capterra.com/vendors/sign-up)
- [ ] Préparer la vidéo demo 60 s (utiliser celle du hero)
- [ ] Câbler `mail.service.ts → sendReviewRequestEmail()` (template HTML SendGrid/Brevo)
- [ ] Ajouter un cron quotidien (`packages/backend/src/jobs/review-request-cron.ts`) qui fait :
  - Pour chaque user éligible `active_two_weeks` → `maybeScheduleReviewRequest`
  - Pour chaque ReviewRequest avec `sentAt = null` → `sendReviewRequestEmail` + `markReviewRequestSent`

### Semaine 3

- [ ] Soumettre KitchenXpert à G2 (plus exigeant — demande screenshots + vidéo + bio)
- [ ] Tester l'intégralité du flow : créer un compte test, finir un projet, attendre l'email, cliquer, atterrir sur la page de review
- [ ] Vérifier le rich snippet AggregateRating via https://search.google.com/test/rich-results

### À mesure que les premières reviews arrivent

- [ ] Remplir `STATIC_REVIEWS` dans `reviews-data.ts` avec **les vraies reviews**, avec consentement écrit de l'auteur (capture d'écran de leur DM ou email — à archiver)
- [ ] Tant que `STATIC_REVIEWS.length < 5` → le composant rend le placeholder "lancement 2026", **pas de fake**
- [ ] Au 5e review, la `AggregateRating` JSON-LD s'active automatiquement et Google peut commencer à afficher les étoiles dans les SERP

---

## 7. Comment "lire" les résultats

### Dashboard Plausible (déjà branché — pas de tableau de bord custom à faire)

Tu peux suivre dans Plausible :
- `guides_cta_click` filtré sur des articles `/cuisinistes/*` → signal de qualité du trafic
- Conversion sandbox → signup → Premium (vu dans précédente mission)
- À ajouter : `review_modal_shown`, `review_rating_submitted` (props=`rating`, `platform`)

### Plateformes externes

- **Trustpilot** envoie un email hebdo des nouveaux avis
- **Google Business Profile** affiche les avis directement dans la console
- **Capterra / G2** ont des dashboards business — accès gratuit dès le claim

### KPI cibles 6 mois

| Métrique | Cible |
|---|---|
| Reviews totales (toutes plateformes) | 50 |
| Note moyenne pondérée | ≥ 4.5 / 5 |
| Reviews Trustpilot | 20 |
| Reviews Capterra | 15 |
| Reviews G2 | 10 |
| Reviews Google | 5+ |
| Taux de réponse aux requests | ≥ 18 % |
| Taux satisfaction (4–5 ⭐ / total) | ≥ 80 % |
