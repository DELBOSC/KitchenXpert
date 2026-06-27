/**
 * Provider Catalogs Seed
 *
 * Populates `CatalogProvider`, `Product`, and `Appliance` rows so that the
 * provider-routes-factory endpoints (Leroy Merlin, Castorama, Schmidt, Bosch)
 * return real-looking data even before any scraping job is wired up.
 *
 * Realistic dimensions are taken from public manufacturer specs:
 *   - Schmidt 1830 / Arcos modular system
 *   - Castorama "GoodHome Caraway/Stevia" range
 *   - Leroy Merlin "DELINIA / EPURE" range
 *   - Bosch Serie 2/4/6/8 built-in appliances
 *
 * IKEA is intentionally seeded with a tiny "starter" set — the live IKEA API
 * is the canonical source there.
 */

import type { Seed, Transaction } from './seed-runner';

const PROVIDERS = [
  { id: 'prov-ikea', code: 'ikea', name: 'IKEA' },
  { id: 'prov-lm', code: 'leroy-merlin', name: 'Leroy Merlin' },
  { id: 'prov-cas', code: 'castorama', name: 'Castorama' },
  { id: 'prov-sch', code: 'schmidt', name: 'Schmidt' },
  { id: 'prov-bos', code: 'bosch', name: 'Bosch' },
] as const;

interface ProductSeed {
  sku: string;
  name: string;
  description: string;
  category:
    | 'meubles-bas'
    | 'meubles-hauts'
    | 'colonnes'
    | 'plans-de-travail'
    | 'eviers-robinetterie';
  width: number; // cm
  depth: number; // cm
  height: number; // cm
  price: number;
  brand: string;
  material?: string;
  color?: string;
}

interface ApplianceSeed {
  type: 'oven' | 'cooktop' | 'hood' | 'dishwasher' | 'fridge' | 'microwave';
  model: string;
  name: string;
  description: string;
  width: number;
  depth: number;
  height: number;
  price: number;
  energyRating: string;
  features?: string[];
}

// --- Schmidt (premium FR, no online prices but listed for reference) ---------
const SCHMIDT_PRODUCTS: ProductSeed[] = [
  {
    sku: 'SCH-MB-60-2P',
    name: 'Meuble bas 60 cm 2 portes',
    description: 'Caisson Arcos 2 portes softclose',
    category: 'meubles-bas',
    width: 60,
    depth: 56,
    height: 87,
    price: 320,
    brand: 'Schmidt',
    material: 'mélaminé',
    color: 'blanc mat',
  },
  {
    sku: 'SCH-MB-80-2P',
    name: 'Meuble bas 80 cm 2 portes',
    description: 'Caisson Arcos large',
    category: 'meubles-bas',
    width: 80,
    depth: 56,
    height: 87,
    price: 380,
    brand: 'Schmidt',
    material: 'mélaminé',
    color: 'blanc mat',
  },
  {
    sku: 'SCH-MB-90-3T',
    name: 'Meuble bas 90 cm 3 tiroirs',
    description: 'Caisson 3 tiroirs Blum',
    category: 'meubles-bas',
    width: 90,
    depth: 56,
    height: 87,
    price: 510,
    brand: 'Schmidt',
    material: 'mélaminé',
    color: 'gris cendre',
  },
  {
    sku: 'SCH-MH-60',
    name: 'Meuble haut 60 cm',
    description: 'Caisson mural 1 porte',
    category: 'meubles-hauts',
    width: 60,
    depth: 35,
    height: 72,
    price: 195,
    brand: 'Schmidt',
  },
  {
    sku: 'SCH-MH-90',
    name: 'Meuble haut 90 cm',
    description: 'Caisson mural 2 portes',
    category: 'meubles-hauts',
    width: 90,
    depth: 35,
    height: 72,
    price: 270,
    brand: 'Schmidt',
  },
  {
    sku: 'SCH-COL-60',
    name: 'Colonne 60 cm 4 tiroirs',
    description: 'Colonne pleine hauteur',
    category: 'colonnes',
    width: 60,
    depth: 56,
    height: 220,
    price: 690,
    brand: 'Schmidt',
  },
  {
    sku: 'SCH-COL-FOUR',
    name: 'Colonne four/MO 60 cm',
    description: 'Colonne four + micro-onde',
    category: 'colonnes',
    width: 60,
    depth: 56,
    height: 220,
    price: 720,
    brand: 'Schmidt',
  },
  {
    sku: 'SCH-PT-300',
    name: 'Plan de travail 300×60 cm',
    description: 'Stratifié 38 mm chêne naturel',
    category: 'plans-de-travail',
    width: 300,
    depth: 60,
    height: 3.8,
    price: 240,
    brand: 'Schmidt',
    material: 'stratifié',
    color: 'chêne naturel',
  },
  {
    sku: 'SCH-EV-80',
    name: 'Évier inox sous-plan 80 cm',
    description: 'Cuve simple soudée',
    category: 'eviers-robinetterie',
    width: 80,
    depth: 50,
    height: 19,
    price: 230,
    brand: 'Schmidt',
    material: 'inox',
  },
];

