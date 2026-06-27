/**
 * Schema Validation Utilities
 * Provides utility functions for validating data against schemas.
 */

/**
 * Schema validation result structure.
 */
export interface SchemaValidationResult {
  valid: boolean;
  errors: SchemaValidationError[];
}

/**
 * Schema validation error structure.
 */
export interface SchemaValidationError {
  path: string;
  message: string;
  value?: unknown;
  rule?: string;
}

/**
 * Schema field types.
 */
export type SchemaFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'date'
  | 'email'
  | 'url'
  | 'uuid'
  | 'any';

/**
 * Schema field definition.
 */
export interface SchemaField {
  type: SchemaFieldType;
  required?: boolean;
  nullable?: boolean;
  default?: unknown;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp | string;
  enum?: unknown[];
  items?: SchemaField;
  properties?: Schema;
  custom?: (value: unknown, path: string) => SchemaValidationError | null;
  message?: string;
}

/**
 * Schema definition.
 */
export type Schema = Record<string, SchemaField>;

/**
 * Creates a validation error.
 * @param path - The path to the field
 * @param message - The error message
 * @param value - The invalid value
 * @param rule - The validation rule that failed
 * @returns A SchemaValidationError object
 */
function createError(
  path: string,
  message: string,
  value?: unknown,
  rule?: string
): SchemaValidationError {
  return { path, message, value, rule };
}

/**
 * Validates a value against a field schema.
 * @param value - The value to validate
 * @param field - The field schema
 * @param path - The current path
 * @returns An array of validation errors
 */
function validateField(value: unknown, field: SchemaField, path: string): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];

  // Handle null/undefined
  if (value === undefined) {
    if (field.required) {
      errors.push(createError(path, field.message ?? 'Field is required', value, 'required'));
    }
    return errors;
  }

  if (value === null) {
    if (!field.nullable) {
      errors.push(createError(path, field.message ?? 'Field cannot be null', value, 'nullable'));
    }
    return errors;
  }

  // Type validation
  const typeErrors = validateType(value, field, path);
  if (typeErrors.length > 0) {
    return typeErrors;
  }

  // Additional validations based on type
  switch (field.type) {
    case 'string':
    case 'email':
    case 'url':
    case 'uuid':
      errors.push(...validateStringField(value as string, field, path));
      break;
    case 'number':
      errors.push(...validateNumberField(value as number, field, path));
      break;
    case 'array':
      errors.push(...validateArrayField(value as unknown[], field, path));
      break;
    case 'object':
      if (field.properties) {
        errors.push(...validateObject(value as Record<string, unknown>, field.properties, path));
      }
      break;
  }

  // Enum validation
  if (field.enum && !field.enum.includes(value)) {
    errors.push(
      createError(
        path,
        field.message ?? `Value must be one of: ${field.enum.join(', ')}`,
        value,
        'enum'
      )
    );
  }

  // Custom validation
  if (field.custom) {
    const customError = field.custom(value, path);
    if (customError) {
      errors.push(customError);
    }
  }

  return errors;
}

/**
 * Validates the type of a value.
 * @param value - The value to validate
 * @param field - The field schema
 * @param path - The current path
 * @returns An array of validation errors
 */
function validateType(value: unknown, field: SchemaField, path: string): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];

  switch (field.type) {
    case 'string':
      if (typeof value !== 'string') {
        errors.push(createError(path, field.message ?? 'Expected a string', value, 'type'));
      }
      break;
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        errors.push(createError(path, field.message ?? 'Expected a number', value, 'type'));
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        errors.push(createError(path, field.message ?? 'Expected a boolean', value, 'type'));
      }
      break;
    case 'object':
      if (typeof value !== 'object' || Array.isArray(value)) {
        errors.push(createError(path, field.message ?? 'Expected an object', value, 'type'));
      }
      break;
    case 'array':
      if (!Array.isArray(value)) {
        errors.push(createError(path, field.message ?? 'Expected an array', value, 'type'));
      }
      break;
    case 'date':
      if (!(value instanceof Date) || isNaN(value.getTime())) {
        errors.push(createError(path, field.message ?? 'Expected a valid date', value, 'type'));
      }
      break;
    case 'email':
      if (typeof value !== 'string' || !isValidEmail(value)) {
        errors.push(createError(path, field.message ?? 'Expected a valid email', value, 'type'));
      }
      break;
    case 'url':
      if (typeof value !== 'string' || !isValidUrl(value)) {
        errors.push(createError(path, field.message ?? 'Expected a valid URL', value, 'type'));
      }
      break;
    case 'uuid':
      if (typeof value !== 'string' || !isValidUuid(value)) {
        errors.push(createError(path, field.message ?? 'Expected a valid UUID', value, 'type'));
      }
      break;
    case 'any':
      // Any type is always valid
      break;
  }

  return errors;
}

