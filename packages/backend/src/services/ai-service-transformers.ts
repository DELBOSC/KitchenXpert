/**
 * AI Service Data Transformers
 *
 * Handles conversion between Express (camelCase) and Python Pydantic (snake_case) formats.
 * Also handles specific field mappings between the two data schemas.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Convert a camelCase string to snake_case
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Convert a snake_case string to camelCase
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Recursively convert all keys of an object from camelCase to snake_case
 */
export function toSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(item => toSnakeCase(item));
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[camelToSnake(key)] = toSnakeCase(value);
    }
    return result;
  }
  return obj;
}

/**
 * Recursively convert all keys of an object from snake_case to camelCase
 */
export function toCamelCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(item => toCamelCase(item));
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[snakeToCamel(key)] = toCamelCase(value);
    }
    return result;
  }
  return obj;
}

/**
 * Transform Express /generate request body into Python LayoutOptimizationRequest format
 *
 * Express GenerationRequestBody:
 *   { room: { dimensions, walls, utilities, preferredShape },
 *     preferences: { budget: { min, max }, style, requiredAppliances, storagePriority, ... },
 *     constraints, numConfigurations, providers }
 *
 * Python LayoutOptimizationRequest:
 *   { room: { dimensions, walls, utilities, preferred_shape },
 *     preferences: { budget: { min_amount, max_amount }, style, required_appliances, storage_priority, ... },
 *     existing_items, fixed_positions, optimization_priorities, population_size, generations }
 */
export function transformGenerateRequest(body: any): Record<string, any> {
  const room = toSnakeCase(body.room || {});

  // Map budget fields: min/max → min_amount/max_amount
  const budget: any = {
    min_amount: body.preferences?.budget?.min ?? 0,
    max_amount: body.preferences?.budget?.max ?? 50000,
    currency: body.preferences?.budget?.currency || 'EUR',
  };

  const preferences: any = {
    budget,
    style: body.preferences?.style || 'modern',
    required_appliances: body.preferences?.requiredAppliances || [],
    optional_appliances: body.preferences?.optionalAppliances || [],
    preferred_providers: body.preferences?.preferredProviders || body.providers || [],
    storage_priority: body.preferences?.storagePriority ?? 5,
  };

  if (body.preferences?.colors) {
    preferences.colors = toSnakeCase(body.preferences.colors);
  }
  if (body.preferences?.accessibility) {
    preferences.accessibility = toSnakeCase(body.preferences.accessibility);
  }

  const result: Record<string, any> = {
    room,
    preferences,
    existing_items: [],
    fixed_positions: {},
    optimization_priorities: ['ergonomics', 'storage', 'workflow'],
    population_size: 50,
    generations: 100,
  };

  return result;
}

/**
 * Transform Python LayoutOptimizationResult back to Express /generate response format
 *
 * The Express response expects:
 *   { configurations: [...], recommended, stats: { totalGenerated, validConfigurations, generationTimeMs, ... } }
 *
 * The Python result has:
 *   { success, best_configuration, alternative_configurations, work_triangle, zones, fitness_score, ... }
 */
export function transformLayoutResult(pythonResult: any, startTime: number, body: any): any {
  const camelResult = toCamelCase(pythonResult);
  const generationTimeMs = Date.now() - startTime;

  // Build configurations array from best + alternatives
  const configurations: any[] = [];

  if (camelResult.bestConfiguration) {
    configurations.push(camelResult.bestConfiguration);
  }
  if (camelResult.alternativeConfigurations) {
    configurations.push(...camelResult.alternativeConfigurations);
  }

  return {
    success: camelResult.success !== false,
    configurations,
    recommended: configurations[0] || null,
    stats: {
      totalGenerated: configurations.length,
      validConfigurations: configurations.filter((c: any) => c.validation?.valid !== false).length,
      generationTimeMs,
      providersQueried: body.providers || ['ikea-fr'],
      productsConsidered: configurations.reduce(
        (sum: number, c: any) => sum + (c.items?.length || 0),
        0,
      ),
      algorithm: 'python-genetic-optimization',
      fitnessScore: camelResult.fitnessScore,
      generationsCompleted: camelResult.generationsCompleted,
    },
  };
}

/**
 * Transform Express /validate request into Python SpaceAnalysisRequest format
 */
export function transformValidateRequest(body: any): Record<string, any> {
  const configuration = toSnakeCase(body.configuration || {});

  // SpaceAnalysisRequest needs a room — extract from configuration or use defaults
  const room = configuration.room || {
    dimensions: { width: 300, length: 300, height: 250, unit: 'cm' },
    walls: [],
    utilities: [],
  };

  return {
    room,
    configuration,
    items: configuration.items || [],
    analyze_accessibility: true,
    analyze_storage: true,
    analyze_workflow: true,
  };
}

