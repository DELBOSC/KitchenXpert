/**
 * Minimal OpenAPI 3.1 generator driven directly by Zod schemas.
 *
 * Rationale
 * ---------
 * `swagger-jsdoc` forces us to hand-maintain JSDoc annotations that drift
 * from the Zod validators over time. Here we introspect the Zod schemas
 * themselves — the same objects that validate requests at runtime — so the
 * spec and the enforcement are guaranteed to match.
 *
 * We only implement the slice of OpenAPI we actually use: objects, strings,
 * numbers, booleans, enums, arrays, optional vs required. For anything more
 * exotic, the operation can supply an override schema.
 */

import { z, type ZodTypeAny } from 'zod';

// ---------------------------------------------------------------------------
// Zod → JSON-Schema (subset)
// ---------------------------------------------------------------------------

export function zodToJsonSchema(schema: ZodTypeAny): Record<string, unknown> {
  const def = (schema as { _def: any })._def;

  switch (def.typeName) {
    case 'ZodString': {
      const out: Record<string, unknown> = { type: 'string' };
      const checks = def.checks as Array<{ kind: string; value?: number; regex?: RegExp }> | undefined;
      checks?.forEach((c) => {
        if (c.kind === 'email') {out.format = 'email';}
        if (c.kind === 'url') {out.format = 'uri';}
        if (c.kind === 'min' && typeof c.value === 'number') {out.minLength = c.value;}
        if (c.kind === 'max' && typeof c.value === 'number') {out.maxLength = c.value;}
      });
      return out;
    }
    case 'ZodNumber': {
      return { type: 'number' };
    }
    case 'ZodBoolean': return { type: 'boolean' };
    case 'ZodLiteral': return { const: def.value };
    case 'ZodEnum': return { type: 'string', enum: def.values };
    case 'ZodArray': return { type: 'array', items: zodToJsonSchema(def.type) };
    case 'ZodOptional':
    case 'ZodNullable':
    case 'ZodDefault':
    case 'ZodEffects':
      return zodToJsonSchema(def.innerType ?? def.schema);
    case 'ZodObject': {
      const shape = def.shape();
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const [key, value] of Object.entries(shape)) {
        const v = value as ZodTypeAny;
        properties[key] = zodToJsonSchema(v);
        const isOptional =
          (v as { isOptional?: () => boolean }).isOptional?.() ||
          ['ZodOptional', 'ZodDefault'].includes((v as any)._def.typeName);
        if (!isOptional) {required.push(key);}
      }
      return {
        type: 'object',
        properties,
        ...(required.length > 0 && { required }),
      };
    }
    default:
      return {};
  }
}

// ---------------------------------------------------------------------------
// Route registry
// ---------------------------------------------------------------------------

export interface OpenAPIRoute {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string;
  summary: string;
  tags?: string[];
  requestBody?: ZodTypeAny;
  responseBody?: ZodTypeAny;
  security?: Array<Record<string, string[]>>;
}

const registry: OpenAPIRoute[] = [];

export function registerRoute(route: OpenAPIRoute): void {
  registry.push(route);
}

export function buildOpenApiDocument(meta: { title: string; version: string; description?: string }): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const route of registry) {
    const pathEntry = (paths[route.path] ||= {});
    pathEntry[route.method] = {
      summary: route.summary,
      tags: route.tags ?? [],
      ...(route.security && { security: route.security }),
      ...(route.requestBody && {
        requestBody: {
          required: true,
          content: { 'application/json': { schema: zodToJsonSchema(route.requestBody) } },
        },
      }),
      responses: {
        '200': {
          description: 'Success',
          ...(route.responseBody && {
            content: { 'application/json': { schema: zodToJsonSchema(route.responseBody) } },
          }),
        },
        '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '409': { description: 'Conflict' },
        '500': { description: 'Internal error' },
      },
    };
  }
  return {
    openapi: '3.1.0',
    info: { title: meta.title, version: meta.version, description: meta.description ?? '' },
    components: {
      securitySchemes: {
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'accessToken' },
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    paths,
  };
}

// Expose the register helper to the example route so build order doesn't
// matter — use-cases import registerRoute to describe themselves.
import { RegisterSchema } from '../use-cases/auth/register.use-case';
registerRoute({
  method: 'post',
  path: '/api/v1/auth/register',
  summary: 'Create a new user account',
  tags: ['Auth'],
  requestBody: RegisterSchema,
  responseBody: z.object({
    data: z.object({
      user: z.object({
        id: z.string(),
        email: z.string().email(),
        firstName: z.string(),
        lastName: z.string(),
        role: z.string(),
      }),
      tokens: z.object({
        accessToken: z.string(),
        refreshToken: z.string(),
        expiresIn: z.number(),
        tokenType: z.string(),
      }),
    }),
  }),
});
