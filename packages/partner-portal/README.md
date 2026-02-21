# @kitchenxpert/partner-portal

Portail partenaires KitchenXpert - Interface de gestion pour les fabricants et distributeurs.

## Technologies

- **Framework**: Next.js 14+
- **Langage**: TypeScript
- **UI**: Tailwind CSS + @kitchenxpert/ui-components
- **State**: React Query + Zustand

## Installation

```bash
pnpm install
```

## Développement

```bash
# Démarrer le serveur de développement
pnpm --filter @kitchenxpert/partner-portal dev

# Build production
pnpm --filter @kitchenxpert/partner-portal build

# Lancer en production
pnpm --filter @kitchenxpert/partner-portal start
```

## Fonctionnalités

### Gestion du catalogue
- Upload de produits (CSV, Excel, API)
- Gestion des images et médias
- Configuration des prix et stocks
- Catégorisation des produits

### Analytics
- Vues et clics sur les produits
- Taux de conversion
- Performances par catégorie
- Export des rapports

### Gestion du compte
- Informations de l'entreprise
- Utilisateurs et permissions
- Paramètres de facturation
- Webhooks et intégrations

## Structure

```
src/
├── app/                    # App Router Next.js
│   ├── (auth)/             # Routes auth (login, register)
│   ├── dashboard/          # Tableau de bord
│   ├── catalog/            # Gestion catalogue
│   ├── analytics/          # Analytics
│   └── settings/           # Paramètres
├── components/
│   ├── catalog/            # Composants catalogue
│   ├── analytics/          # Composants analytics
│   └── layout/             # Layout commun
├── hooks/                  # Hooks React
├── lib/                    # Utilitaires
└── styles/                 # Styles globaux
```

## Variables d'environnement

```env
NEXT_PUBLIC_API_URL=https://api.kitchenxpert.com
NEXT_PUBLIC_APP_URL=https://partners.kitchenxpert.com
```

## Scripts

```bash
# Développement
pnpm --filter @kitchenxpert/partner-portal dev

# Build
pnpm --filter @kitchenxpert/partner-portal build

# Tests
pnpm --filter @kitchenxpert/partner-portal test

# Linting
pnpm --filter @kitchenxpert/partner-portal lint
```
