import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import type { Express } from 'express';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'KitchenXpert API',
    version: '1.0.0',
    description: 'API pour la plateforme de conception de cuisines KitchenXpert',
    contact: { name: 'KitchenXpert Team' },
  },
  servers: [
    { url: '/api/v1', description: 'API v1' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'access_token',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      Kitchen: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          style: { type: 'string' },
          layout: { type: 'string' },
          width: { type: 'number' },
          length: { type: 'number' },
          height: { type: 'number' },
        },
      },
      RoomScanResult: {
        type: 'object',
        properties: {
          dimensions: {
            type: 'object',
            properties: {
              width: { type: 'number', description: 'Width in mm' },
              length: { type: 'number', description: 'Length in mm' },
              height: { type: 'number', description: 'Height in mm' },
            },
          },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          notes: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
};

const options: swaggerJSDoc.Options = {
  swaggerDefinition,
  apis: ['./src/api/routes/*.ts', './src/api/controllers/*.ts'],
};

const swaggerSpec = swaggerJSDoc(options);

export function setupSwagger(app: Express): void {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'KitchenXpert API Documentation',
  }));
}
