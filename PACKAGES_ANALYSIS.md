# KitchenXpert - Packages Analysis

## Overview

This document provides an analysis of all packages in the KitchenXpert monorepo, their
dependencies, and architectural relationships.

## Package Dependency Graph

```
                                    ┌─────────────────┐
                                    │    @common      │
                                    │  (Base Layer)   │
                                    └────────┬────────┘
                                             │
              ┌──────────────┬───────────────┼───────────────┬──────────────┐
              │              │               │               │              │
              ▼              ▼               ▼               ▼              ▼
      ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
      │ api-client│  │design-sys │  │ 3d-engine │  │  scraper  │  │  backend  │
      │           │  │           │  │           │  │           │  │           │
      └─────┬─────┘  └─────┬─────┘  └───────────┘  └───────────┘  └───────────┘
            │              │
            │              ▼
            │      ┌───────────┐
            │      │    ui-    │
            │      │components │
            │      └─────┬─────┘
            │            │
            ▼            ▼
      ┌──────────────────────────┐     ┌───────────────┐
      │        frontend          │     │partner-portal │
      │    (Main Application)    │     │               │
      └──────────────────────────┘     └───────────────┘
```

## Packages

### Layer 1: Base (No Dependencies)

#### @kitchenxpert/common

- **Path**: `packages/common`
- **Purpose**: Shared types, utilities, constants, and i18n
- **Dependencies**: None (workspace)
- **Exports**:
  - TypeScript types and interfaces
  - Utility functions
  - Constants and enums
  - i18n translations

### Layer 2: Core Libraries

#### @kitchenxpert/api-client

- **Path**: `packages/api-client`
- **Purpose**: Type-safe API client for frontend applications
- **Dependencies**: `@kitchenxpert/common`
- **Features**:
  - REST API client with axios
  - Type-safe request/response handling
  - Authentication helpers
  - Error handling utilities

#### @kitchenxpert/design-system

- **Path**: `packages/design-system`
- **Purpose**: Design tokens, themes, and base styles
- **Dependencies**: `@kitchenxpert/common`
- **Features**:
  - Color palettes and themes
  - Typography definitions
  - Spacing and layout tokens
  - CSS variables and utilities

#### @kitchenxpert/3d-engine

- **Path**: `packages/3d-engine`
- **Purpose**: 3D kitchen visualization engine
- **Dependencies**: `@kitchenxpert/common`
- **Features**:
  - Three.js integration
  - Cabinet and appliance rendering
  - Camera controls
  - Scene management

#### @kitchenxpert/scraper

- **Path**: `packages/scraper`
- **Purpose**: Kitchen catalog data scraping
- **Dependencies**: `@kitchenxpert/common`
- **Features**:
  - Multi-brand scraper framework
  - Data normalization
  - Price tracking
  - Image downloading

### Layer 3: Composition

#### @kitchenxpert/ui-components

- **Path**: `packages/ui-components`
- **Purpose**: Reusable React UI components
- **Dependencies**: `@kitchenxpert/common`, `@kitchenxpert/design-system`
- **Features**:
  - Form components
  - Layout components
  - Navigation components
  - Storybook documentation

### Layer 4: Applications

#### @kitchenxpert/frontend

- **Path**: `packages/frontend`
- **Purpose**: Main customer-facing Next.js application
- **Dependencies**: All packages except scraper and backend
- **Features**:
  - Kitchen configurator
  - User dashboard
  - Quote generation
  - 3D visualization

#### @kitchenxpert/partner-portal

- **Path**: `packages/partner-portal`
- **Purpose**: Partner/Retailer management portal
- **Dependencies**: `@kitchenxpert/common`, `@kitchenxpert/api-client`,
  `@kitchenxpert/design-system`, `@kitchenxpert/ui-components`
- **Features**:
  - Partner dashboard
  - Lead management
  - Analytics and reports
  - Catalog management

#### @kitchenxpert/backend

- **Path**: `packages/backend`
- **Purpose**: Main API server
- **Dependencies**: `@kitchenxpert/common`
- **Features**:
  - Express.js REST API
  - Prisma ORM
  - Authentication (JWT)
  - File uploads

### Standalone

#### @kitchenxpert/ai-modules

- **Path**: `packages/ai-modules`
- **Purpose**: Python-based AI/ML modules
- **Dependencies**: None (Python ecosystem)
- **Modules**:
  - Kitchen generator
  - Compatibility engine
  - Appliance advisor
  - Style analyzer

## Build Order

The packages must be built in the following order to respect dependencies:

1. `@kitchenxpert/common`
2. `@kitchenxpert/api-client`, `@kitchenxpert/design-system`, `@kitchenxpert/3d-engine`,
   `@kitchenxpert/scraper` (parallel)
3. `@kitchenxpert/ui-components`
4. `@kitchenxpert/frontend`, `@kitchenxpert/partner-portal`, `@kitchenxpert/backend` (parallel)

## Scripts

| Command               | Description                     |
| --------------------- | ------------------------------- |
| `pnpm build`          | Build all packages              |
| `pnpm dev`            | Start development servers       |
| `pnpm test`           | Run all tests                   |
| `pnpm lint`           | Lint all packages               |
| `pnpm type-check`     | TypeScript type checking        |
| `pnpm clean`          | Clean all build artifacts       |
| `pnpm format`         | Format code with Prettier       |

## Package Statistics

| Package          | Type       | Size (src) | Dependencies |
| ---------------- | ---------- | ---------- | ------------ |
| common           | Library    | ~50 files  | 0            |
| api-client       | Library    | ~20 files  | 1            |
| design-system    | Library    | ~30 files  | 1            |
| 3d-engine        | Library    | ~40 files  | 1            |
| ui-components    | Library    | ~60 files  | 2            |
| frontend         | App        | ~100 files | 5            |
| partner-portal   | App        | ~80 files  | 4            |
| backend          | App        | ~120 files | 1            |
| scraper          | App        | ~80 files  | 1            |
| ai-modules       | Python     | ~40 files  | 0            |

## Configuration Files

Each package contains:

- `package.json` - Package manifest
- `tsconfig.json` - TypeScript configuration (extends root)
- `.eslintrc.js` (optional) - Package-specific ESLint rules

Root configuration files:

- `tsconfig.base.json` - Shared TypeScript settings
- `tsconfig.json` - Project references
- `turbo.json` - Turborepo pipeline configuration
- `pnpm-workspace.yaml` - Workspace definition

## Notes

### TypeScript Project References

The project uses TypeScript project references for:

- Faster incremental builds
- Proper dependency tracking
- Better IDE support

### Turborepo

Turborepo is used for:

- Parallel builds
- Build caching
- Task orchestration
- Dependency graph awareness

### pnpm Workspace

pnpm workspace provides:

- Single lock file
- Efficient disk usage (symlinks)
- Strict dependency isolation
