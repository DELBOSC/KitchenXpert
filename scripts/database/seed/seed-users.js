#!/usr/bin/env node
/**
 * Seed Users - KitchenXpert
 *
 * Seeds user accounts with various roles for development and testing.
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
  info: (msg) => console.log(`${colors.blue}[USERS]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[USERS]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[USERS]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[USERS]${colors.reset} ${msg}`),
};

// Hash password (simple implementation for seeding)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate UUID
function generateId() {
  return crypto.randomUUID();
}

// Sample users data
const users = [
  // Admin users
  {
    id: generateId(),
    email: 'admin@kitchenxpert.com',
    password: hashPassword('Admin123!'),
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    status: 'active',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    profile: {
      phone: '+33 1 23 45 67 89',
      language: 'fr',
      timezone: 'Europe/Paris',
    },
  },
  {
    id: generateId(),
    email: 'superadmin@kitchenxpert.com',
    password: hashPassword('SuperAdmin123!'),
    firstName: 'Super',
    lastName: 'Admin',
    role: 'superadmin',
    status: 'active',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    profile: {
      phone: '+33 1 23 45 67 90',
      language: 'fr',
      timezone: 'Europe/Paris',
    },
  },

  // Partner users
  {
    id: generateId(),
    email: 'partner1@cuisines-schmidt.fr',
    password: hashPassword('Partner123!'),
    firstName: 'Jean',
    lastName: 'Dupont',
    role: 'partner',
    status: 'active',
    emailVerified: true,
    partnerId: 'partner-schmidt-001',
    createdAt: new Date(),
    updatedAt: new Date(),
    profile: {
      phone: '+33 1 34 56 78 90',
      company: 'Cuisines Schmidt Paris',
      language: 'fr',
      timezone: 'Europe/Paris',
    },
  },
  {
    id: generateId(),
    email: 'partner2@mobalpa.fr',
    password: hashPassword('Partner123!'),
    firstName: 'Marie',
    lastName: 'Martin',
    role: 'partner',
    status: 'active',
    emailVerified: true,
    partnerId: 'partner-mobalpa-001',
    createdAt: new Date(),
    updatedAt: new Date(),
    profile: {
      phone: '+33 1 45 67 89 01',
      company: 'Mobalpa Lyon',
      language: 'fr',
      timezone: 'Europe/Paris',
    },
  },

  // Regular customers
  {
    id: generateId(),
    email: 'client1@example.com',
    password: hashPassword('Client123!'),
    firstName: 'Pierre',
    lastName: 'Durand',
    role: 'customer',
    status: 'active',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    profile: {
      phone: '+33 6 12 34 56 78',
      language: 'fr',
      timezone: 'Europe/Paris',
      address: {
        street: '15 Rue de la Paix',
        city: 'Paris',
        postalCode: '75001',
        country: 'France',
      },
    },
  },
  {
    id: generateId(),
    email: 'client2@example.com',
    password: hashPassword('Client123!'),
    firstName: 'Sophie',
    lastName: 'Bernard',
    role: 'customer',
    status: 'active',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    profile: {
      phone: '+33 6 23 45 67 89',
      language: 'fr',
      timezone: 'Europe/Paris',
      address: {
        street: '42 Avenue des Champs-Élysées',
        city: 'Paris',
        postalCode: '75008',
        country: 'France',
      },
    },
  },
  {
    id: generateId(),
    email: 'client3@example.com',
    password: hashPassword('Client123!'),
    firstName: 'Lucas',
    lastName: 'Petit',
    role: 'customer',
    status: 'pending',
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    profile: {
      phone: '+33 6 34 56 78 90',
      language: 'fr',
      timezone: 'Europe/Paris',
    },
  },

  // Designer users
  {
    id: generateId(),
    email: 'designer1@kitchenxpert.com',
    password: hashPassword('Designer123!'),
    firstName: 'Claire',
    lastName: 'Moreau',
    role: 'designer',
    status: 'active',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    profile: {
      phone: '+33 1 56 78 90 12',
      specialization: ['modern', 'minimalist'],
      experience: 5,
      language: 'fr',
      timezone: 'Europe/Paris',
    },
  },
  {
    id: generateId(),
    email: 'designer2@kitchenxpert.com',
    password: hashPassword('Designer123!'),
    firstName: 'Thomas',
    lastName: 'Leroy',
    role: 'designer',
    status: 'active',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    profile: {
      phone: '+33 1 67 89 01 23',
      specialization: ['traditional', 'rustic'],
      experience: 8,
      language: 'fr',
      timezone: 'Europe/Paris',
    },
  },

  // Test user with special characters
  {
    id: generateId(),
    email: 'test.user+special@example.com',
    password: hashPassword('Test123!'),
    firstName: 'Tëst',
    lastName: "O'Connor-Smith",
    role: 'customer',
    status: 'active',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    profile: {
      language: 'en',
      timezone: 'Europe/London',
    },
  },
];

// Prisma client mock for demonstration
// In production, replace with actual Prisma client
async function seedWithPrisma() {
  try {
    // Dynamically import Prisma
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    log.info('Connected to database via Prisma');

    // Clean existing users if requested
    if (process.env.SEED_CLEAN === 'true') {
      log.warning('Cleaning existing users...');
      await prisma.user.deleteMany({});
      log.info('Existing users deleted');
    }

    // Insert users
    let created = 0;
    let skipped = 0;

    for (const user of users) {
      try {
        // Check if user exists
        const existing = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (existing) {
          log.info(`Skipping existing user: ${user.email}`);
          skipped++;
          continue;
        }

        await prisma.user.create({
          data: user,
        });

        created++;
        log.success(`Created user: ${user.email} (${user.role})`);
      } catch (err) {
        log.warning(`Could not create user ${user.email}: ${err.message}`);
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

// Fallback: output as JSON for manual import
function seedAsJson() {
  const outputPath = require('path').join(__dirname, '../../../data/seed/users.json');
  const outputDir = require('path').dirname(outputPath);

  // Create directory if needed
  if (!require('fs').existsSync(outputDir)) {
    require('fs').mkdirSync(outputDir, { recursive: true });
  }

  // Write JSON file
  require('fs').writeFileSync(outputPath, JSON.stringify(users, null, 2));

  log.success(`Seed data written to: ${outputPath}`);
  log.info(`Total users: ${users.length}`);
  log.info('');
  log.info('User breakdown:');
  log.info(
    `  - Admins: ${users.filter((u) => u.role === 'admin' || u.role === 'superadmin').length}`
  );
  log.info(`  - Partners: ${users.filter((u) => u.role === 'partner').length}`);
  log.info(`  - Customers: ${users.filter((u) => u.role === 'customer').length}`);
  log.info(`  - Designers: ${users.filter((u) => u.role === 'designer').length}`);

  return true;
}

// Main execution
async function main() {
  log.info('Starting user seeding...');
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
