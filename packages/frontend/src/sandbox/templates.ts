/**
 * 6 pre-built sandbox templates.
 *
 * Each template is a fully-positioned starter kitchen the user can
 * tweak. Coordinates are in centimetres, kitchen-local frame:
 *   x → width  (left edge = 0)
 *   y → depth  (back wall = 0)
 *   z → height (floor = 0)  — most cabinets sit at z = 0
 *
 * Prices are estimative and align with current IKEA METOD averages
 * (May 2026). They are display-only — the real quote comes from the
 * authenticated comparator.
 */

import type { SandboxKitchen, SandboxItem } from './store';

export interface SandboxTemplate {
  id: string;
  name: string;
  /** Marketing tagline shown in the picker. */
  blurb: string;
  layout: SandboxKitchen['layout'];
  widthCm: number;
  depthCm: number;
  heightCm: number;
  /** Item list WITHOUT id — store assigns ids on hydration. */
  items: Array<Omit<SandboxItem, 'id'>>;
  /** Cover image (sandbox watermarked render). 480×270 ideal. */
  coverUrl: string;
}

// Helper to keep the TEMPLATES literal shorter
const item = (
  sku: string,
  label: string,
  position: SandboxItem['position'],
  size: SandboxItem['size'],
  unitPrice: number,
  rotation = 0
): Omit<SandboxItem, 'id'> => ({
  sku,
  label,
  providerCode: 'IKEA',
  unitPrice,
  quantity: 1,
  position,
  rotation,
  size,
});