// --- Leroy Merlin DELINIA / EPURE ---------------------------------------------
const LM_PRODUCTS: ProductSeed[] = [
  {
    sku: 'LM-DEL-MB60',
    name: 'Caisson bas Delinia 60 cm',
    description: 'Bas 2 portes blanc brillant',
    category: 'meubles-bas',
    width: 60,
    depth: 58,
    height: 85,
    price: 119,
    brand: 'Delinia',
    material: 'mélaminé',
    color: 'blanc brillant',
  },
  {
    sku: 'LM-DEL-MB90',
    name: 'Caisson bas Delinia 90 cm',
    description: 'Bas grande largeur',
    category: 'meubles-bas',
    width: 90,
    depth: 58,
    height: 85,
    price: 149,
    brand: 'Delinia',
  },
  {
    sku: 'LM-DEL-MB60-3T',
    name: 'Caisson bas 3 tiroirs 60 cm',
    description: 'Tiroirs softclose',
    category: 'meubles-bas',
    width: 60,
    depth: 58,
    height: 85,
    price: 249,
    brand: 'Delinia',
  },
  {
    sku: 'LM-DEL-MH60',
    name: 'Caisson haut Delinia 60 cm',
    description: 'Mural 1 porte',
    category: 'meubles-hauts',
    width: 60,
    depth: 36,
    height: 72,
    price: 89,
    brand: 'Delinia',
  },
  {
    sku: 'LM-DEL-MH80',
    name: 'Caisson haut Delinia 80 cm',
    description: 'Mural 2 portes',
    category: 'meubles-hauts',
    width: 80,
    depth: 36,
    height: 72,
    price: 99,
    brand: 'Delinia',
  },
  {
    sku: 'LM-DEL-COL',
    name: 'Colonne Delinia 60 cm',
    description: 'Colonne 5 étagères',
    category: 'colonnes',
    width: 60,
    depth: 58,
    height: 200,
    price: 199,
    brand: 'Delinia',
  },
  {
    sku: 'LM-PT-CHENE',
    name: 'Plan travail chêne 246×64',
    description: 'Stratifié hydrofuge',
    category: 'plans-de-travail',
    width: 246,
    depth: 64,
    height: 3.8,
    price: 89,
    brand: 'Leroy Merlin',
    material: 'stratifié',
    color: 'chêne',
  },
  {
    sku: 'LM-EV-INOX-79',
    name: 'Évier inox 79 cm 1 cuve 1 égouttoir',
    description: 'Encastrable',
    category: 'eviers-robinetterie',
    width: 79,
    depth: 50,
    height: 16,
    price: 79,
    brand: 'Leroy Merlin',
    material: 'inox',
  },
];

