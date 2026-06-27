// ========================================
// KitchenXpert MongoDB Database Initialization
// ========================================
// This script initializes the MongoDB database for KitchenXpert
// Run this script using: mongosh < init-mongo.js
// or from mongosh: load('init-mongo.js')
//
// Version: 1.0.0
// Requires: MongoDB 5.0+

print('========================================');
print('KitchenXpert MongoDB Initialization');
print('========================================\n');

// ----------------------------------------
// Configuration
// ----------------------------------------
const DB_NAME = 'kitchenxpert';
const ADMIN_USER = process.env.MONGODB_ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.MONGODB_ADMIN_PASSWORD || 'change_me_immediately';
const APP_USER = process.env.MONGODB_USER || 'kitchenxpert_app';
const APP_PASSWORD = process.env.MONGODB_PASSWORD || 'change_me_immediately';

// ----------------------------------------
// Switch to Database
// ----------------------------------------
db = db.getSiblingDB(DB_NAME);
print(`Switched to database: ${DB_NAME}\n`);

// ----------------------------------------
// Drop existing collections (CAUTION!)
// ----------------------------------------
// Uncomment to drop existing collections
// db.getCollectionNames().forEach(c => db[c].drop());
// print('Dropped existing collections\n');

// ----------------------------------------
// Collection: designs
// ----------------------------------------
print('Creating collection: designs');
db.createCollection('designs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user_id', 'project_id', 'geometry', 'created_at'],
      properties: {
        user_id: {
          bsonType: 'string',
          description: 'User ID from PostgreSQL - required',
        },
        project_id: {
          bsonType: 'string',
          description: 'Project ID from PostgreSQL - required',
        },
        name: {
          bsonType: 'string',
          maxLength: 255,
          description: 'Design name',
        },
        geometry: {
          bsonType: 'object',
          description: '3D geometry data - required',
          properties: {
            vertices: { bsonType: 'array' },
            faces: { bsonType: 'array' },
            materials: { bsonType: 'array' },
            textures: { bsonType: 'array' },
          },
        },
        layout: {
          bsonType: 'object',
          description: 'Layout configuration',
          properties: {
            width: { bsonType: 'number' },
            height: { bsonType: 'number' },
            depth: { bsonType: 'number' },
            unit: { bsonType: 'string' },
          },
        },
        components: {
          bsonType: 'array',
          description: 'Kitchen components (cabinets, appliances, etc.)',
          items: {
            bsonType: 'object',
            properties: {
              id: { bsonType: 'string' },
              type: { bsonType: 'string' },
              position: { bsonType: 'object' },
              rotation: { bsonType: 'object' },
              scale: { bsonType: 'object' },
              catalog_item_id: { bsonType: 'string' },
              properties: { bsonType: 'object' },
            },
          },
        },
        materials: {
          bsonType: 'object',
          description: 'Material assignments',
        },
        camera: {
          bsonType: 'object',
          description: 'Camera position and settings',
          properties: {
            position: { bsonType: 'object' },
            target: { bsonType: 'object' },
            fov: { bsonType: 'number' },
          },
        },
        lighting: {
          bsonType: 'array',
          description: 'Lighting configuration',
        },
        render_settings: {
          bsonType: 'object',
          description: 'Rendering preferences',
        },
        metadata: {
          bsonType: 'object',
          description: 'Additional metadata',
        },
        version: {
          bsonType: 'int',
          minimum: 1,
          description: 'Design version number',
        },
        thumbnail_url: {
          bsonType: 'string',
          description: 'URL to thumbnail image',
        },
        created_at: {
          bsonType: 'date',
          description: 'Creation timestamp - required',
        },
        updated_at: {
          bsonType: 'date',
          description: 'Last update timestamp',
        },
      },
    },
  },
});

// Indexes for designs
db.designs.createIndex({ user_id: 1 });
db.designs.createIndex({ project_id: 1 });
db.designs.createIndex({ created_at: -1 });
db.designs.createIndex({ user_id: 1, created_at: -1 });
db.designs.createIndex({ 'geometry.materials': 1 });
print('✓ Created collection: designs with indexes\n');

