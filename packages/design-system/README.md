# @kitchenxpert/design-system

Système de design KitchenXpert - Tokens, styles et guidelines.

## Installation

```bash
pnpm add @kitchenxpert/design-system
```

## Contenu

### Tokens de design

```typescript
import { tokens } from '@kitchenxpert/design-system';

// Couleurs
tokens.colors.primary    // '#3b82f6'
tokens.colors.secondary  // '#64748b'
tokens.colors.success    // '#22c55e'
tokens.colors.warning    // '#eab308'
tokens.colors.error      // '#ef4444'

// Espacements
tokens.spacing.xs  // '0.25rem'
tokens.spacing.sm  // '0.5rem'
tokens.spacing.md  // '1rem'
tokens.spacing.lg  // '1.5rem'
tokens.spacing.xl  // '2rem'

// Typography
tokens.fontSizes.xs   // '0.75rem'
tokens.fontSizes.sm   // '0.875rem'
tokens.fontSizes.base // '1rem'
tokens.fontSizes.lg   // '1.125rem'
tokens.fontSizes.xl   // '1.25rem'

// Rayons de bordure
tokens.radii.sm  // '0.25rem'
tokens.radii.md  // '0.375rem'
tokens.radii.lg  // '0.5rem'
tokens.radii.xl  // '0.75rem'

// Ombres
tokens.shadows.sm  // '0 1px 2px rgba(0,0,0,0.05)'
tokens.shadows.md  // '0 4px 6px rgba(0,0,0,0.1)'
tokens.shadows.lg  // '0 10px 15px rgba(0,0,0,0.1)'
```

### CSS Variables

```css
@import '@kitchenxpert/design-system/css/variables.css';

.my-component {
  color: var(--kx-color-primary);
  padding: var(--kx-spacing-md);
  border-radius: var(--kx-radius-lg);
  box-shadow: var(--kx-shadow-md);
}
```

### Tailwind Config

```javascript
// tailwind.config.js
const { tailwindPreset } = require('@kitchenxpert/design-system');

module.exports = {
  presets: [tailwindPreset],
  // ...
};
```

## Structure

```
src/
├── tokens/
│   ├── colors.ts
│   ├── spacing.ts
│   ├── typography.ts
│   ├── shadows.ts
│   └── index.ts
├── css/
│   ├── variables.css
│   └── utilities.css
├── tailwind/
│   └── preset.js
└── index.ts
```

## Guidelines

- Utiliser les tokens pour toutes les valeurs visuelles
- Ne pas utiliser de valeurs hardcodées
- Respecter les conventions de nommage BEM pour les classes CSS
- Documenter tout nouveau token ajouté

## Scripts

```bash
pnpm --filter @kitchenxpert/design-system build
pnpm --filter @kitchenxpert/design-system test
```