// --- Castorama GoodHome -------------------------------------------------------
const CAS_PRODUCTS: ProductSeed[] = [
  {
    sku: 'CAS-GH-MB60',
    name: 'Caisson bas GoodHome 60 cm',
    description: 'Caraway blanc mat',
    category: 'meubles-bas',
    width: 60,
    depth: 58,
    height: 85,
    price: 105,
    brand: 'GoodHome',
    color: 'blanc mat',
  },
  {
    sku: 'CAS-GH-MB80',
    name: 'Caisson bas GoodHome 80 cm',
    description: 'Caraway blanc mat large',
    category: 'meubles-bas',
    width: 80,
    depth: 58,
    height: 85,
    price: 129,
    brand: 'GoodHome',
  },
  {
    sku: 'CAS-GH-MB100',
    name: 'Caisson bas GoodHome 100 cm',
    description: 'Stevia gris anthracite',
    category: 'meubles-bas',
    width: 100,
    depth: 58,
    height: 85,
    price: 169,
    brand: 'GoodHome',
    color: 'gris anthracite',
  },
  {
    sku: 'CAS-GH-MH60',
    name: 'Caisson haut GoodHome 60 cm',
    description: 'Mural 1 porte',
    category: 'meubles-hauts',
    width: 60,
    depth: 36,
    height: 72,
    price: 75,
    brand: 'GoodHome',
  },
  {
    sku: 'CAS-GH-MH90',
    name: 'Caisson haut GoodHome 90 cm',
    description: 'Mural 2 portes',
    category: 'meubles-hauts',
    width: 90,
    depth: 36,
    height: 72,
    price: 95,
    brand: 'GoodHome',
  },
  {
    sku: 'CAS-GH-COL',
    name: 'Colonne GoodHome 60 cm',
    description: 'Pleine hauteur 200 cm',
    category: 'colonnes',
    width: 60,
    depth: 58,
    height: 200,
    price: 179,
    brand: 'GoodHome',
  },
  {
    sku: 'CAS-PT-MARBRE',
    name: 'Plan travail marbre blanc 246×62',
    description: 'Stratifié effet marbre',
    category: 'plans-de-travail',
    width: 246,
    depth: 62,
    height: 3.8,
    price: 95,
    brand: 'Castorama',
    color: 'marbre blanc',
  },
  {
    sku: 'CAS-EV-CER',
    name: 'Évier céramique 60 cm',
    description: '1 cuve apparente',
    category: 'eviers-robinetterie',
    width: 60,
    depth: 50,
    height: 21,
    price: 159,
    brand: 'Castorama',
    material: 'céramique',
  },
];

// --- IKEA METOD starter set ---------------------------------------------------
const IKEA_PRODUCTS: ProductSeed[] = [
  {
    sku: 'IKEA-METOD-BAS-60',
    name: 'METOD caisson bas 60 cm',
    description: 'Châssis bas blanc',
    category: 'meubles-bas',
    width: 60,
    depth: 60,
    height: 80,
    price: 65,
    brand: 'IKEA',
    color: 'blanc',
  },
  {
    sku: 'IKEA-METOD-BAS-80',
    name: 'METOD caisson bas 80 cm',
    description: 'Châssis bas blanc',
    category: 'meubles-bas',
    width: 80,
    depth: 60,
    height: 80,
    price: 80,
    brand: 'IKEA',
    color: 'blanc',
  },
  {
    sku: 'IKEA-METOD-MUR-60',
    name: 'METOD caisson mural 60×60',
    description: 'Châssis mural',
    category: 'meubles-hauts',
    width: 60,
    depth: 37,
    height: 60,
    price: 50,
    brand: 'IKEA',
  },
  {
    sku: 'IKEA-METOD-COL-60',
    name: 'METOD colonne 60×60×200',
    description: 'Châssis pleine hauteur',
    category: 'colonnes',
    width: 60,
    depth: 60,
    height: 200,
    price: 130,
    brand: 'IKEA',
  },
  {
    sku: 'IKEA-EKBACKEN',
    name: 'EKBACKEN plan de travail 246×63',
    description: 'Stratifié',
    category: 'plans-de-travail',
    width: 246,
    depth: 63,
    height: 2.8,
    price: 79,
    brand: 'IKEA',
    material: 'stratifié',
  },
];