// ----------------------------------------
// Collection: ai_suggestions
// ----------------------------------------
print('Creating collection: ai_suggestions');
db.createCollection('ai_suggestions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user_id', 'project_id', 'suggestion_type', 'created_at'],
      properties: {
        user_id: {
          bsonType: 'string',
          description: 'User ID - required',
        },
        project_id: {
          bsonType: 'string',
          description: 'Project ID - required',
        },
        suggestion_type: {
          enum: ['layout', 'material', 'color', 'component', 'optimization', 'style'],
          description: 'Type of suggestion - required',
        },
        title: {
          bsonType: 'string',
          maxLength: 255,
          description: 'Suggestion title',
        },
        description: {
          bsonType: 'string',
          description: 'Detailed description',
        },
        suggestions: {
          bsonType: 'array',
          description: 'Array of suggestion objects',
          items: {
            bsonType: 'object',
            properties: {
              id: { bsonType: 'string' },
              title: { bsonType: 'string' },
              description: { bsonType: 'string' },
              confidence: { bsonType: 'number' },
              data: { bsonType: 'object' },
              preview_url: { bsonType: 'string' },
            },
          },
        },
        context: {
          bsonType: 'object',
          description: 'Context used for generating suggestions',
          properties: {
            room_dimensions: { bsonType: 'object' },
            budget: { bsonType: 'number' },
            style_preferences: { bsonType: 'array' },
            constraints: { bsonType: 'array' },
          },
        },
        ai_model: {
          bsonType: 'string',
          description: 'AI model used',
        },
        ai_version: {
          bsonType: 'string',
          description: 'AI model version',
        },
        confidence_score: {
          bsonType: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Overall confidence score',
        },
        status: {
          enum: ['pending', 'accepted', 'rejected', 'modified'],
          description: 'Suggestion status',
        },
        applied_at: {
          bsonType: 'date',
          description: 'When suggestion was applied',
        },
        feedback: {
          bsonType: 'object',
          description: 'User feedback on suggestion',
          properties: {
            rating: { bsonType: 'int', minimum: 1, maximum: 5 },
            comment: { bsonType: 'string' },
            helpful: { bsonType: 'bool' },
          },
        },
        created_at: {
          bsonType: 'date',
          description: 'Creation timestamp - required',
        },
        updated_at: {
          bsonType: 'date',
          description: 'Last update timestamp',
        },
      },
    },
  },
});

// Indexes for ai_suggestions
db.ai_suggestions.createIndex({ user_id: 1 });
db.ai_suggestions.createIndex({ project_id: 1 });
db.ai_suggestions.createIndex({ suggestion_type: 1 });
db.ai_suggestions.createIndex({ status: 1 });
db.ai_suggestions.createIndex({ created_at: -1 });
db.ai_suggestions.createIndex({ user_id: 1, project_id: 1, created_at: -1 });
print('✓ Created collection: ai_suggestions with indexes\n');

// ----------------------------------------
// Collection: catalog_cache
// ----------------------------------------
print('Creating collection: catalog_cache');
db.createCollection('catalog_cache', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['item_id', 'cached_at'],
      properties: {
        item_id: {
          bsonType: 'string',
          description: 'Catalog item ID from PostgreSQL - required',
        },
        model_3d: {
          bsonType: 'object',
          description: '3D model data',
          properties: {
            format: { bsonType: 'string' },
            url: { bsonType: 'string' },
            vertices_count: { bsonType: 'int' },
            faces_count: { bsonType: 'int' },
            file_size: { bsonType: 'int' },
            data: { bsonType: 'object' },
          },
        },
        textures: {
          bsonType: 'array',
          description: 'Texture files',
          items: {
            bsonType: 'object',
            properties: {
              type: { bsonType: 'string' },
              url: { bsonType: 'string' },
              resolution: { bsonType: 'string' },
            },
          },
        },
        materials: {
          bsonType: 'array',
          description: 'Material definitions',
        },
        variants: {
          bsonType: 'array',
          description: 'Product variants',
          items: {
            bsonType: 'object',
            properties: {
              id: { bsonType: 'string' },
              name: { bsonType: 'string' },
              color: { bsonType: 'string' },
              finish: { bsonType: 'string' },
              model_url: { bsonType: 'string' },
            },
          },
        },
        specifications: {
          bsonType: 'object',
          description: 'Detailed specifications',
        },
        compatibility: {
          bsonType: 'array',
          description: 'Compatible items',
        },
        cached_at: {
          bsonType: 'date',
          description: 'Cache timestamp - required',
        },
        expires_at: {
          bsonType: 'date',
          description: 'Cache expiration',
        },
      },
    },
  },
});

// Indexes for catalog_cache
db.catalog_cache.createIndex({ item_id: 1 }, { unique: true });
db.catalog_cache.createIndex({ cached_at: 1 });
db.catalog_cache.createIndex({ expires_at: 1 });
print('✓ Created collection: catalog_cache with indexes\n');

