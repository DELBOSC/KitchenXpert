/**
 * Catalogs Seed
 * Sample catalog items with dimensions for kitchen design
 *
 * Prisma tables: "ProductCategory", "Product"
 */

import type { Seed, Transaction } from './seed-runner';
import logger from '../../utils/logger';

export const CatalogsSeed: Seed = {
  id: 'catalogs-seed',
  name: 'Sample Catalog Items',
  order: 30,

  async run(tx: Transaction): Promise<void> {
    const now = new Date().toISOString();

    // Insert categories
    await tx.execute(`
      INSERT INTO "ProductCategory" (id, name, slug, description, "sortOrder", "isActive", "createdAt", "updatedAt")
      VALUES
        ('c1000000-0000-0000-0000-000000000001', 'Meubles bas', 'meubles-bas', 'Caissons et meubles de rangement bas', 1, true, $1, $1),
        ('c1000000-0000-0000-0000-000000000002', 'Meubles hauts', 'meubles-hauts', 'Caissons et meubles muraux', 2, true, $1, $1),
        ('c1000000-0000-0000-0000-000000000003', 'Colonnes', 'colonnes', 'Meubles colonnes et armoires', 3, true, $1, $1),
        ('c1000000-0000-0000-0000-000000000004', 'Plans de travail', 'plans-de-travail', 'Surfaces de travail', 4, true, $1, $1),
        ('c1000000-0000-0000-0000-000000000005', 'Electromenager cuisson', 'electromenager-cuisson', 'Plaques, fours, hottes', 5, true, $1, $1),
        ('c1000000-0000-0000-0000-000000000006', 'Electromenager froid', 'electromenager-froid', 'Refrigerateurs et congelateurs', 6, true, $1, $1),
        ('c1000000-0000-0000-0000-000000000007', 'Eviers et robinetterie', 'eviers-robinetterie', 'Eviers, robinets', 7, true, $1, $1),
        ('c1000000-0000-0000-0000-000000000008', 'Electromenager lavage', 'electromenager-lavage', 'Lave-vaisselle, lave-linge', 8, true, $1, $1)
      ON CONFLICT (slug) DO NOTHING
    `, [now]);

    // Meubles bas
    await tx.execute(`
      INSERT INTO "Product" (id, sku, name, description, brand, "categoryId", price, currency, width, height, depth, material, color, specifications, "isActive", "createdAt", "updatedAt")
      VALUES
        ('p1000000-0000-0000-0000-000000000001', 'MB-60-STD', 'Meuble bas 60cm 2 portes',
         'Caisson bas standard avec 2 portes et 1 etagere', 'Schmidt',
         'c1000000-0000-0000-0000-000000000001', 299.00, 'EUR', 60.0, 87.0, 56.0,
         'melamine', 'blanc', '{"loadCapacity": 25, "shelves": 1, "hingeType": "softClose"}', true, $1, $1),
        ('p1000000-0000-0000-0000-000000000002', 'MB-80-STD', 'Meuble bas 80cm 2 portes',
         'Caisson bas large avec 2 portes', 'Schmidt',
         'c1000000-0000-0000-0000-000000000001', 349.00, 'EUR', 80.0, 87.0, 56.0,
         'melamine', 'blanc', '{"loadCapacity": 30, "shelves": 2}', true, $1, $1),
        ('p1000000-0000-0000-0000-000000000003', 'MB-60-TIR', 'Meuble bas 60cm 3 tiroirs',
         'Caisson bas avec 3 tiroirs coulissants', 'Schmidt',
         'c1000000-0000-0000-0000-000000000001', 449.00, 'EUR', 60.0, 87.0, 56.0,
         'melamine', 'blanc', '{"drawers": 3, "drawerType": "fullExtension"}', true, $1, $1),
        ('p1000000-0000-0000-0000-000000000004', 'MB-EVIER-80', 'Meuble sous-evier 80cm',
         'Caisson sous evier avec 2 portes', 'Schmidt',
         'c1000000-0000-0000-0000-000000000001', 279.00, 'EUR', 80.0, 87.0, 56.0,
         'melamine hydrofuge', 'blanc', '{"sinkCutout": true}', true, $1, $1)
      ON CONFLICT (sku) DO NOTHING
    `, [now]);

    // Meubles hauts
    await tx.execute(`
      INSERT INTO "Product" (id, sku, name, description, brand, "categoryId", price, currency, width, height, depth, material, color, specifications, "isActive", "createdAt", "updatedAt")
      VALUES
        ('p2000000-0000-0000-0000-000000000001', 'MH-60-STD', 'Meuble haut 60cm 2 portes',
         'Meuble mural standard', 'Schmidt',
         'c1000000-0000-0000-0000-000000000002', 199.00, 'EUR', 60.0, 72.0, 32.0,
         'melamine', 'blanc', '{"loadCapacity": 15, "shelves": 2}', true, $1, $1),
        ('p2000000-0000-0000-0000-000000000002', 'MH-80-STD', 'Meuble haut 80cm 2 portes',
         'Meuble mural large', 'Schmidt',
         'c1000000-0000-0000-0000-000000000002', 249.00, 'EUR', 80.0, 72.0, 32.0,
         'melamine', 'blanc', '{"loadCapacity": 18, "shelves": 2}', true, $1, $1)
      ON CONFLICT (sku) DO NOTHING
    `, [now]);

    // Electromenager cuisson + froid + lavage
    await tx.execute(`
      INSERT INTO "Product" (id, sku, name, description, brand, "categoryId", price, currency, width, height, depth, specifications, "isActive", "createdAt", "updatedAt")
      VALUES
        ('p3000000-0000-0000-0000-000000000001', 'PI-60-4Z', 'Plaque induction 60cm 4 zones',
         'Table de cuisson induction 4 foyers', 'Bosch',
         'c1000000-0000-0000-0000-000000000005', 699.00, 'EUR', 59.0, 5.5, 52.0,
         '{"power": 7400, "zones": 4, "booster": true}', true, $1, $1),
        ('p3000000-0000-0000-0000-000000000002', 'FE-60-PYR', 'Four encastrable 60cm pyrolyse',
         'Four multifonction pyrolyse A+', 'Bosch',
         'c1000000-0000-0000-0000-000000000005', 899.00, 'EUR', 59.5, 59.5, 54.8,
         '{"volume": 71, "modes": 10, "pyrolysis": true}', true, $1, $1),
        ('p4000000-0000-0000-0000-000000000001', 'RF-178-INT', 'Refrigerateur integrable 178cm',
         'Refrigerateur 1 porte integrable', 'Liebherr',
         'c1000000-0000-0000-0000-000000000006', 1099.00, 'EUR', 56.0, 177.2, 55.0,
         '{"volumeFridge": 301, "energyClass": "E"}', true, $1, $1),
        ('p6000000-0000-0000-0000-000000000001', 'LV-60-INT', 'Lave-vaisselle 60cm integrable',
         'Lave-vaisselle integre 14 couverts', 'Bosch',
         'c1000000-0000-0000-0000-000000000008', 799.00, 'EUR', 59.8, 81.5, 55.0,
         '{"capacity": 14, "programs": 6}', true, $1, $1)
      ON CONFLICT (sku) DO NOTHING
    `, [now]);

    // Eviers + Plans de travail
    await tx.execute(`
      INSERT INTO "Product" (id, sku, name, description, brand, "categoryId", price, currency, width, height, depth, material, specifications, "isActive", "createdAt", "updatedAt")
      VALUES
        ('p5000000-0000-0000-0000-000000000001', 'EV-80-1B', 'Evier inox 1 grand bac 80cm',
         'Evier encastrable 1 bac XL', 'Franke',
         'c1000000-0000-0000-0000-000000000007', 349.00, 'EUR', 80.0, 20.0, 50.0,
         'inox 18/10', '{"bowls": 1, "drainer": true}', true, $1, $1),
        ('p7000000-0000-0000-0000-000000000001', 'PDT-300-STR', 'Plan de travail stratifie 300x65cm',
         'Plan de travail stratifie 38mm', 'Schmidt',
         'c1000000-0000-0000-0000-000000000004', 199.00, 'EUR', 300.0, 3.8, 65.0,
         'stratifie', '{"thickness": 38}', true, $1, $1)
      ON CONFLICT (sku) DO NOTHING
    `, [now]);

    logger.info('[Seed] Created catalog with 8 categories and 12 products');
  },

  async cleanup(tx: Transaction): Promise<void> {
    await tx.execute(`DELETE FROM "Product" WHERE sku LIKE 'MB-%' OR sku LIKE 'MH-%' OR sku LIKE 'PI-%' OR sku LIKE 'FE-%' OR sku LIKE 'RF-%' OR sku LIKE 'LV-%' OR sku LIKE 'EV-%' OR sku LIKE 'PDT-%'`);
    await tx.execute(`DELETE FROM "ProductCategory" WHERE slug IN ('meubles-bas','meubles-hauts','colonnes','plans-de-travail','electromenager-cuisson','electromenager-froid','eviers-robinetterie','electromenager-lavage')`);
  },
};

export default CatalogsSeed;