export const SANDBOX_TEMPLATES: SandboxTemplate[] = [
  {
    id: 'l-shape-small',
    name: 'L compacte (8 m²)',
    blurb: 'Idéale pour studios et petites pièces. Coin évier + plaque sur le retour.',
    layout: 'L_SHAPED',
    widthCm: 280,
    depthCm: 280,
    heightCm: 250,
    coverUrl: '/templates/l-small.jpg',
    items: [
      item(
        'METOD-60-WHITE',
        'Caisson bas 60 — blanc',
        { x: 0, y: 0, z: 0 },
        { w: 60, d: 60, h: 80 },
        169
      ),
      item(
        'METOD-80-WHITE',
        'Caisson bas 80 — blanc',
        { x: 60, y: 0, z: 0 },
        { w: 80, d: 60, h: 80 },
        199
      ),
      item(
        'METOD-EVIER-60',
        'Caisson évier 60',
        { x: 140, y: 0, z: 0 },
        { w: 60, d: 60, h: 80 },
        219
      ),
      item(
        'METOD-PLAQUE-60',
        'Caisson plaque 60',
        { x: 200, y: 0, z: 0 },
        { w: 60, d: 60, h: 80 },
        209
      ),
      // Retour (mur perpendiculaire)
      item(
        'METOD-COIN',
        "Caisson d'angle",
        { x: 200, y: 60, z: 0 },
        { w: 80, d: 80, h: 80 },
        289,
        90
      ),
      item(
        'METOD-60-WHITE',
        'Caisson bas 60 — blanc',
        { x: 200, y: 140, z: 0 },
        { w: 60, d: 60, h: 80 },
        169,
        90
      ),
    ],
  },

  {
    id: 'u-shape-medium',
    name: 'U fonctionnelle (12 m²)',
    blurb: "Triangle d'activité optimal. 3 plans de travail distincts.",
    layout: 'U_SHAPED',
    widthCm: 360,
    depthCm: 320,
    heightCm: 250,
    coverUrl: '/templates/u-medium.jpg',
    items: [
      // Mur principal
      item(
        'METOD-EVIER-80',
        'Caisson évier 80',
        { x: 0, y: 0, z: 0 },
        { w: 80, d: 60, h: 80 },
        249
      ),
      item(
        'METOD-LAVE-VAIS',
        'Lave-vaisselle 60 intégré',
        { x: 80, y: 0, z: 0 },
        { w: 60, d: 60, h: 80 },
        449
      ),
      item(
        'METOD-100-WHITE',
        'Caisson bas 100',
        { x: 140, y: 0, z: 0 },
        { w: 100, d: 60, h: 80 },
        239
      ),
      item(
        'METOD-PLAQUE-80',
        'Caisson plaque 80',
        { x: 240, y: 0, z: 0 },
        { w: 80, d: 60, h: 80 },
        229
      ),
      // Retour droit
      item('METOD-COIN', 'Coin droit', { x: 320, y: 0, z: 0 }, { w: 80, d: 80, h: 80 }, 289),
      item(
        'METOD-60-WHITE',
        'Caisson bas 60',
        { x: 320, y: 80, z: 0 },
        { w: 60, d: 60, h: 80 },
        169,
        90
      ),
      // Retour gauche
      item(
        'METOD-FOUR',
        'Caisson four 60',
        { x: 0, y: 80, z: 0 },
        { w: 60, d: 60, h: 80 },
        359,
        90
      ),
      item(
        'METOD-FRIGO',
        'Colonne frigo 60',
        { x: 0, y: 140, z: 0 },
        { w: 60, d: 60, h: 220 },
        489,
        90
      ),
    ],
  },

  {
    id: 'parallel',
    name: 'Parallèle / Galley (10 m²)',
    blurb: 'Deux murs face à face. Très efficace en couloir étroit.',
    layout: 'GALLEY',
    widthCm: 320,
    depthCm: 220,
    heightCm: 250,
    coverUrl: '/templates/galley.jpg',
    items: [
      // Mur arrière
      item(
        'METOD-EVIER-80',
        'Caisson évier 80',
        { x: 0, y: 0, z: 0 },
        { w: 80, d: 60, h: 80 },
        249
      ),
      item(
        'METOD-LAVE-VAIS',
        'Lave-vaisselle 60',
        { x: 80, y: 0, z: 0 },
        { w: 60, d: 60, h: 80 },
        449
      ),
      item('METOD-PLAQUE-80', 'Plaque 80', { x: 140, y: 0, z: 0 }, { w: 80, d: 60, h: 80 }, 229),
      item('METOD-80-WHITE', 'Bas 80', { x: 220, y: 0, z: 0 }, { w: 100, d: 60, h: 80 }, 199),
      // Mur avant (face)
      item('METOD-FRIGO', 'Colonne frigo', { x: 0, y: 160, z: 0 }, { w: 60, d: 60, h: 220 }, 489),
      item('METOD-FOUR', 'Caisson four', { x: 60, y: 160, z: 0 }, { w: 60, d: 60, h: 80 }, 359),
      item('METOD-100-WHITE', 'Bas 100', { x: 120, y: 160, z: 0 }, { w: 100, d: 60, h: 80 }, 239),
      item('METOD-80-WHITE', 'Bas 80', { x: 220, y: 160, z: 0 }, { w: 100, d: 60, h: 80 }, 199),
    ],
  },

  {
    id: 'island-large',
    name: 'Avec îlot (16 m²)',
    blurb: 'Cuisine de standing. Îlot central 240 × 100 cm.',
    layout: 'ISLAND',
    widthCm: 480,
    depthCm: 380,
    heightCm: 270,
    coverUrl: '/templates/island.jpg',
    items: [
      // Mur arrière
      item(
        'METOD-FRIGO-AMER',
        'Frigo américain 90',
        { x: 0, y: 0, z: 0 },
        { w: 90, d: 65, h: 220 },
        1290
      ),
      item(
        'METOD-FOUR-V',
        'Colonne four + micro-ondes',
        { x: 90, y: 0, z: 0 },
        { w: 60, d: 60, h: 220 },
        689
      ),
      item(
        'METOD-100-BLACK',
        'Bas 100 noir mat',
        { x: 150, y: 0, z: 0 },
        { w: 100, d: 60, h: 80 },
        269
      ),
      item(
        'METOD-PLAQUE-80',
        'Plaque induction 80',
        { x: 250, y: 0, z: 0 },
        { w: 80, d: 60, h: 80 },
        229
      ),
      item('METOD-80-BLACK', 'Bas 80 noir', { x: 330, y: 0, z: 0 }, { w: 80, d: 60, h: 80 }, 209),
      item('METOD-COIN', 'Coin retour', { x: 410, y: 0, z: 0 }, { w: 80, d: 80, h: 80 }, 289),
      // Îlot central (rotation 0, position centrée)
      item(
        'METOD-ILOT-EVIER',
        'Îlot évier + rangement',
        { x: 120, y: 200, z: 0 },
        { w: 240, d: 100, h: 90 },
        1450
      ),
    ],
  },

  {
    id: 'open-plan',
    name: 'Ouverte sur séjour (14 m²)',
    blurb: 'Bar de transition vers le salon. Esthétique salon-cuisine.',
    layout: 'OPEN_PLAN',
    widthCm: 420,
    depthCm: 320,
    heightCm: 270,
    coverUrl: '/templates/open.jpg',
    items: [
      item('METOD-EVIER-80', 'Évier 80', { x: 0, y: 0, z: 0 }, { w: 80, d: 60, h: 80 }, 249),
      item(
        'METOD-LAVE-VAIS',
        'Lave-vaisselle',
        { x: 80, y: 0, z: 0 },
        { w: 60, d: 60, h: 80 },
        449
      ),
      item('METOD-100-WHITE', 'Bas 100', { x: 140, y: 0, z: 0 }, { w: 100, d: 60, h: 80 }, 239),
      item('METOD-PLAQUE-60', 'Plaque 60', { x: 240, y: 0, z: 0 }, { w: 60, d: 60, h: 80 }, 209),
      item('METOD-FOUR', 'Four 60', { x: 300, y: 0, z: 0 }, { w: 60, d: 60, h: 80 }, 359),
      item('METOD-FRIGO', 'Frigo 60', { x: 360, y: 0, z: 0 }, { w: 60, d: 60, h: 220 }, 489),
      // Bar de séparation
      item('METOD-BAR', 'Bar haut 240', { x: 90, y: 200, z: 0 }, { w: 240, d: 60, h: 110 }, 890),
    ],
  },

  {
    id: 'atypical',
    name: 'Atypique (sous-pente)',
    blurb: 'Pour combles, sous-pentes, formes irrégulières. À personnaliser.',
    layout: 'ONE_WALL',
    widthCm: 380,
    depthCm: 200,
    heightCm: 220,
    coverUrl: '/templates/atypical.jpg',
    items: [
      item(
        'METOD-FRIGO-BAS',
        'Frigo top 60 (sous-plan)',
        { x: 0, y: 0, z: 0 },
        { w: 60, d: 60, h: 80 },
        449
      ),
      item(
        'METOD-LAVE-VAIS',
        'Lave-vaisselle 45',
        { x: 60, y: 0, z: 0 },
        { w: 45, d: 60, h: 80 },
        419
      ),
      item('METOD-EVIER-60', 'Évier 60', { x: 105, y: 0, z: 0 }, { w: 60, d: 60, h: 80 }, 219),
      item('METOD-80-WHITE', 'Bas 80', { x: 165, y: 0, z: 0 }, { w: 80, d: 60, h: 80 }, 199),
      item('METOD-PLAQUE-60', 'Plaque 60', { x: 245, y: 0, z: 0 }, { w: 60, d: 60, h: 80 }, 209),
      item(
        'METOD-FOUR-COMP',
        'Four compact 60',
        { x: 305, y: 0, z: 0 },
        { w: 60, d: 60, h: 60 },
        379
      ),
      item('METOD-60-WHITE', 'Bas 60', { x: 305, y: 60, z: 0 }, { w: 60, d: 60, h: 80 }, 169),
    ],
  },
];

/** Lookup helper used by /designer/sandbox/:templateId */
export function findTemplate(id: string): SandboxTemplate | null {
  return SANDBOX_TEMPLATES.find((t) => t.id === id) ?? null;
}
