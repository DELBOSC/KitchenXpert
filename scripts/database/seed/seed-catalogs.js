#!/usr/bin/env node
/**
 * Seed Catalogs - KitchenXpert
 *
 * Seeds product catalogs with kitchen components, appliances, and materials.
 */

const crypto = require('crypto');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}[CATALOGS]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[CATALOGS]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[CATALOGS]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[CATALOGS]${colors.reset} ${msg}`),
};

function generateId() {
  return crypto.randomUUID();
}

// Product categories
const categories = [
  { id: 'cat-cabinets', name: 'Meubles', slug: 'meubles', parent: null },
  { id: 'cat-cabinets-base', name: 'Meubles bas', slug: 'meubles-bas', parent: 'cat-cabinets' },
  { id: 'cat-cabinets-wall', name: 'Meubles hauts', slug: 'meubles-hauts', parent: 'cat-cabinets' },
  { id: 'cat-cabinets-tall', name: 'Colonnes', slug: 'colonnes', parent: 'cat-cabinets' },
  { id: 'cat-worktops', name: 'Plans de travail', slug: 'plans-de-travail', parent: null },
  { id: 'cat-appliances', name: 'Électroménager', slug: 'electromenager', parent: null },
  { id: 'cat-appliances-cooking', name: 'Cuisson', slug: 'cuisson', parent: 'cat-appliances' },
  { id: 'cat-appliances-cold', name: 'Froid', slug: 'froid', parent: 'cat-appliances' },
  { id: 'cat-appliances-wash', name: 'Lavage', slug: 'lavage', parent: 'cat-appliances' },
  { id: 'cat-sinks', name: 'Éviers', slug: 'eviers', parent: null },
  { id: 'cat-handles', name: 'Poignées', slug: 'poignees', parent: null },
  { id: 'cat-lighting', name: 'Éclairage', slug: 'eclairage', parent: null },
];

// Sample products
const products = [
  // Base cabinets
  {
    id: generateId(),
    sku: 'MB-60-1P',
    name: 'Meuble bas 1 porte 60cm',
    slug: 'meuble-bas-1-porte-60cm',
    categoryId: 'cat-cabinets-base',
    description: 'Meuble bas de cuisine avec 1 porte et 1 étagère réglable.',
    shortDescription: 'Meuble bas 60cm, 1 porte',
    price: 149.00,
    currency: 'EUR',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    dimensions: { width: 60, height: 82, depth: 58, unit: 'cm' },
    weight: { value: 25, unit: 'kg' },
    materials: ['particleboard', 'melamine'],
    colors: ['blanc', 'gris', 'chêne', 'noir'],
    finishes: ['mat', 'brillant'],
    stock: { available: 150, reserved: 12 },
    images: ['/images/products/mb-60-1p-blanc.jpg'],
    specifications: {
      hinges: 'soft-close',
      adjustableFeet: true,
      maxLoad: 25,
    },
  },
  {
    id: generateId(),
    sku: 'MB-80-2T',
    name: 'Meuble bas 2 tiroirs 80cm',
    slug: 'meuble-bas-2-tiroirs-80cm',
    categoryId: 'cat-cabinets-base',
    description: 'Meuble bas de cuisine avec 2 grands tiroirs coulissants.',
    shortDescription: 'Meuble bas 80cm, 2 tiroirs',
    price: 249.00,
    currency: 'EUR',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    dimensions: { width: 80, height: 82, depth: 58, unit: 'cm' },
    weight: { value: 35, unit: 'kg' },
    materials: ['particleboard', 'melamine'],
    colors: ['blanc', 'gris', 'chêne', 'noir'],
    finishes: ['mat', 'brillant'],
    stock: { available: 85, reserved: 8 },
    images: ['/images/products/mb-80-2t-blanc.jpg'],
    specifications: {
      drawerSystem: 'full-extension',
      softClose: true,
      maxLoad: 30,
    },
  },
  {
    id: generateId(),
    sku: 'MB-EVIER-80',
    name: 'Meuble sous-évier 80cm',
    slug: 'meuble-sous-evier-80cm',
    categoryId: 'cat-cabinets-base',
    description: 'Meuble bas spécial évier avec 2 portes et espace plomberie.',
    shortDescription: 'Meuble sous-évier 80cm',
    price: 179.00,
    currency: 'EUR',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    dimensions: { width: 80, height: 82, depth: 58, unit: 'cm' },
    weight: { value: 28, unit: 'kg' },
    materials: ['particleboard', 'melamine'],
    colors: ['blanc', 'gris'],
    stock: { available: 60, reserved: 5 },
    specifications: {
      waterproofBase: true,
      hinges: 'soft-close',
    },
  },

  // Wall cabinets
  {
    id: generateId(),
    sku: 'MH-60-1P',
    name: 'Meuble haut 1 porte 60cm',
    slug: 'meuble-haut-1-porte-60cm',
    categoryId: 'cat-cabinets-wall',
    description: 'Meuble haut de cuisine avec 1 porte et 2 étagères réglables.',
    shortDescription: 'Meuble haut 60cm, 1 porte',
    price: 99.00,
    currency: 'EUR',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    dimensions: { width: 60, height: 72, depth: 35, unit: 'cm' },
    weight: { value: 15, unit: 'kg' },
    materials: ['particleboard', 'melamine'],
    colors: ['blanc', 'gris', 'chêne', 'noir'],
    finishes: ['mat', 'brillant'],
    stock: { available: 200, reserved: 15 },
    specifications: {
      hinges: 'soft-close',
      shelves: 2,
      adjustableShelves: true,
    },
  },
  {
    id: generateId(),
    sku: 'MH-VITRINE-40',
    name: 'Meuble haut vitrine 40cm',
    slug: 'meuble-haut-vitrine-40cm',
    categoryId: 'cat-cabinets-wall',
    description: 'Meuble haut vitré avec porte en verre et éclairage LED intégré.',
    shortDescription: 'Vitrine 40cm avec LED',
    price: 189.00,
    currency: 'EUR',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    dimensions: { width: 40, height: 72, depth: 35, unit: 'cm' },
    weight: { value: 18, unit: 'kg' },
    materials: ['particleboard', 'glass', 'led'],
    colors: ['blanc', 'noir'],
    stock: { available: 45, reserved: 3 },
    specifications: {
      glassType: 'tempered',
      ledIncluded: true,
      hinges: 'soft-close',
    },
  },

  // Tall cabinets
  {
    id: generateId(),
    sku: 'COL-60-FRIGO',
    name: 'Colonne réfrigérateur 60cm',
    slug: 'colonne-refrigerateur-60cm',
    categoryId: 'cat-cabinets-tall',
    description: 'Colonne pour réfrigérateur encastrable, hauteur 200cm.',
    shortDescription: 'Colonne frigo 60x200cm',
    price: 299.00,
    currency: 'EUR',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    dimensions: { width: 60, height: 200, depth: 58, unit: 'cm' },
    weight: { value: 45, unit: 'kg' },
    materials: ['particleboard', 'melamine'],
    colors: ['blanc', 'gris'],
    stock: { available: 30, reserved: 2 },
    specifications: {
      ventilation: true,
      applianceHeight: 178,
    },
  },

  // Worktops
  {
    id: generateId(),
    sku: 'PDT-STRATIFIE-300',
    name: 'Plan de travail stratifié 300cm',
    slug: 'plan-travail-stratifie-300cm',
    categoryId: 'cat-worktops',
    description: 'Plan de travail en stratifié haute résistance, épaisseur 38mm.',
    shortDescription: 'Stratifié 300x65cm, ép. 38mm',
    price: 149.00,
    currency: 'EUR',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    dimensions: { width: 300, height: 3.8, depth: 65, unit: 'cm' },
    weight: { value: 35, unit: 'kg' },
    materials: ['stratified', 'chipboard'],
    colors: ['blanc', 'gris béton', 'chêne', 'noir', 'marbre blanc'],
    stock: { available: 100, reserved: 8 },
    specifications: {
      waterResistant: true,
      heatResistant: 180,
      scratchResistant: true,
    },
  },
  {
    id: generateId(),
    sku: 'PDT-QUARTZ-300',
    name: 'Plan de travail quartz 300cm',
    slug: 'plan-travail-quartz-300cm',
    categoryId: 'cat-worktops',
    description: 'Plan de travail en quartz reconstitué, ultra résistant.',
    shortDescription: 'Quartz 300x65cm, ép. 20mm',
    price: 899.00,
    currency: 'EUR',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    dimensions: { width: 300, height: 2, depth: 65, unit: 'cm' },
    weight: { value: 85, unit: 'kg' },
    materials: ['quartz'],
    colors: ['blanc calacatta', 'gris', 'noir', 'beige'],
    stock: { available: 25, reserved: 4 },
    specifications: {
      waterResistant: true,
      heatResistant: 300,
      scratchResistant: true,
      nonPorous: true,
    },
  },

  // Appliances
  {
    id: generateId(),
    sku: 'FOUR-PYRO-60',
    name: 'Four encastrable pyrolyse 60cm',
    slug: 'four-encastrable-pyrolyse-60cm',
    categoryId: 'cat-appliances-cooking',
    description: 'Four multifonction avec nettoyage par pyrolyse, classe A+.',
    shortDescription: 'Four pyrolyse 72L, A+',
    price: 599.00,
    currency: 'EUR',
    brand: 'Bosch',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    dimensions: { width: 60, height: 60, depth: 55, unit: 'cm' },
    weight: { value: 35, unit: 'kg' },
    stock: { available: 40, reserved: 6 },
    specifications: {
      capacity: 72,
      energyClass: 'A+',
      programs: 10,
      pyrolysis: true,
      timer: true,
    },
  },
  {
    id: generateId(),
    sku: 'PLAQUE-INDUCTION-60',
    name: 'Plaque induction 4 zones 60cm',
    slug: 'plaque-induction-4-zones-60cm',
    categoryId: 'cat-appliances-cooking',
    description: 'Table de cuisson induction avec 4 zones et booster.',
    shortDescription: 'Induction 4 zones, 7200W',
    price: 449.00,
    currency: 'EUR',
    brand: 'Electrolux',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    dimensions: { width: 60, height: 5, depth: 52, unit: 'cm' },
    weight: { value: 12, unit: 'kg' },
    stock: { available: 55, reserved: 8 },
    specifications: {
      zones: 4,
      power: 7200,
      booster: true,
      touchControl: true,
      childLock: true,
    },
  },
  {
    id: generateId(),
    sku: 'FRIGO-COMBI-178',
    name: 'Réfrigérateur combiné encastrable 178cm',
    slug: 'refrigerateur-combine-encastrable-178cm',
    categoryId: 'cat-appliances-cold',
    description: 'Réfrigérateur combiné No Frost avec congélateur en bas.',
    shortDescription: 'Combi 250L, No Frost, A++',
    price: 799.00,
    currency: 'EUR',
    brand: 'Samsung',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    dimensions: { width: 54, height: 178, depth: 55, unit: 'cm' },
    weight: { value: 65, unit: 'kg' },
    stock: { available: 20, reserved: 3 },
    specifications: {
      fridgeCapacity: 190,
      freezerCapacity: 60,
      energyClass: 'A++',
      noFrost: true,
      noise: 38,
    },
  },
  {
    id: generateId(),
    sku: 'LV-ENCASTRABLE-60',
    name: 'Lave-vaisselle encastrable 60cm',
    slug: 'lave-vaisselle-encastrable-60cm',
    categoryId: 'cat-appliances-wash',
    description: 'Lave-vaisselle 14 couverts avec séchage parfait.',
    shortDescription: 'LV 14 couverts, A+++',
    price: 549.00,
    currency: 'EUR',
    brand: 'Miele',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    dimensions: { width: 60, height: 82, depth: 55, unit: 'cm' },
    weight: { value: 45, unit: 'kg' },
    stock: { available: 35, reserved: 5 },
    specifications: {
      capacity: 14,
      energyClass: 'A+++',
      programs: 8,
      noise: 42,
      quickWash: true,
    },
  },

  // Sinks
  {
    id: generateId(),
    sku: 'EVIER-INOX-2BACS',
    name: 'Évier inox 2 bacs',
    slug: 'evier-inox-2-bacs',
    categoryId: 'cat-sinks',
    description: 'Évier en acier inoxydable avec 2 bacs et égouttoir.',
    shortDescription: 'Inox 2 bacs + égouttoir',
    price: 189.00,
    currency: 'EUR',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    dimensions: { width: 116, height: 20, depth: 50, unit: 'cm' },
    weight: { value: 8, unit: 'kg' },
    materials: ['stainless-steel'],
    stock: { available: 70, reserved: 4 },
    specifications: {
      material: 'inox 18/10',
      thickness: 0.8,
      bowls: 2,
      drainer: true,
    },
  },

  // Handles
  {
    id: generateId(),
    sku: 'POIGNEE-BARRE-192',
    name: 'Poignée barre inox 192mm',
    slug: 'poignee-barre-inox-192mm',
    categoryId: 'cat-handles',
    description: 'Poignée de meuble en acier inoxydable brossé.',
    shortDescription: 'Barre inox brossé 192mm',
    price: 8.90,
    currency: 'EUR',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    dimensions: { width: 20, height: 3.5, depth: 1, unit: 'cm' },
    weight: { value: 0.15, unit: 'kg' },
    materials: ['stainless-steel'],
    colors: ['inox brossé', 'noir mat', 'or brossé'],
    stock: { available: 500, reserved: 45 },
    specifications: {
      entraxe: 192,
      diameter: 12,
    },
  },

  // Lighting
  {
    id: generateId(),
    sku: 'REGLETTE-LED-60',
    name: 'Réglette LED sous meuble 60cm',
    slug: 'reglette-led-sous-meuble-60cm',
    categoryId: 'cat-lighting',
    description: 'Éclairage LED pour dessous de meuble haut, blanc chaud.',
    shortDescription: 'LED 60cm, 8W, 3000K',
    price: 34.90,
    currency: 'EUR',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    dimensions: { width: 60, height: 1.5, depth: 3, unit: 'cm' },
    weight: { value: 0.3, unit: 'kg' },
    stock: { available: 150, reserved: 12 },
    specifications: {
      power: 8,
      lumens: 600,
      colorTemp: 3000,
      dimmable: true,
      lifespan: 30000,
    },
  },
];

async function seedWithPrisma() {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    log.info('Connected to database via Prisma');

    if (process.env.SEED_CLEAN === 'true') {
      log.warning('Cleaning existing catalog data...');
      await prisma.product.deleteMany({});
      await prisma.category.deleteMany({});
      log.info('Existing data deleted');
    }

    // Seed categories first
    log.info('Seeding categories...');
    for (const category of categories) {
      try {
        await prisma.category.upsert({
          where: { id: category.id },
          update: category,
          create: category,
        });
      } catch (err) {
        log.warning(`Category ${category.name}: ${err.message}`);
      }
    }
    log.success(`${categories.length} categories processed`);

    // Seed products
    log.info('Seeding products...');
    let created = 0;
    for (const product of products) {
      try {
        await prisma.product.upsert({
          where: { id: product.id },
          update: product,
          create: product,
        });
        created++;
      } catch (err) {
        log.warning(`Product ${product.name}: ${err.message}`);
      }
    }
    log.success(`${created} products processed`);

    await prisma.$disconnect();
    return true;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      log.warning('Prisma not available, outputting as JSON');
      return seedAsJson();
    }
    throw error;
  }
}

function seedAsJson() {
  const fs = require('fs');
  const path = require('path');
  const outputDir = path.join(__dirname, '../../../data/seed');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(path.join(outputDir, 'categories.json'), JSON.stringify(categories, null, 2));
  fs.writeFileSync(path.join(outputDir, 'products.json'), JSON.stringify(products, null, 2));

  log.success(`Seed data written to: ${outputDir}`);
  log.info(`Categories: ${categories.length}`);
  log.info(`Products: ${products.length}`);

  return true;
}

async function main() {
  log.info('Starting catalog seeding...');
  console.log('');

  try {
    await seedWithPrisma();
  } catch (error) {
    log.error(`Seeding failed: ${error.message}`);
    process.exit(1);
  }
}

main();