/**
 * Validates a string field.
 * @param value - The string value
 * @param field - The field schema
 * @param path - The current path
 * @returns An array of validation errors
 */
function validateStringField(
  value: string,
  field: SchemaField,
  path: string
): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];

  if (field.minLength !== undefined && value.length < field.minLength) {
    errors.push(
      createError(path, field.message ?? `Minimum length is ${field.minLength}`, value, 'minLength')
    );
  }

  if (field.maxLength !== undefined && value.length > field.maxLength) {
    errors.push(
      createError(path, field.message ?? `Maximum length is ${field.maxLength}`, value, 'maxLength')
    );
  }

  if (field.pattern) {
    let regex: RegExp;
    if (typeof field.pattern === 'string') {
      // Limit pattern length and complexity to prevent ReDoS
      if (field.pattern.length > 200) {
        errors.push(createError(path, 'Pattern too long', value, 'pattern'));
        return errors;
      }
      try {
        regex = new RegExp(field.pattern);
      } catch {
        errors.push(createError(path, 'Invalid pattern', value, 'pattern'));
        return errors;
      }
    } else {
      regex = field.pattern;
    }
    if (!regex.test(value)) {
      errors.push(
        createError(
          path,
          field.message ?? 'Value does not match the required pattern',
          value,
          'pattern'
        )
      );
    }
  }

  return errors;
}

/**
 * Validates a number field.
 * @param value - The number value
 * @param field - The field schema
 * @param path - The current path
 * @returns An array of validation errors
 */
function validateNumberField(
  value: number,
  field: SchemaField,
  path: string
): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];

  if (field.min !== undefined && value < field.min) {
    errors.push(createError(path, field.message ?? `Minimum value is ${field.min}`, value, 'min'));
  }

  if (field.max !== undefined && value > field.max) {
    errors.push(createError(path, field.message ?? `Maximum value is ${field.max}`, value, 'max'));
  }

  return errors;
}

/**
 * Validates an array field.
 * @param value - The array value
 * @param field - The field schema
 * @param path - The current path
 * @returns An array of validation errors
 */
function validateArrayField(
  value: unknown[],
  field: SchemaField,
  path: string
): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];

  if (field.minLength !== undefined && value.length < field.minLength) {
    errors.push(
      createError(path, field.message ?? `Minimum length is ${field.minLength}`, value, 'minLength')
    );
  }

  if (field.maxLength !== undefined && value.length > field.maxLength) {
    errors.push(
      createError(path, field.message ?? `Maximum length is ${field.maxLength}`, value, 'maxLength')
    );
  }

  if (field.items) {
    value.forEach((item, index) => {
      errors.push(...validateField(item, field.items!, `${path}[${index}]`));
    });
  }

  return errors;
}

/**
 * Validates an object against a schema.
 * @param data - The data to validate
 * @param schema - The schema to validate against
 * @param basePath - The base path for error messages
 * @returns An array of validation errors
 */
function validateObject(
  data: Record<string, unknown>,
  schema: Schema,
  basePath: string = ''
): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];

  for (const [key, field] of Object.entries(schema)) {
    const path = basePath ? `${basePath}.${key}` : key;
    const value = data[key];
    errors.push(...validateField(value, field, path));
  }

  return errors;
}

/**
 * Validates data against a schema.
 * @param data - The data to validate
 * @param schema - The schema to validate against
 * @returns The validation result
 */
