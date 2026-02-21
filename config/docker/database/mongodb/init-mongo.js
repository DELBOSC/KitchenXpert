// KitchenXpert MongoDB Initialization Script
// This script runs on first container startup via docker-entrypoint-initdb.d
// It executes in the context of MONGO_INITDB_DATABASE (kitchenxpert)

// Switch to kitchenxpert database
db = db.getSiblingDB('kitchenxpert');

// Create initial collections
db.createCollection('scraper_results');
db.createCollection('scraper_logs');

// Create indexes on common query fields for scraper_results
db.scraper_results.createIndex({ url: 1 }, { unique: true });
db.scraper_results.createIndex({ status: 1 });
db.scraper_results.createIndex({ createdAt: -1 });
db.scraper_results.createIndex({ source: 1, createdAt: -1 });

// Create indexes on common query fields for scraper_logs
db.scraper_logs.createIndex({ jobId: 1 });
db.scraper_logs.createIndex({ level: 1 });
db.scraper_logs.createIndex({ createdAt: -1 });
db.scraper_logs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // TTL: 30 days

print('KitchenXpert MongoDB initialization complete.');
print('Created collections: scraper_results, scraper_logs');
print('Created indexes on common query fields.');
