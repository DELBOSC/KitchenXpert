#!/usr/bin/env node
/**
 * Seed Kitchens - KitchenXpert
 *
 * Seeds sample kitchen configurations and designs.
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
  info: (msg) => console.log(`${colors.blue}[KITCHENS]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[KITCHENS]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[KITCHENS]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[KITCHENS]${colors.reset} ${msg}`),
};

function generateId() {
  return crypto.randomUUID();
}

// Kitchen layouts/shapes
const layouts = ['L', 'U', 'I', 'G', 'parallel', 'island'];

// Kitchen styles
const styles = ['modern', 'traditional', 'minimalist', 'rustic', 'industrial', 'scandinavian'];

// Sample kitchens
const kitchens = [
  {
    id: generateId(),
    name: 'Cuisine Moderne L - Paris 9ème',
    slug: 'cuisine-moderne-l-paris-9',
    userId: null, // Will be linked to seeded user
    partnerId: 'partner-schmidt-001',
    status: 'completed',
    layout: 'L',
    style: 'modern',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-02-20'),
    completedAt: new Date('2024-02-20'),
    room: {
      width: 350,
      length: 400,
      height: 250,
      unit: 'cm',
      windows: [{ width: 120, height: 140, position: 'wall-a' }],
      doors: [{ width: 80, height: 210, position: 'wall-c' }],
    },
    design: {
      primaryColor: '#FFFFFF',
      secondaryColor: '#2C3E50',
      accentColor: '#E74C3C',
      handleStyle: 'integrated',
      worktopMaterial: 'quartz',
      worktopColor: 'blanc-calacatta',
      backsplash: 'glass',
      flooring: 'tiles-large',
    },
    cabinets: [
      { type: 'base', sku: 'MB-60-1P', quantity: 4, position: { x: 0, y: 0 }, color: 'blanc' },
      { type: 'base', sku: 'MB-80-2T', quantity: 2, position: { x: 240, y: 0 }, color: 'blanc' },
      { type: 'base', sku: 'MB-EVIER-80', quantity: 1, position: { x: 400, y: 0 }, color: 'blanc' },
      { type: 'wall', sku: 'MH-60-1P', quantity: 4, position: { x: 0, y: 140 }, color: 'blanc' },
      { type: 'wall', sku: 'MH-VITRINE-40', quantity: 1, position: { x: 240, y: 140 }, color: 'blanc' },
      { type: 'tall', sku: 'COL-60-FRIGO', quantity: 1, position: { x: 480, y: 0 }, color: 'blanc' },
    ],
    appliances: [
      { sku: 'FOUR-PYRO-60', brand: 'Bosch', position: { x: 60, y: 0, z: 50 } },
      { sku: 'PLAQUE-INDUCTION-60', brand: 'Electrolux', position: { x: 180, y: 0, z: 82 } },
      { sku: 'FRIGO-COMBI-178', brand: 'Samsung', position: { x: 480, y: 0, z: 0 } },
      { sku: 'LV-ENCASTRABLE-60', brand: 'Miele', position: { x: 320, y: 0, z: 0 } },
    ],
    sink: { sku: 'EVIER-INOX-2BACS', position: { x: 400, y: 0 } },
    lighting: [
      { sku: 'REGLETTE-LED-60', quantity: 4, position: 'under-cabinet' },
    ],
    pricing: {
      cabinets: 2450,
      appliances: 2396,
      worktop: 899,
      sink: 189,
      installation: 1200,
      delivery: 150,
      total: 7284,
      currency: 'EUR',
      discount: 0,
      discountCode: null,
    },
    notes: "Client souhaite une cuisine épurée avec rangements optimisés.",
    rating: 5,
    review: "Excellent travail, cuisine parfaitement réalisée selon nos attentes.",
  },
  {
    id: generateId(),
    name: 'Cuisine Familiale U - Lyon',
    slug: 'cuisine-familiale-u-lyon',
    userId: null,
    partnerId: 'partner-mobalpa-001',
    status: 'completed',
    layout: 'U',
    style: 'traditional',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-03-15'),
    completedAt: new Date('2024-03-15'),
    room: {
      width: 400,
      length: 450,
      height: 260,
      unit: 'cm',
      windows: [{ width: 140, height: 120, position: 'wall-b' }],
      doors: [{ width: 90, height: 210, position: 'wall-a' }],
    },
    design: {
      primaryColor: '#F5F5DC',
      secondaryColor: '#8B4513',
      accentColor: '#228B22',
      handleStyle: 'classic',
      worktopMaterial: 'wood',
      worktopColor: 'chene-massif',
      backsplash: 'tiles-subway',
      flooring: 'parquet',
    },
    cabinets: [
      { type: 'base', sku: 'MB-60-1P', quantity: 6, color: 'chêne' },
      { type: 'base', sku: 'MB-80-2T', quantity: 3, color: 'chêne' },
      { type: 'wall', sku: 'MH-60-1P', quantity: 6, color: 'chêne' },
      { type: 'tall', sku: 'COL-60-FRIGO', quantity: 2, color: 'chêne' },
    ],
    appliances: [
      { sku: 'FOUR-PYRO-60', brand: 'Bosch' },
      { sku: 'PLAQUE-INDUCTION-60', brand: 'Electrolux' },
      { sku: 'FRIGO-COMBI-178', brand: 'Samsung' },
      { sku: 'LV-ENCASTRABLE-60', brand: 'Miele' },
    ],
    sink: { sku: 'EVIER-INOX-2BACS' },
    pricing: {
      cabinets: 4200,
      appliances: 2396,
      worktop: 1450,
      sink: 189,
      installation: 1800,
      delivery: 200,
      total: 10235,
      currency: 'EUR',
    },
    rating: 4,
    review: "Très satisfaits du résultat, quelques délais mais qualité au rendez-vous.",
  },
  {
    id: generateId(),
    name: 'Cuisine Compacte I - Studio Paris',
    slug: 'cuisine-compacte-i-studio-paris',
    userId: null,
    partnerId: 'partner-ikea-001',
    status: 'completed',
    layout: 'I',
    style: 'minimalist',
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-20'),
    completedAt: new Date('2024-03-20'),
    room: {
      width: 200,
      length: 300,
      height: 250,
      unit: 'cm',
      windows: [],
      doors: [{ width: 70, height: 200, position: 'wall-a' }],
    },
    design: {
      primaryColor: '#FFFFFF',
      secondaryColor: '#333333',
      handleStyle: 'push-open',
      worktopMaterial: 'stratified',
      worktopColor: 'blanc',
      backsplash: 'paint',
    },
    cabinets: [
      { type: 'base', sku: 'MB-60-1P', quantity: 2, color: 'blanc' },
      { type: 'base', sku: 'MB-EVIER-80', quantity: 1, color: 'blanc' },
      { type: 'wall', sku: 'MH-60-1P', quantity: 3, color: 'blanc' },
    ],
    appliances: [
      { sku: 'PLAQUE-INDUCTION-60', brand: 'Generic' },
    ],
    pricing: {
      cabinets: 650,
      appliances: 299,
      worktop: 149,
      sink: 89,
      installation: 400,
      delivery: 50,
      total: 1637,
      currency: 'EUR',
    },
    rating: 5,
    review: "Parfait pour mon petit espace, très fonctionnel!",
  },
  {
    id: generateId(),
    name: 'Cuisine avec Îlot - Bordeaux',
    slug: 'cuisine-avec-ilot-bordeaux',
    userId: null,
    partnerId: 'partner-cuisinella-001',
    status: 'in_progress',
    layout: 'island',
    style: 'modern',
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date(),
    room: {
      width: 500,
      length: 600,
      height: 270,
      unit: 'cm',
      windows: [
        { width: 180, height: 150, position: 'wall-a' },
        { width: 120, height: 150, position: 'wall-b' },
      ],
      doors: [{ width: 90, height: 220, position: 'wall-c' }],
    },
    design: {
      primaryColor: '#1A1A1A',
      secondaryColor: '#D4AF37',
      accentColor: '#FFFFFF',
      handleStyle: 'bar',
      worktopMaterial: 'quartz',
      worktopColor: 'noir-absolu',
      backsplash: 'stone',
      flooring: 'concrete',
    },
    cabinets: [
      { type: 'base', sku: 'MB-60-1P', quantity: 8, color: 'noir' },
      { type: 'base', sku: 'MB-80-2T', quantity: 4, color: 'noir' },
      { type: 'wall', sku: 'MH-60-1P', quantity: 6, color: 'noir' },
      { type: 'tall', sku: 'COL-60-FRIGO', quantity: 2, color: 'noir' },
    ],
    island: {
      width: 200,
      length: 120,
      height: 90,
      cabinets: [
        { type: 'base', sku: 'MB-60-1P', quantity: 2, color: 'noir' },
        { type: 'base', sku: 'MB-80-2T', quantity: 1, color: 'noir' },
      ],
      features: ['seating', 'sink', 'storage'],
    },
    appliances: [
      { sku: 'FOUR-PYRO-60', brand: 'Gaggenau' },
      { sku: 'PLAQUE-INDUCTION-60', brand: 'Gaggenau' },
      { sku: 'FRIGO-COMBI-178', brand: 'Liebherr' },
      { sku: 'LV-ENCASTRABLE-60', brand: 'Miele' },
    ],
    pricing: {
      cabinets: 8500,
      island: 3200,
      appliances: 8900,
      worktop: 2800,
      sink: 450,
      installation: 3500,
      delivery: 350,
      total: 27700,
      currency: 'EUR',
    },
    notes: "Cuisine haut de gamme avec îlot central. Installation prévue mi-mai.",
  },
  {
    id: generateId(),
    name: 'Projet Cuisine Scandinave',
    slug: 'projet-cuisine-scandinave',
    userId: null,
    partnerId: 'partner-ikea-001',
    status: 'draft',
    layout: 'L',
    style: 'scandinavian',
    createdAt: new Date(),
    updatedAt: new Date(),
    room: {
      width: 320,
      length: 380,
      height: 250,
      unit: 'cm',
    },
    design: {
      primaryColor: '#FFFFFF',
      secondaryColor: '#A3C1AD',
      accentColor: '#F4A460',
      handleStyle: 'leather',
      worktopMaterial: 'wood',
      worktopColor: 'bouleau',
    },
    cabinets: [],
    appliances: [],
    pricing: {
      estimated: 8000,
      currency: 'EUR',
    },
    notes: "Projet en cours de conception. Client souhaite un style nordique épuré.",
  },
];

// Kitchen templates (pre-designed configurations)
const templates = [
  {
    id: generateId(),
    name: 'Cuisine Essentielle',
    slug: 'cuisine-essentielle',
    description: 'Configuration de base pour petits espaces',
    layout: 'I',
    style: 'minimalist',
    minRoomSize: { width: 180, length: 250 },
    suggestedCabinets: ['MB-60-1P', 'MB-EVIER-80', 'MH-60-1P'],
    suggestedAppliances: ['PLAQUE-INDUCTION-60'],
    priceRange: { min: 1500, max: 3000 },
    popular: true,
  },
  {
    id: generateId(),
    name: 'Cuisine Familiale',
    slug: 'cuisine-familiale',
    description: 'Configuration optimisée pour les familles',
    layout: 'L',
    style: 'traditional',
    minRoomSize: { width: 300, length: 350 },
    suggestedCabinets: ['MB-60-1P', 'MB-80-2T', 'MB-EVIER-80', 'MH-60-1P', 'COL-60-FRIGO'],
    suggestedAppliances: ['FOUR-PYRO-60', 'PLAQUE-INDUCTION-60', 'FRIGO-COMBI-178', 'LV-ENCASTRABLE-60'],
    priceRange: { min: 6000, max: 12000 },
    popular: true,
  },
  {
    id: generateId(),
    name: 'Cuisine Chef',
    slug: 'cuisine-chef',
    description: 'Configuration professionnelle avec îlot',
    layout: 'island',
    style: 'modern',
    minRoomSize: { width: 450, length: 500 },
    suggestedCabinets: ['MB-60-1P', 'MB-80-2T', 'MB-EVIER-80', 'MH-60-1P', 'MH-VITRINE-40', 'COL-60-FRIGO'],
    suggestedAppliances: ['FOUR-PYRO-60', 'PLAQUE-INDUCTION-60', 'FRIGO-COMBI-178', 'LV-ENCASTRABLE-60'],
    priceRange: { min: 15000, max: 35000 },
    popular: false,
  },
];

async function seedWithPrisma() {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    log.info('Connected to database via Prisma');

    if (process.env.SEED_CLEAN === 'true') {
      log.warning('Cleaning existing kitchen data...');
      await prisma.kitchen.deleteMany({});
      await prisma.kitchenTemplate.deleteMany({});
      log.info('Existing data deleted');
    }

    // Seed templates
    log.info('Seeding kitchen templates...');
    for (const template of templates) {
      try {
        await prisma.kitchenTemplate.upsert({
          where: { id: template.id },
          update: template,
          create: template,
        });
      } catch (err) {
        log.warning(`Template ${template.name}: ${err.message}`);
      }
    }
    log.success(`${templates.length} templates processed`);

    // Seed kitchens
    log.info('Seeding kitchens...');
    let created = 0;
    for (const kitchen of kitchens) {
      try {
        await prisma.kitchen.upsert({
          where: { id: kitchen.id },
          update: kitchen,
          create: kitchen,
        });
        created++;
      } catch (err) {
        log.warning(`Kitchen ${kitchen.name}: ${err.message}`);
      }
    }
    log.success(`${created} kitchens processed`);

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

  fs.writeFileSync(path.join(outputDir, 'kitchens.json'), JSON.stringify(kitchens, null, 2));
  fs.writeFileSync(path.join(outputDir, 'kitchen-templates.json'), JSON.stringify(templates, null, 2));

  log.success(`Seed data written to: ${outputDir}`);
  log.info(`Kitchens: ${kitchens.length}`);
  log.info(`Templates: ${templates.length}`);
  log.info('');
  log.info('Kitchen status breakdown:');
  log.info(`  - Completed: ${kitchens.filter((k) => k.status === 'completed').length}`);
  log.info(`  - In Progress: ${kitchens.filter((k) => k.status === 'in_progress').length}`);
  log.info(`  - Draft: ${kitchens.filter((k) => k.status === 'draft').length}`);

  return true;
}

async function main() {
  log.info('Starting kitchen seeding...');
  console.log('');

  try {
    await seedWithPrisma();
  } catch (error) {
    log.error(`Seeding failed: ${error.message}`);
    process.exit(1);
  }
}

main();
