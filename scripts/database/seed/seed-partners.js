#!/usr/bin/env node
/**
 * Seed Partners - KitchenXpert
 *
 * Seeds partner organizations (kitchen retailers and manufacturers).
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
  info: (msg) => console.log(`${colors.blue}[PARTNERS]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[PARTNERS]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[PARTNERS]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[PARTNERS]${colors.reset} ${msg}`),
};

// Generate ID
function generateId(prefix = 'partner') {
  return `${prefix}-${crypto.randomBytes(8).toString('hex')}`;
}

// Sample partners data
const partners = [
  // Major kitchen brands
  {
    id: 'partner-schmidt-001',
    name: 'Cuisines Schmidt Paris',
    slug: 'cuisines-schmidt-paris',
    type: 'retailer',
    status: 'active',
    brand: 'Schmidt',
    description:
      'Cuisiniste premium proposant des cuisines sur mesure avec un accompagnement personnalisé.',
    website: 'https://www.cuisines-schmidt.com',
    email: 'contact@cuisines-schmidt-paris.fr',
    phone: '+33 1 34 56 78 90',
    createdAt: new Date(),
    updatedAt: new Date(),
    address: {
      street: '25 Boulevard Haussmann',
      city: 'Paris',
      postalCode: '75009',
      country: 'France',
      coordinates: { lat: 48.8738, lng: 2.3332 },
    },
    settings: {
      commissionRate: 0.15,
      paymentTerms: 30,
      currency: 'EUR',
      languages: ['fr', 'en'],
      timezone: 'Europe/Paris',
    },
    features: {
      showroom: true,
      installation: true,
      design3D: true,
      financing: true,
      delivery: true,
    },
    hours: {
      monday: { open: '10:00', close: '19:00' },
      tuesday: { open: '10:00', close: '19:00' },
      wednesday: { open: '10:00', close: '19:00' },
      thursday: { open: '10:00', close: '19:00' },
      friday: { open: '10:00', close: '19:00' },
      saturday: { open: '10:00', close: '18:00' },
      sunday: { closed: true },
    },
    stats: {
      totalOrders: 245,
      totalRevenue: 1250000,
      averageRating: 4.7,
      totalReviews: 89,
    },
  },
  {
    id: 'partner-mobalpa-001',
    name: 'Mobalpa Lyon',
    slug: 'mobalpa-lyon',
    type: 'retailer',
    status: 'active',
    brand: 'Mobalpa',
    description:
      "Spécialiste de l'aménagement intérieur : cuisines, salles de bains et rangements.",
    website: 'https://www.mobalpa.fr',
    email: 'lyon@mobalpa.fr',
    phone: '+33 4 72 34 56 78',
    createdAt: new Date(),
    updatedAt: new Date(),
    address: {
      street: '150 Cours Lafayette',
      city: 'Lyon',
      postalCode: '69003',
      country: 'France',
      coordinates: { lat: 45.7602, lng: 4.8553 },
    },
    settings: {
      commissionRate: 0.12,
      paymentTerms: 30,
      currency: 'EUR',
      languages: ['fr'],
      timezone: 'Europe/Paris',
    },
    features: {
      showroom: true,
      installation: true,
      design3D: true,
      financing: true,
      delivery: true,
    },
    hours: {
      monday: { open: '09:30', close: '19:00' },
      tuesday: { open: '09:30', close: '19:00' },
      wednesday: { open: '09:30', close: '19:00' },
      thursday: { open: '09:30', close: '19:00' },
      friday: { open: '09:30', close: '19:00' },
      saturday: { open: '09:30', close: '18:00' },
      sunday: { closed: true },
    },
    stats: {
      totalOrders: 178,
      totalRevenue: 890000,
      averageRating: 4.5,
      totalReviews: 62,
    },
  },
  {
    id: 'partner-ikea-001',
    name: 'IKEA Paris Nord',
    slug: 'ikea-paris-nord',
    type: 'retailer',
    status: 'active',
    brand: 'IKEA',
    description:
      'Solutions de cuisines accessibles et personnalisables avec service de planification gratuit.',
    website: 'https://www.ikea.com/fr',
    email: 'cuisines.parisnord@ikea.com',
    phone: '+33 9 69 36 20 06',
    createdAt: new Date(),
    updatedAt: new Date(),
    address: {
      street: 'Centre Commercial O Parinor',
      city: 'Aulnay-sous-Bois',
      postalCode: '93600',
      country: 'France',
      coordinates: { lat: 48.9467, lng: 2.4975 },
    },
    settings: {
      commissionRate: 0.08,
      paymentTerms: 15,
      currency: 'EUR',
      languages: ['fr', 'en', 'es', 'ar'],
      timezone: 'Europe/Paris',
    },
    features: {
      showroom: true,
      installation: true,
      design3D: true,
      financing: true,
      delivery: true,
      selfService: true,
    },
    hours: {
      monday: { open: '10:00', close: '21:00' },
      tuesday: { open: '10:00', close: '21:00' },
      wednesday: { open: '10:00', close: '21:00' },
      thursday: { open: '10:00', close: '21:00' },
      friday: { open: '10:00', close: '21:00' },
      saturday: { open: '09:00', close: '21:00' },
      sunday: { open: '10:00', close: '20:00' },
    },
    stats: {
      totalOrders: 1245,
      totalRevenue: 3450000,
      averageRating: 4.2,
      totalReviews: 456,
    },
  },
  {
    id: 'partner-cuisinella-001',
    name: 'Cuisinella Bordeaux',
    slug: 'cuisinella-bordeaux',
    type: 'retailer',
    status: 'active',
    brand: 'Cuisinella',
    description: 'Cuisines équipées modernes avec un excellent rapport qualité-prix.',
    website: 'https://www.cuisinella.com',
    email: 'bordeaux@cuisinella.com',
    phone: '+33 5 56 78 90 12',
    createdAt: new Date(),
    updatedAt: new Date(),
    address: {
      street: '45 Quai des Chartrons',
      city: 'Bordeaux',
      postalCode: '33000',
      country: 'France',
      coordinates: { lat: 44.8558, lng: -0.5698 },
    },
    settings: {
      commissionRate: 0.14,
      paymentTerms: 30,
      currency: 'EUR',
      languages: ['fr'],
      timezone: 'Europe/Paris',
    },
    features: {
      showroom: true,
      installation: true,
      design3D: true,
      financing: true,
      delivery: true,
    },
    hours: {
      monday: { closed: true },
      tuesday: { open: '10:00', close: '19:00' },
      wednesday: { open: '10:00', close: '19:00' },
      thursday: { open: '10:00', close: '19:00' },
      friday: { open: '10:00', close: '19:00' },
      saturday: { open: '10:00', close: '18:00' },
      sunday: { closed: true },
    },
    stats: {
      totalOrders: 134,
      totalRevenue: 670000,
      averageRating: 4.6,
      totalReviews: 48,
    },
  },
  {
    id: 'partner-darty-001',
    name: 'Darty Cuisine Marseille',
    slug: 'darty-cuisine-marseille',
    type: 'retailer',
    status: 'active',
    brand: 'Darty',
    description: 'Expert en électroménager et cuisines équipées avec garantie et SAV de qualité.',
    website: 'https://www.darty.com',
    email: 'cuisine.marseille@darty.com',
    phone: '+33 4 91 23 45 67',
    createdAt: new Date(),
    updatedAt: new Date(),
    address: {
      street: '120 La Canebière',
      city: 'Marseille',
      postalCode: '13001',
      country: 'France',
      coordinates: { lat: 43.2965, lng: 5.3698 },
    },
    settings: {
      commissionRate: 0.1,
      paymentTerms: 30,
      currency: 'EUR',
      languages: ['fr'],
      timezone: 'Europe/Paris',
    },
    features: {
      showroom: true,
      installation: true,
      design3D: false,
      financing: true,
      delivery: true,
      appliances: true,
    },
    hours: {
      monday: { open: '10:00', close: '19:30' },
      tuesday: { open: '10:00', close: '19:30' },
      wednesday: { open: '10:00', close: '19:30' },
      thursday: { open: '10:00', close: '19:30' },
      friday: { open: '10:00', close: '19:30' },
      saturday: { open: '09:30', close: '19:30' },
      sunday: { closed: true },
    },
    stats: {
      totalOrders: 89,
      totalRevenue: 445000,
      averageRating: 4.3,
      totalReviews: 34,
    },
  },

  // Inactive/pending partners for testing
  {
    id: generateId(),
    name: 'New Partner Pending',
    slug: 'new-partner-pending',
    type: 'retailer',
    status: 'pending',
    brand: 'Independent',
    description: 'Nouveau partenaire en attente de validation.',
    email: 'contact@newpartner.fr',
    phone: '+33 1 00 00 00 00',
    createdAt: new Date(),
    updatedAt: new Date(),
    address: {
      city: 'Paris',
      country: 'France',
    },
    settings: {
      commissionRate: 0.15,
      paymentTerms: 30,
      currency: 'EUR',
    },
    features: {},
    stats: {
      totalOrders: 0,
      totalRevenue: 0,
      averageRating: 0,
      totalReviews: 0,
    },
  },
];

// Seed function
async function seedWithPrisma() {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    log.info('Connected to database via Prisma');

    // Clean existing if requested
    if (process.env.SEED_CLEAN === 'true') {
      log.warning('Cleaning existing partners...');
      await prisma.partner.deleteMany({});
      log.info('Existing partners deleted');
    }

    let created = 0;
    let skipped = 0;

    for (const partner of partners) {
      try {
        const existing = await prisma.partner.findUnique({
          where: { id: partner.id },
        });

        if (existing) {
          log.info(`Skipping existing partner: ${partner.name}`);
          skipped++;
          continue;
        }

        await prisma.partner.create({
          data: partner,
        });

        created++;
        log.success(`Created partner: ${partner.name} (${partner.brand})`);
      } catch (err) {
        log.warning(`Could not create partner ${partner.name}: ${err.message}`);
        skipped++;
      }
    }

    await prisma.$disconnect();

    log.success(`Seeding complete: ${created} created, ${skipped} skipped`);
    return true;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      log.warning('Prisma client not available, outputting seed data as JSON');
      return seedAsJson();
    }
    throw error;
  }
}

function seedAsJson() {
  const outputPath = require('path').join(__dirname, '../../../data/seed/partners.json');
  const outputDir = require('path').dirname(outputPath);

  if (!require('fs').existsSync(outputDir)) {
    require('fs').mkdirSync(outputDir, { recursive: true });
  }

  require('fs').writeFileSync(outputPath, JSON.stringify(partners, null, 2));

  log.success(`Seed data written to: ${outputPath}`);
  log.info(`Total partners: ${partners.length}`);
  log.info('');
  log.info('Partner breakdown:');
  log.info(`  - Active: ${partners.filter((p) => p.status === 'active').length}`);
  log.info(`  - Pending: ${partners.filter((p) => p.status === 'pending').length}`);
  log.info(`  - Brands: ${[...new Set(partners.map((p) => p.brand))].join(', ')}`);

  return true;
}

async function main() {
  log.info('Starting partner seeding...');
  log.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');

  try {
    await seedWithPrisma();
  } catch (error) {
    log.error(`Seeding failed: ${error.message}`);
    process.exit(1);
  }
}

main();
