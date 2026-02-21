/**
 * Utilitaires de validation d'objets
 */

export interface ObjectValidationResult {
  isValid: boolean;
  errors: FieldValidationError[];
}

export interface FieldValidationError {
  path: string;
  message: string;
  value?: unknown;
}

/**
 * Vérifie si une valeur est un objet (non null, non array)
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Vérifie si un objet est vide
 */
export function isEmptyObject(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).length === 0;
}

/**
 * Vérifie si un objet possède une propriété
 */
export function hasProperty<T extends Record<string, unknown>, K extends string>(
  obj: T,
  key: K
): obj is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * Vérifie si toutes les propriétés requises sont présentes
 */
export function hasRequiredProperties(
  obj: Record<string, unknown>,
  requiredKeys: string[]
): ObjectValidationResult {
  const errors: FieldValidationError[] = [];

  for (const key of requiredKeys) {
    if (!hasProperty(obj, key) || obj[key] === undefined || obj[key] === null) {
      errors.push({
        path: key,
        message: `La propriété '${key}' est requise`,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Vérifie si un objet ne contient que des propriétés autorisées
 */
export function hasOnlyAllowedProperties(
  obj: Record<string, unknown>,
  allowedKeys: string[]
): ObjectValidationResult {
  const errors: FieldValidationError[] = [];
  const allowedSet = new Set(allowedKeys);

  for (const key of Object.keys(obj)) {
    if (!allowedSet.has(key)) {
      errors.push({
        path: key,
        message: `La propriété '${key}' n'est pas autorisée`,
        value: obj[key],
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Type guard pour vérifier la structure d'un objet
 */
export function validateObjectStructure<T>(
  obj: unknown,
  schema: ObjectSchema
): obj is T {
  if (!isPlainObject(obj)) return false;

  for (const [key, validator] of Object.entries(schema)) {
    const value = obj[key];

    if (validator.required && (value === undefined || value === null)) {
      return false;
    }

    if (value !== undefined && value !== null && validator.type) {
      if (!validateType(value, validator.type)) {
        return false;
      }
    }

    if (validator.validate && !validator.validate(value)) {
      return false;
    }
  }

  return true;
}

export interface ObjectSchema {
  [key: string]: {
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date';
    validate?: (value: unknown) => boolean;
  };
}

function validateType(value: unknown, type: string): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'object':
      return isPlainObject(value);
    case 'array':
      return Array.isArray(value);
    case 'date':
      return value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
    default:
      return true;
  }
}

/**
 * Valide un objet en profondeur
 */
export function deepValidate(
  obj: unknown,
  validators: Record<string, (value: unknown) => string | null>,
  prefix = ''
): ObjectValidationResult {
  const errors: FieldValidationError[] = [];

  if (!isPlainObject(obj)) {
    errors.push({
      path: prefix || 'root',
      message: 'La valeur doit être un objet',
      value: obj,
    });
    return { isValid: false, errors };
  }

  for (const [key, validator] of Object.entries(validators)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    const error = validator(value);

    if (error) {
      errors.push({
        path,
        message: error,
        value,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Fusionne les résultats de validation
 */
export function mergeValidationResults(
  ...results: ObjectValidationResult[]
): ObjectValidationResult {
  const allErrors = results.flatMap(r => r.errors);
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Vérifie si deux objets sont égaux en profondeur
 */
export function deepEqual(obj1: unknown, obj2: unknown): boolean {
  if (obj1 === obj2) return true;

  if (typeof obj1 !== typeof obj2) return false;

  if (obj1 === null || obj2 === null) return obj1 === obj2;

  if (typeof obj1 !== 'object') return obj1 === obj2;

  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;

  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return false;
    return obj1.every((item, index) => deepEqual(item, obj2[index]));
  }

  const keys1 = Object.keys(obj1 as object);
  const keys2 = Object.keys(obj2 as object);

  if (keys1.length !== keys2.length) return false;

  return keys1.every(key =>
    deepEqual(
      (obj1 as Record<string, unknown>)[key],
      (obj2 as Record<string, unknown>)[key]
    )
  );
}

/**
 * Extrait les différences entre deux objets
 */
export function objectDiff(
  obj1: Record<string, unknown>,
  obj2: Record<string, unknown>
): { added: string[]; removed: string[]; modified: string[] } {
  const keys1 = new Set(Object.keys(obj1));
  const keys2 = new Set(Object.keys(obj2));

  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];

  for (const key of keys2) {
    if (!keys1.has(key)) {
      added.push(key);
    } else if (!deepEqual(obj1[key], obj2[key])) {
      modified.push(key);
    }
  }

  for (const key of keys1) {
    if (!keys2.has(key)) {
      removed.push(key);
    }
  }

  return { added, removed, modified };
}

/**
 * Vérifie si un objet est immutable (frozen)
 */
export function isImmutable(obj: unknown): boolean {
  if (!isPlainObject(obj) && !Array.isArray(obj)) return true;
  if (!Object.isFrozen(obj)) return false;

  if (Array.isArray(obj)) {
    return obj.every(item => isImmutable(item));
  }

  return Object.values(obj).every(value => isImmutable(value));
}

/**
 * Supprime les propriétés undefined d'un objet
 */
export function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key as keyof T] = value as T[keyof T];
    }
  }
  return result;
}

/**
 * Sélectionne certaines propriétés d'un objet
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Exclut certaines propriétés d'un objet
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const keysSet = new Set<string | number | symbol>(keys);
  const result = {} as Omit<T, K>;
  for (const [key, value] of Object.entries(obj)) {
    if (!keysSet.has(key)) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}