/**
 * Transform Python SpaceAnalysisResult back to Express /validate response format
 */
export function transformValidateResult(pythonResult: any): any {
  const camelResult = toCamelCase(pythonResult);

  const errors: any[] = [];
  const warnings: any[] = [];
  const passedChecks: string[] = [];

  // Map conflicts to errors/warnings
  if (camelResult.conflicts) {
    for (const conflict of camelResult.conflicts) {
      if (conflict.severity === 'high') {
        errors.push({
          code: conflict.conflictType,
          message: conflict.resolutionSuggestion || `Conflict between ${conflict.item1Id} and ${conflict.item2Id}`,
          severity: 'error',
        });
      } else {
        warnings.push({
          code: conflict.conflictType,
          message: conflict.resolutionSuggestion || `Minor conflict detected`,
          severity: 'warning',
        });
      }
    }
  }

  // Map accessibility issues
  if (camelResult.accessibility?.issues) {
    for (const issue of camelResult.accessibility.issues) {
      warnings.push({ code: 'ACCESSIBILITY', message: issue, severity: 'warning' });
    }
  }

  // Map workflow analysis
  if (camelResult.workflow?.workTriangle?.isOptimal) {
    passedChecks.push('work_triangle_optimal');
  }

  // Storage check
  if (camelResult.storage?.capacityRating !== 'insufficient') {
    passedChecks.push('adequate_storage');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    passedChecks,
    spaceAnalysis: {
      overallScore: camelResult.overallScore,
      utilization: camelResult.utilization,
      storage: camelResult.storage,
      accessibility: camelResult.accessibility,
      workflow: camelResult.workflow,
      summary: camelResult.summary,
      recommendations: camelResult.recommendations,
    },
  };
}

/**
 * Transform Express /optimize request into Python BudgetOptimizationRequest
 * or LayoutOptimizationRequest depending on optimizeFor
 */
export function transformOptimizeRequest(
  body: any,
  optimizeFor: string,
): { endpoint: 'budget' | 'layout'; payload: Record<string, any> } {
  const configuration = toSnakeCase(body.configuration || {});

  if (optimizeFor === 'budget') {
    return {
      endpoint: 'budget',
      payload: {
        total_budget: configuration.pricing?.total || 10000,
        currency: configuration.pricing?.currency || 'EUR',
        current_configuration: configuration,
        priorities: {},
        fixed_items: [],
        optimization_goal: 'maximize_value',
      },
    };
  }

  // For ergonomics, storage, workspace, cooking, aesthetics → layout optimization
  const priorityMap: Record<string, string[]> = {
    ergonomics: ['ergonomics', 'workflow', 'storage'],
    storage: ['storage', 'ergonomics', 'workflow'],
    workspace: ['workflow', 'ergonomics', 'storage'],
    cooking: ['workflow', 'ergonomics', 'storage'],
    aesthetics: ['ergonomics', 'storage', 'workflow'],
  };

  const room = configuration.room || {
    dimensions: { width: 300, length: 300, height: 250, unit: 'cm' },
    walls: [],
    utilities: [],
  };

  const preferences = configuration.preferences || {
    budget: { min_amount: 5000, max_amount: 50000, currency: 'EUR' },
    style: configuration.style || 'modern',
    required_appliances: [],
    storage_priority: 5,
  };

  return {
    endpoint: 'layout',
    payload: {
      room,
      preferences,
      existing_items: configuration.items || [],
      fixed_positions: {},
      optimization_priorities: priorityMap[optimizeFor] || priorityMap.ergonomics,
      population_size: 50,
      generations: 100,
    },
  };
}

/**
 * Transform Python optimization result to Express /optimize response format
 */
export function transformOptimizeResult(pythonResult: any, optimizeFor: string): any {
  const camelResult = toCamelCase(pythonResult);

  if (optimizeFor === 'budget') {
    // BudgetOptimizationResult
    return {
      optimizedConfiguration: camelResult.optimizedConfiguration || camelResult.bestConfiguration,
      improvements: {
        optimizedFor: 'budget',
        scoreDelta: 0,
        priceDelta: -(camelResult.totalSavings || 0),
        details: [
          ...(camelResult.recommendations || []),
          `Total savings: ${camelResult.savingsPercentage?.toFixed(1) || 0}%`,
        ],
        allocations: camelResult.allocations,
        alternatives: camelResult.alternatives,
        savingOpportunities: camelResult.savingOpportunities,
      },
    };
  }

  // LayoutOptimizationResult
  return {
    optimizedConfiguration: camelResult.bestConfiguration,
    improvements: {
      optimizedFor: optimizeFor,
      scoreDelta: camelResult.fitnessScore || 0,
      priceDelta: 0,
      details: camelResult.recommendations || [],
      fitnessScore: camelResult.fitnessScore,
      generationsCompleted: camelResult.generationsCompleted,
    },
  };
}
