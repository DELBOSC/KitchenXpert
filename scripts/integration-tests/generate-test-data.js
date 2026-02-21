#!/usr/bin/env node
/**
 * Generate Test Data - KitchenXpert
 *
 * Generates realistic test data for integration testing.
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(level, message) {
  const prefix = {
    INFO: `${colors.blue}[TEST-DATA]${colors.reset}`,
    SUCCESS: `${colors.green}[TEST-DATA]${colors.reset}`,
    WARNING: `${colors.yellow}[TEST-DATA]${colors.reset}`,
    ERROR: `${colors.red}[TEST-DATA]${colors.reset}`,
  };
  console.log(`${prefix[level] || prefix.INFO} ${message}`);
}

// Configuration
const config = {
  outputDir: process.env.OUTPUT_DIR || path.join(__dirname, '../../test-data'),
  userCount: parseInt(process.env.USER_COUNT || '50'),
  partnerCount: parseInt(process.env.PARTNER_COUNT || '10'),
  productCount: parseInt(process.env.PRODUCT_COUNT || '100'),
  kitchenCount: parseInt(process.env.KITCHEN_COUNT || '30'),
  orderCount: parseInt(process.env.ORDER_COUNT || '50'),
};

// Random data generators
const generators = {
  uuid() {
    return crypto.randomUUID();
  },

  email(firstName, lastName) {
    const domains = ['test.com', 'example.com', 'kitchentest.com'];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
  },

  phone() {
    return `+33${Math.floor(100000000 + Math.random() * 900000000)}`;
  },

  firstName() {
    const names = [
      'Alice', 'Bob', 'Charlie', 'Diana', 'Edward', 'Fiona', 'George', 'Hannah',
      'Ivan', 'Julia', 'Kevin', 'Laura', 'Michael', 'Nina', 'Oscar', 'Patricia',
      'Quentin', 'Rachel', 'Samuel', 'Tina', 'Ulrich', 'Victoria', 'William', 'Xena',
      'Yves', 'Zoe', 'André', 'Béatrice', 'Claude', 'Delphine'
    ];
    return names[Math.floor(Math.random() * names.length)];
  },

  lastName() {
    const names = [
      'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand',
      'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David',
      'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'Andre', 'Mercier'
    ];
    return names[Math.floor(Math.random() * names.length)];
  },

  address() {
    const streets = [
      'Rue de la Paix', 'Avenue des Champs-Élysées', 'Boulevard Saint-Germain',
      'Rue du Faubourg Saint-Honoré', 'Place de la Concorde', 'Rue de Rivoli',
      'Avenue Montaigne', 'Rue Saint-Denis', 'Boulevard Haussmann', 'Rue Lafayette'
    ];
    const cities = ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Bordeaux'];
    const street = streets[Math.floor(Math.random() * streets.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const number = Math.floor(1 + Math.random() * 200);
    const postalCode = `${Math.floor(10000 + Math.random() * 90000)}`;

    return {
      street: `${number} ${street}`,
      city,
      postalCode,
      country: 'France',
    };
  },

  companyName() {
    const prefixes = ['Kitchen', 'Cuisine', 'Design', 'Home', 'Euro', 'Pro', 'Elite'];
    const suffixes = ['Plus', 'Design', 'Studio', 'Concept', 'Solutions', 'Expert', 'Pro'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return `${prefix}${suffix}`;
  },

  productName() {
    const types = ['Cabinet', 'Drawer', 'Worktop', 'Sink', 'Tap', 'Hood', 'Oven', 'Fridge'];
    const materials = ['Oak', 'Walnut', 'White', 'Grey', 'Black', 'Marble', 'Granite', 'Steel'];
    const sizes = ['Small', 'Medium', 'Large', 'XL', 'Compact', 'Standard', 'Premium'];
    const type = types[Math.floor(Math.random() * types.length)];
    const material = materials[Math.floor(Math.random() * materials.length)];
    const size = sizes[Math.floor(Math.random() * sizes.length)];
    return `${material} ${type} ${size}`;
  },

  price(min = 100, max = 5000) {
    return Math.round((min + Math.random() * (max - min)) * 100) / 100;
  },

  date(startYear = 2023, endYear = 2025) {
    const start = new Date(startYear, 0, 1);
    const end = new Date(endYear, 11, 31);
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  },

  status(statuses) {
    return statuses[Math.floor(Math.random() * statuses.length)];
  },

  dimensions() {
    return {
      width: Math.floor(300 + Math.random() * 1200),
      height: Math.floor(300 + Math.random() * 900),
      depth: Math.floor(300 + Math.random() * 700),
    };
  },
};

// Data generators
function generateUsers(count) {
  log('INFO', `Generating ${count} test users...`);

  const users = [];
  const roles = ['customer', 'designer', 'partner', 'admin'];

  for (let i = 0; i < count; i++) {
    const firstName = generators.firstName();
    const lastName = generators.lastName();
    const role = i < 5 ? roles[i % 4] : 'customer'; // Ensure we have each role

    users.push({
      id: generators.uuid(),
      email: generators.email(firstName, lastName),
      firstName,
      lastName,
      phone: generators.phone(),
      role,
      status: generators.status(['active', 'active', 'active', 'inactive', 'pending']),
      address: generators.address(),
      createdAt: generators.date().toISOString(),
      preferences: {
        language: generators.status(['fr', 'en', 'de', 'es']),
        notifications: Math.random() > 0.3,
        newsletter: Math.random() > 0.5,
      },
    });
  }

  log('SUCCESS', `Generated ${users.length} users`);
  return users;
}

function generatePartners(count) {
  log('INFO', `Generating ${count} test partners...`);

  const partners = [];
  const partnerTypes = ['retailer', 'manufacturer', 'distributor', 'installer'];

  for (let i = 0; i < count; i++) {
    const companyName = generators.companyName();

    partners.push({
      id: generators.uuid(),
      name: companyName,
      type: partnerTypes[i % partnerTypes.length],
      email: `contact@${companyName.toLowerCase().replace(/\s/g, '')}.com`,
      phone: generators.phone(),
      address: generators.address(),
      status: generators.status(['active', 'active', 'pending', 'suspended']),
      contractStart: generators.date(2022, 2023).toISOString(),
      commission: Math.floor(5 + Math.random() * 20),
      rating: Math.round((3 + Math.random() * 2) * 10) / 10,
      totalSales: Math.floor(10000 + Math.random() * 500000),
      createdAt: generators.date(2022, 2023).toISOString(),
    });
  }

  log('SUCCESS', `Generated ${partners.length} partners`);
  return partners;
}

function generateProducts(count) {
  log('INFO', `Generating ${count} test products...`);

  const products = [];
  const categories = ['cabinets', 'worktops', 'appliances', 'sinks', 'accessories'];
  const brands = ['Schmidt', 'Mobalpa', 'IKEA', 'Leroy Merlin', 'Cuisinella', 'SoCoo\'c'];

  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length];
    const dimensions = generators.dimensions();

    products.push({
      id: generators.uuid(),
      sku: `PROD-${String(i + 1).padStart(6, '0')}`,
      name: generators.productName(),
      description: `High-quality ${category} product for modern kitchens.`,
      category,
      brand: brands[Math.floor(Math.random() * brands.length)],
      price: generators.price(100, 3000),
      currency: 'EUR',
      dimensions,
      weight: Math.floor(5 + Math.random() * 50),
      inStock: Math.random() > 0.1,
      stockQuantity: Math.floor(Math.random() * 100),
      images: [
        `/images/products/${category}/product-${i + 1}-1.jpg`,
        `/images/products/${category}/product-${i + 1}-2.jpg`,
      ],
      tags: [category, 'kitchen', generators.status(['modern', 'classic', 'minimalist'])],
      rating: Math.round((3 + Math.random() * 2) * 10) / 10,
      reviewCount: Math.floor(Math.random() * 200),
      createdAt: generators.date().toISOString(),
    });
  }

  log('SUCCESS', `Generated ${products.length} products`);
  return products;
}

function generateKitchens(count, users, products) {
  log('INFO', `Generating ${count} test kitchen configurations...`);

  const kitchens = [];
  const styles = ['modern', 'classic', 'minimalist', 'rustic', 'industrial'];
  const layouts = ['L-shaped', 'U-shaped', 'galley', 'island', 'one-wall'];

  for (let i = 0; i < count; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const selectedProducts = [];
    const productCount = 5 + Math.floor(Math.random() * 10);

    for (let j = 0; j < productCount; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      selectedProducts.push({
        productId: product.id,
        quantity: 1 + Math.floor(Math.random() * 3),
        position: { x: Math.random() * 4000, y: 0, z: Math.random() * 3000 },
      });
    }

    const totalPrice = selectedProducts.reduce((sum, item) => {
      const product = products.find(p => p.id === item.productId);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);

    kitchens.push({
      id: generators.uuid(),
      userId: user.id,
      name: `Kitchen Design ${i + 1}`,
      style: styles[Math.floor(Math.random() * styles.length)],
      layout: layouts[Math.floor(Math.random() * layouts.length)],
      dimensions: {
        width: 3000 + Math.floor(Math.random() * 3000),
        length: 2500 + Math.floor(Math.random() * 2500),
        height: 2400 + Math.floor(Math.random() * 600),
      },
      products: selectedProducts,
      totalPrice: Math.round(totalPrice * 100) / 100,
      status: generators.status(['draft', 'in-progress', 'completed', 'ordered']),
      createdAt: generators.date().toISOString(),
      updatedAt: generators.date().toISOString(),
    });
  }

  log('SUCCESS', `Generated ${kitchens.length} kitchen configurations`);
  return kitchens;
}

function generateOrders(count, users, kitchens, partners) {
  log('INFO', `Generating ${count} test orders...`);

  const orders = [];
  const paymentMethods = ['credit_card', 'bank_transfer', 'financing', 'paypal'];
  const paymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
  const orderStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

  for (let i = 0; i < count; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const kitchen = kitchens[Math.floor(Math.random() * kitchens.length)];
    const partner = partners[Math.floor(Math.random() * partners.length)];

    orders.push({
      id: generators.uuid(),
      orderNumber: `ORD-${String(i + 1).padStart(8, '0')}`,
      userId: user.id,
      kitchenId: kitchen.id,
      partnerId: partner.id,
      items: kitchen.products.map(p => ({
        productId: p.productId,
        quantity: p.quantity,
        unitPrice: generators.price(100, 2000),
      })),
      subtotal: kitchen.totalPrice,
      tax: Math.round(kitchen.totalPrice * 0.2 * 100) / 100,
      shipping: generators.price(50, 200),
      total: Math.round(kitchen.totalPrice * 1.2 * 100) / 100 + generators.price(50, 200),
      currency: 'EUR',
      status: generators.status(orderStatuses),
      paymentMethod: generators.status(paymentMethods),
      paymentStatus: generators.status(paymentStatuses),
      shippingAddress: generators.address(),
      billingAddress: generators.address(),
      notes: Math.random() > 0.7 ? 'Special delivery instructions included.' : null,
      createdAt: generators.date().toISOString(),
      updatedAt: generators.date().toISOString(),
    });
  }

  log('SUCCESS', `Generated ${orders.length} orders`);
  return orders;
}

function generateTestCredentials(users) {
  log('INFO', 'Generating test credentials...');

  const testUsers = users.slice(0, 5).map((user, index) => ({
    email: user.email,
    password: 'Test123!@#',
    role: user.role,
    description: `Test ${user.role} account`,
  }));

  // Add known test accounts
  testUsers.unshift(
    { email: 'admin@test.com', password: 'Admin123!@#', role: 'admin', description: 'Admin test account' },
    { email: 'partner@test.com', password: 'Partner123!@#', role: 'partner', description: 'Partner test account' },
    { email: 'customer@test.com', password: 'Customer123!@#', role: 'customer', description: 'Customer test account' }
  );

  log('SUCCESS', `Generated ${testUsers.length} test credentials`);
  return testUsers;
}

async function saveData(data, filename) {
  const outputPath = path.join(config.outputDir, filename);
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  log('INFO', `Saved: ${outputPath}`);
}

async function main() {
  console.log('');
  console.log(`${colors.blue}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║${colors.reset}       KitchenXpert - Test Data Generator                   ${colors.blue}║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log('');

  // Create output directory
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  // Generate all test data
  const users = generateUsers(config.userCount);
  const partners = generatePartners(config.partnerCount);
  const products = generateProducts(config.productCount);
  const kitchens = generateKitchens(config.kitchenCount, users, products);
  const orders = generateOrders(config.orderCount, users, kitchens, partners);
  const credentials = generateTestCredentials(users);

  // Save data to files
  await saveData(users, 'users.json');
  await saveData(partners, 'partners.json');
  await saveData(products, 'products.json');
  await saveData(kitchens, 'kitchens.json');
  await saveData(orders, 'orders.json');
  await saveData(credentials, 'test-credentials.json');

  // Save combined data for seeding
  const seedData = { users, partners, products, kitchens, orders };
  await saveData(seedData, 'seed-data.json');

  // Generate summary
  const summary = {
    generatedAt: new Date().toISOString(),
    counts: {
      users: users.length,
      partners: partners.length,
      products: products.length,
      kitchens: kitchens.length,
      orders: orders.length,
    },
    outputDir: config.outputDir,
  };
  await saveData(summary, 'summary.json');

  console.log('');
  console.log(`${colors.green}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.green}║${colors.reset}        Test Data Generation Complete                       ${colors.green}║${colors.reset}`);
  console.log(`${colors.green}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log('');
  console.log('  Generated:');
  console.log(`    Users:    ${users.length}`);
  console.log(`    Partners: ${partners.length}`);
  console.log(`    Products: ${products.length}`);
  console.log(`    Kitchens: ${kitchens.length}`);
  console.log(`    Orders:   ${orders.length}`);
  console.log('');
  console.log(`  Output: ${config.outputDir}`);
  console.log('');
}

// Parse command line arguments
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--users':
      config.userCount = parseInt(args[++i]);
      break;
    case '--partners':
      config.partnerCount = parseInt(args[++i]);
      break;
    case '--products':
      config.productCount = parseInt(args[++i]);
      break;
    case '--kitchens':
      config.kitchenCount = parseInt(args[++i]);
      break;
    case '--orders':
      config.orderCount = parseInt(args[++i]);
      break;
    case '--output':
      config.outputDir = args[++i];
      break;
    case '--help':
      console.log('Usage: generate-test-data.js [options]');
      console.log('');
      console.log('Options:');
      console.log('  --users <count>     Number of users to generate');
      console.log('  --partners <count>  Number of partners to generate');
      console.log('  --products <count>  Number of products to generate');
      console.log('  --kitchens <count>  Number of kitchen configs to generate');
      console.log('  --orders <count>    Number of orders to generate');
      console.log('  --output <dir>      Output directory');
      console.log('  --help              Show this help message');
      process.exit(0);
  }
}

main().catch((error) => {
  log('ERROR', `Failed to generate test data: ${error.message}`);
  process.exit(1);
});