// --- Bosch built-in appliances ------------------------------------------------
const BOSCH_APPLIANCES: ApplianceSeed[] = [
  {
    type: 'oven',
    model: 'HBA533BS0',
    name: 'Bosch Serie 4 four encastrable',
    description: 'Four multifonction 71L EcoClean',
    width: 59.5,
    depth: 54.8,
    height: 59.5,
    price: 549,
    energyRating: 'A',
    features: ['EcoClean', 'AutoPilot', '71L'],
  },
  {
    type: 'oven',
    model: 'HBG675BS1',
    name: 'Bosch Serie 8 four pyrolyse',
    description: 'Pyrolyse 71L',
    width: 59.5,
    depth: 54.8,
    height: 59.5,
    price: 999,
    energyRating: 'A+',
    features: ['pyrolyse', 'TFT 4.3"', 'sonde'],
  },
  {
    type: 'cooktop',
    model: 'PUE611BB5E',
    name: 'Bosch Serie 4 plaque induction 60 cm',
    description: '4 foyers PowerBoost',
    width: 59.2,
    depth: 52.2,
    height: 5.1,
    price: 449,
    energyRating: 'A',
    features: ['PowerBoost', '4 foyers'],
  },
  {
    type: 'cooktop',
    model: 'PXX875D67E',
    name: 'Bosch Serie 8 plaque induction 80 cm',
    description: '5 foyers FlexInduction',
    width: 81.6,
    depth: 52.7,
    height: 5.4,
    price: 1199,
    energyRating: 'A++',
    features: ['FlexInduction', 'CombiZone'],
  },
  {
    type: 'hood',
    model: 'DWB66BC50',
    name: 'Bosch hotte décorative 60 cm',
    description: '590 m³/h',
    width: 60,
    depth: 50,
    height: 81.5,
    price: 379,
    energyRating: 'A',
    features: ['590 m³/h', 'LED'],
  },
  {
    type: 'hood',
    model: 'DWK87EM60',
    name: 'Bosch Serie 6 hotte 80 cm',
    description: 'Murale inclinée',
    width: 80,
    depth: 49.9,
    height: 87.4,
    price: 599,
    energyRating: 'A+',
  },
  {
    type: 'dishwasher',
    model: 'SMV4HCX48E',
    name: 'Bosch Serie 4 lave-vaisselle full',
    description: '14 couverts 44 dB',
    width: 59.8,
    depth: 55,
    height: 81.5,
    price: 549,
    energyRating: 'D',
    features: ['14 couverts', '44 dB', 'AquaStop'],
  },
  {
    type: 'dishwasher',
    model: 'SMV6ZCX49E',
    name: 'Bosch Serie 6 lave-vaisselle silencieux',
    description: '14 couverts 42 dB Zeolith',
    width: 59.8,
    depth: 55,
    height: 81.5,
    price: 849,
    energyRating: 'C',
    features: ['14 couverts', '42 dB', 'Zeolith'],
  },
  {
    type: 'fridge',
    model: 'KIN86VFE0',
    name: 'Bosch Serie 4 réfrigérateur encastrable',
    description: '254L combiné NoFrost',
    width: 55.8,
    depth: 54.5,
    height: 177.2,
    price: 999,
    energyRating: 'E',
    features: ['254L', 'NoFrost', 'VitaFresh'],
  },
  {
    type: 'fridge',
    model: 'KAD93VBFP',
    name: 'Bosch Serie 6 SBS',
    description: 'Side-by-side 533L',
    width: 90.8,
    depth: 70.7,
    height: 177,
    price: 1899,
    energyRating: 'F',
    features: ['533L', 'NoFrost', 'eau/glace'],
  },
  {
    type: 'microwave',
    model: 'BFL524MS0',
    name: 'Bosch Serie 4 micro-ondes encastrable',
    description: '20L 800W',
    width: 59.4,
    depth: 31.7,
    height: 38.2,
    price: 299,
    energyRating: 'A',
    features: ['20L', '800W'],
  },
];

