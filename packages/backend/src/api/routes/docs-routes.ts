import { Router, type Router as RouterType } from 'express';

import { buildOpenApiDocument } from '../../core/openapi';

/**
 * Exposes the auto-generated OpenAPI 3.1 document at /api/v1/docs/openapi.json.
 *
 * The spec is rebuilt on-the-fly from the Zod schemas registered by each
 * use-case, so it always matches the actual validators. A static Swagger UI
 * or Redoc deployment can point at this URL to render the interactive docs.
 */
const router: RouterType = Router();

router.get('/openapi.json', (_req, res) => {
  const doc = buildOpenApiDocument({
    title: 'KitchenXpert API',
    version: process.env.APP_VERSION || '1.0.0',
    description: 'Auto-generated from the Zod schemas that validate each endpoint at runtime.',
  });
  res.json(doc);
});

export default router;