export function validate(data: Record<string, unknown>, schema: Schema): SchemaValidationResult {
  const errors = validateObject(data, schema);
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates data and throws an error if invalid.
 * @param data - The data to validate
 * @param schema - The schema to validate against
 * @throws Error if validation fails
 */
export function validateOrThrow(data: Record<string, unknown>, schema: Schema): void {
  const result = validate(data, schema);
  if (!result.valid) {
    const messages = result.errors.map((e) => `${e.path}: ${e.message}`).join('; ');
    throw new Error(`Validation failed: ${messages}`);
  }
}

/**
 * Creates a schema field definition.
 * @param type - The field type
 * @param options - Additional options
 * @returns A SchemaField object
 */
export function field(type: SchemaFieldType, options: Omit<SchemaField, 'type'> = {}): SchemaField {
  return { type, ...options };
}

/**
 * Creates a required string field.
 * @param options - Additional options
 * @returns A SchemaField object
 */
export function string(options: Omit<SchemaField, 'type'> = {}): SchemaField {
  return field('string', { required: true, ...options });
}

/**
 * Creates a required number field.
 * @param options - Additional options
 * @returns A SchemaField object
 */
export function number(options: Omit<SchemaField, 'type'> = {}): SchemaField {
  return field('number', { required: true, ...options });
}

/**
 * Creates a required boolean field.
 * @param options - Additional options
 * @returns A SchemaField object
 */
export function boolean(options: Omit<SchemaField, 'type'> = {}): SchemaField {
  return field('boolean', { required: true, ...options });
}

/**
 * Creates a required email field.
 * @param options - Additional options
 * @returns A SchemaField object
 */
export function email(options: Omit<SchemaField, 'type'> = {}): SchemaField {
  return field('email', { required: true, ...options });
}

/**
 * Creates a required URL field.
 * @param options - Additional options
 * @returns A SchemaField object
 */
export function url(options: Omit<SchemaField, 'type'> = {}): SchemaField {
  return field('url', { required: true, ...options });
}

/**
 * Creates a required UUID field.
 * @param options - Additional options
 * @returns A SchemaField object
 */
export function uuid(options: Omit<SchemaField, 'type'> = {}): SchemaField {
  return field('uuid', { required: true, ...options });
}

/**
 * Creates a required array field.
 * @param itemSchema - The schema for array items
 * @param options - Additional options
 * @returns A SchemaField object
 */
export function array(
  itemSchema?: SchemaField,
  options: Omit<SchemaField, 'type' | 'items'> = {}
): SchemaField {
  return field('array', { required: true, items: itemSchema, ...options });
}

/**
 * Creates a required object field.
 * @param properties - The object properties schema
 * @param options - Additional options
 * @returns A SchemaField object
 */
export function object(
  properties?: Schema,
  options: Omit<SchemaField, 'type' | 'properties'> = {}
): SchemaField {
  return field('object', { required: true, properties, ...options });
}

/**
 * Makes a field optional.
 * @param schemaField - The field to make optional
 * @returns The optional field
 */
export function optional(schemaField: SchemaField): SchemaField {
  return { ...schemaField, required: false };
}

/**
 * Makes a field nullable.
 * @param schemaField - The field to make nullable
 * @returns The nullable field
 */
export function nullable(schemaField: SchemaField): SchemaField {
  return { ...schemaField, nullable: true };
}

/**
 * Checks if a string is a valid email.
 * @param value - The value to check
 * @returns True if valid email
 */
function isValidEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Checks if a string is a valid URL.
 * @param value - The value to check
 * @returns True if valid URL
 */
function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a string is a valid UUID.
 * @param value - The value to check
 * @returns True if valid UUID
 */
function isValidUuid(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Applies default values from schema to data.
 * @param data - The data object
 * @param schema - The schema with default values
 * @returns The data with defaults applied
 */
export function applyDefaults<T extends Record<string, unknown>>(data: T, schema: Schema): T {
  const result = { ...data };

  for (const [key, field] of Object.entries(schema)) {
    if (result[key] === undefined && field.default !== undefined) {
      (result as Record<string, unknown>)[key] = field.default;
    }
  }

  return result;
}

/**
 * Creates a validator function for a schema.
 * @param schema - The schema to create a validator for
 * @returns A validator function
 */
export function createValidator(
  schema: Schema
): (data: Record<string, unknown>) => SchemaValidationResult {
  return (data: Record<string, unknown>) => validate(data, schema);
}