const SLUG_TO_ID: Record<string, string> = {
  'meubles-bas': 'c1000000-0000-0000-0000-000000000001',
  'meubles-hauts': 'c1000000-0000-0000-0000-000000000002',
  colonnes: 'c1000000-0000-0000-0000-000000000003',
  'plans-de-travail': 'c1000000-0000-0000-0000-000000000004',
  'eviers-robinetterie': 'c1000000-0000-0000-0000-000000000007',
};

export const ProviderCatalogsSeed: Seed = {
  id: 'provider-catalogs-seed',
  name: 'Provider Catalogs (IKEA, Leroy Merlin, Castorama, Schmidt, Bosch)',
  order: 31,

  async run(tx: Transaction): Promise<void> {
    const now = new Date().toISOString();

    // 1) Catalog providers
    for (const p of PROVIDERS) {
      await tx.execute(
        `INSERT INTO "CatalogProvider" (id, name, code, "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, true, $4, $4)
         ON CONFLICT (code) DO NOTHING`,
        [p.id, p.name, p.code, now]
      );
    }

    // 2) Furniture products. Generated SKU-deterministic UUIDs keep re-runs idempotent.
    const insert = async (provId: string, items: ProductSeed[]): Promise<void> => {
      for (const it of items) {
        const id = `prod-${it.sku
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .slice(0, 30)}`;
        await tx.execute(
          `INSERT INTO "Product" (id, sku, name, description, brand, "providerId", "categoryId",
              price, currency, width, depth, height, material, color, "isActive", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'EUR', $9, $10, $11, $12, $13, true, $14, $14)
           ON CONFLICT (sku) DO UPDATE SET "providerId" = EXCLUDED."providerId"`,
          [
            id,
            it.sku,
            it.name,
            it.description,
            it.brand,
            provId,
            SLUG_TO_ID[it.category],
            it.price,
            it.width,
            it.depth,
            it.height,
            it.material ?? null,
            it.color ?? null,
            now,
          ]
        );
      }
    };

    await insert('prov-ikea', IKEA_PRODUCTS);
    await insert('prov-lm', LM_PRODUCTS);
    await insert('prov-cas', CAS_PRODUCTS);
    await insert('prov-sch', SCHMIDT_PRODUCTS);

    // 3) Bosch appliances — Appliance has its own table.
    for (const a of BOSCH_APPLIANCES) {
      const id = `appl-bosch-${a.model.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      await tx.execute(
        `INSERT INTO "Appliance" (id, "providerId", type, brand, model, name, description,
            price, currency, "energyRating", width, depth, height, features, "isActive",
            "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'Bosch', $4, $5, $6, $7, 'EUR', $8, $9, $10, $11, $12, true, $13, $13)
         ON CONFLICT (brand, model) DO UPDATE SET "providerId" = EXCLUDED."providerId"`,
        [
          id,
          'prov-bos',
          a.type,
          a.model,
          a.name,
          a.description,
          a.price,
          a.energyRating,
          a.width,
          a.depth,
          a.height,
          JSON.stringify(a.features ?? []),
          now,
        ]
      );
    }
  },

  async cleanup(tx: Transaction): Promise<void> {
    await tx.execute(
      `DELETE FROM "Product" WHERE "providerId" IN ('prov-ikea','prov-lm','prov-cas','prov-sch')`
    );
    await tx.execute(`DELETE FROM "Appliance" WHERE "providerId" = 'prov-bos'`);
    await tx.execute(
      `DELETE FROM "CatalogProvider" WHERE code IN ('ikea','leroy-merlin','castorama','schmidt','bosch')`
    );
  },
};