// ----------------------------------------
// Collection: analytics_events
// ----------------------------------------
print('Creating collection: analytics_events');
db.createCollection('analytics_events', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['event_type', 'timestamp'],
      properties: {
        event_type: {
          bsonType: 'string',
          description: 'Type of event - required',
        },
        user_id: {
          bsonType: 'string',
          description: 'User ID (if authenticated)',
        },
        session_id: {
          bsonType: 'string',
          description: 'Session identifier',
        },
        project_id: {
          bsonType: 'string',
          description: 'Related project ID',
        },
        event_data: {
          bsonType: 'object',
          description: 'Event-specific data',
        },
        properties: {
          bsonType: 'object',
          description: 'Additional properties',
        },
        user_agent: {
          bsonType: 'string',
          description: 'Browser user agent',
        },
        ip_address: {
          bsonType: 'string',
          description: 'IP address',
        },
        location: {
          bsonType: 'object',
          description: 'Geo location data',
          properties: {
            country: { bsonType: 'string' },
            city: { bsonType: 'string' },
            coordinates: { bsonType: 'object' },
          },
        },
        device: {
          bsonType: 'object',
          description: 'Device information',
          properties: {
            type: { bsonType: 'string' },
            os: { bsonType: 'string' },
            browser: { bsonType: 'string' },
          },
        },
        referrer: {
          bsonType: 'string',
          description: 'Referrer URL',
        },
        duration: {
          bsonType: 'int',
          description: 'Event duration in milliseconds',
        },
        timestamp: {
          bsonType: 'date',
          description: 'Event timestamp - required',
        },
      },
    },
  },
  timeseries: {
    timeField: 'timestamp',
    metaField: 'event_type',
    granularity: 'seconds',
  },
});

// Indexes for analytics_events
db.analytics_events.createIndex({ event_type: 1 });
db.analytics_events.createIndex({ user_id: 1 });
db.analytics_events.createIndex({ project_id: 1 });
db.analytics_events.createIndex({ session_id: 1 });
db.analytics_events.createIndex({ timestamp: -1 });
db.analytics_events.createIndex({ user_id: 1, timestamp: -1 });
print('✓ Created collection: analytics_events with indexes\n');

// ----------------------------------------
// Create Users
// ----------------------------------------
print('Creating database users...');

// Switch to admin database for user creation
db = db.getSiblingDB('admin');

// Create admin user (if not exists)
try {
  db.createUser({
    user: ADMIN_USER,
    pwd: ADMIN_PASSWORD,
    roles: [
      { role: 'userAdminAnyDatabase', db: 'admin' },
      { role: 'dbAdminAnyDatabase', db: 'admin' },
      { role: 'readWriteAnyDatabase', db: 'admin' },
    ],
  });
  print(`✓ Created admin user: ${ADMIN_USER}`);
} catch (e) {
  if (e.code === 51003) {
    print(`ℹ Admin user already exists: ${ADMIN_USER}`);
  } else {
    print(`✗ Error creating admin user: ${e.message}`);
  }
}

// Switch back to application database
db = db.getSiblingDB(DB_NAME);

// Create application user (if not exists)
try {
  db.createUser({
    user: APP_USER,
    pwd: APP_PASSWORD,
    roles: [{ role: 'readWrite', db: DB_NAME }],
  });
  print(`✓ Created application user: ${APP_USER}`);
} catch (e) {
  if (e.code === 51003) {
    print(`ℹ Application user already exists: ${APP_USER}`);
  } else {
    print(`✗ Error creating application user: ${e.message}`);
  }
}

// ----------------------------------------
// Insert Sample Data (Optional)
// ----------------------------------------
print('\nInserting sample data...');

// Sample design
const sampleDesign = {
  user_id: 'sample-user-id',
  project_id: 'sample-project-id',
  name: 'Sample Kitchen Design',
  geometry: {
    vertices: [],
    faces: [],
    materials: [],
    textures: [],
  },
  layout: {
    width: 120,
    height: 96,
    depth: 24,
    unit: 'inches',
  },
  components: [
    {
      id: 'cabinet-1',
      type: 'base_cabinet',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      catalog_item_id: 'sample-catalog-item-1',
      properties: {
        width: 24,
        height: 36,
        depth: 24,
      },
    },
  ],
  version: 1,
  created_at: new Date(),
  updated_at: new Date(),
};

// Uncomment to insert sample data
// db.designs.insertOne(sampleDesign);
// print('✓ Inserted sample design');

// ----------------------------------------
// Summary
// ----------------------------------------
print('\n========================================');
print('MongoDB Initialization Complete!');
print('========================================');
print(`Database: ${DB_NAME}`);
print('Collections created:');
db.getCollectionNames().forEach((name) => {
  const count = db[name].countDocuments();
  const indexes = db[name].getIndexes().length;
  print(`  - ${name} (${count} documents, ${indexes} indexes)`);
});
print('\n⚠ IMPORTANT: Change default passwords immediately!');
print('========================================\n');
