# @kitchenxpert/ui-components

Bibliothèque de composants React réutilisables pour KitchenXpert.

## Installation

```bash
pnpm add @kitchenxpert/ui-components
```

## Utilisation

```tsx
import { Button, Input, Card, Modal } from '@kitchenxpert/ui-components';

function MyComponent() {
  return (
    <Card>
      <Input placeholder="Entrez votre nom" />
      <Button variant="primary">Soumettre</Button>
    </Card>
  );
}
```

## Composants disponibles

### Formulaires
- `Button` - Boutons avec variantes (primary, secondary, outline, ghost)
- `Input` - Champ de saisie texte
- `Select` - Liste déroulante
- `Checkbox` - Case à cocher
- `Radio` - Bouton radio
- `Switch` - Interrupteur
- `Textarea` - Zone de texte multiligne

### Layout
- `Card` - Carte avec ombre
- `Container` - Conteneur responsive
- `Grid` - Grille CSS
- `Stack` - Empilement vertical/horizontal
- `Divider` - Séparateur

### Feedback
- `Alert` - Message d'alerte
- `Toast` - Notification toast
- `Spinner` - Indicateur de chargement
- `Progress` - Barre de progression
- `Skeleton` - Placeholder de chargement

### Navigation
- `Tabs` - Onglets
- `Breadcrumb` - Fil d'Ariane
- `Pagination` - Pagination
- `Menu` - Menu déroulant

### Overlay
- `Modal` - Fenêtre modale
- `Drawer` - Panneau latéral
- `Tooltip` - Info-bulle
- `Popover` - Bulle contextuelle

## Thématisation

```tsx
import { ThemeProvider, createTheme } from '@kitchenxpert/ui-components';

const customTheme = createTheme({
  colors: {
    primary: '#3b82f6',
    secondary: '#64748b',
  },
  fonts: {
    body: 'Inter, sans-serif',
  },
});

function App() {
  return (
    <ThemeProvider theme={customTheme}>
      {/* ... */}
    </ThemeProvider>
  );
}
```

## Scripts

```bash
# Build
pnpm --filter @kitchenxpert/ui-components build

# Tests
pnpm --filter @kitchenxpert/ui-components test

# Storybook
pnpm --filter @kitchenxpert/ui-components storybook
```

## Structure

```
src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   ├── Button.stories.tsx
│   │   └── index.ts
│   └── ...
├── hooks/
├── theme/
└── index.ts
```
