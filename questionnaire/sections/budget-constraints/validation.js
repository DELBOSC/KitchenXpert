/**
 * Budget Constraints Section Validation Module
 *
 * Validates user inputs for the budget constraints section.
 */

const budgetCalculator = require('./budget-calculator');

/**
 * Validation error class
 */
class ValidationError extends Error {
  constructor(questionId, message, code) {
    super(message);
    this.name = 'ValidationError';
    this.questionId = questionId;
    this.code = code;
  }
}

/**
 * Valid options
 */
const VALID_OPTIONS = {
  'total-budget': Object.keys(budgetCalculator.BUDGET_RANGES),
  'financing-method': ['cash-savings', 'home-equity', 'personal-loan', 'credit-card', 'contractor-financing', 'phased'],
  'priority-spending': ['appliances', 'cabinets', 'countertops', 'layout', 'lighting', 'flooring', 'storage', 'technology'],
  'savings-areas': ['cabinet-material', 'countertop-edges', 'hardware', 'backsplash', 'lighting-fixtures', 'sink-faucet', 'diy-some'],
  'appliance-budget': Object.keys(budgetCalculator.APPLIANCE_RANGES),
  'roi-consideration': ['very-important', 'somewhat-important', 'not-important'],
  'contingency-comfort': ['yes-20-plus', 'yes-10-20', 'some-buffer', 'no-buffer']
};

/**
 * Required questions
 */
const REQUIRED_QUESTIONS = [
  'total-budget',
  'budget-flexibility',
  'financing-method',
  'priority-spending',
  'appliance-budget',
  'roi-consideration',
  'contingency-comfort'
];

/**
 * Validate a single answer
 */
function validateAnswer(questionId, value, context = {}) {
  const validators = {
    'total-budget': validateTotalBudget,
    'budget-flexibility': validateBudgetFlexibility,
    'financing-method': validateFinancingMethod,
    'priority-spending': validatePrioritySpending,
    'savings-areas': validateSavingsAreas,
    'appliance-budget': validateApplianceBudget,
    'roi-consideration': validateROI,
    'contingency-comfort': validateContingency
  };

  const validator = validators[questionId];

  if (!validator) {
    return { valid: true, questionId, value };
  }

  try {
    return validator(value, context);
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        valid: false,
        questionId: error.questionId,
        error: { code: error.code, message: error.message }
      };
    }
    throw error;
  }
}

/**
 * Validate total budget
 */
function validateTotalBudget(value) {
  const questionId = 'total-budget';

  if (!value) {
    throw new ValidationError(questionId, 'Please select your total budget', 'REQUIRED');
  }

  if (!VALID_OPTIONS['total-budget'].includes(value)) {
    throw new ValidationError(questionId, 'Invalid budget selection', 'INVALID_OPTION');
  }

  return {
    valid: true,
    questionId,
    value,
    normalized: value,
    budgetRange: budgetCalculator.BUDGET_RANGES[value]
  };
}

/**
 * Validate budget flexibility
 */
function validateBudgetFlexibility(value) {
  const questionId = 'budget-flexibility';

  if (value === undefined || value === null || value === '') {
    throw new ValidationError(questionId, 'Please indicate your budget flexibility', 'REQUIRED');
  }

  const numValue = parseInt(value, 10);

  if (isNaN(numValue) || numValue < 1 || numValue > 5) {
    throw new ValidationError(questionId, 'Flexibility must be between 1 and 5', 'INVALID_RANGE');
  }

  return {
    valid: true,
    questionId,
    value: numValue,
    normalized: numValue
  };
}

/**
 * Validate financing method
 */
function validateFinancingMethod(value) {
  const questionId = 'financing-method';

  if (!value) {
    throw new ValidationError(questionId, 'Please select a financing method', 'REQUIRED');
  }

  if (!VALID_OPTIONS['financing-method'].includes(value)) {
    throw new ValidationError(questionId, 'Invalid financing method', 'INVALID_OPTION');
  }

  return {
    valid: true,
    questionId,
    value,
    normalized: value
  };
}

/**
 * Validate priority spending (multi-select with limit)
 */
function validatePrioritySpending(value, context) {
  const questionId = 'priority-spending';

  if (!value || (Array.isArray(value) && value.length === 0)) {
    throw new ValidationError(questionId, 'Please select at least one spending priority', 'REQUIRED');
  }

  const values = Array.isArray(value) ? value : [value];

  // Check for invalid options
  const invalidOptions = values.filter(v => !VALID_OPTIONS['priority-spending'].includes(v));
  if (invalidOptions.length > 0) {
    throw new ValidationError(questionId, `Invalid options: ${invalidOptions.join(', ')}`, 'INVALID_OPTION');
  }

  // Check max selections
  const warnings = [];
  if (values.length > 3) {
    warnings.push({
      code: 'TOO_MANY_PRIORITIES',
      message: 'Select up to 3 priorities for best results. Having too many priorities dilutes your budget.'
    });
  }

  return {
    valid: true,
    questionId,
    value: values,
    normalized: values.slice(0, 3),
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Validate savings areas (optional multi-select)
 */
function validateSavingsAreas(value) {
  const questionId = 'savings-areas';

  // Optional field
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return {
      valid: true,
      questionId,
      value: [],
      normalized: []
    };
  }

  const values = Array.isArray(value) ? value : [value];

  const invalidOptions = values.filter(v => !VALID_OPTIONS['savings-areas'].includes(v));
  if (invalidOptions.length > 0) {
    throw new ValidationError(questionId, `Invalid options: ${invalidOptions.join(', ')}`, 'INVALID_OPTION');
  }

  return {
    valid: true,
    questionId,
    value: values,
    normalized: values
  };
}

/**
 * Validate appliance budget
 */
function validateApplianceBudget(value, context) {
  const questionId = 'appliance-budget';

  if (!value) {
    throw new ValidationError(questionId, 'Please select your appliance budget', 'REQUIRED');
  }

  if (!VALID_OPTIONS['appliance-budget'].includes(value)) {
    throw new ValidationError(questionId, 'Invalid appliance budget', 'INVALID_OPTION');
  }

  // Cross-validation with total budget
  const warnings = [];
  const totalBudget = context.answers?.['total-budget'];

  if (totalBudget) {
    const totalRange = budgetCalculator.BUDGET_RANGES[totalBudget];
    const applianceRange = budgetCalculator.APPLIANCE_RANGES[value];

    if (totalRange && applianceRange) {
      const totalMidpoint = (totalRange.min + totalRange.max) / 2;
      const applianceMidpoint = (applianceRange.min + applianceRange.max) / 2;

      if (applianceMidpoint > totalMidpoint * 0.4) {
        warnings.push({
          code: 'HIGH_APPLIANCE_RATIO',
          message: 'Your appliance budget is more than 40% of your total budget. This may limit funds for other areas.'
        });
      }

      if (applianceRange.min > totalRange.max) {
        warnings.push({
          code: 'APPLIANCE_EXCEEDS_TOTAL',
          message: 'Your appliance budget exceeds your total renovation budget.',
          severity: 'error'
        });
      }
    }
  }

  return {
    valid: true,
    questionId,
    value,
    normalized: value,
    applianceRange: budgetCalculator.APPLIANCE_RANGES[value],
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Validate ROI consideration
 */
function validateROI(value) {
  const questionId = 'roi-consideration';

  if (!value) {
    throw new ValidationError(questionId, 'Please indicate ROI importance', 'REQUIRED');
  }

  if (!VALID_OPTIONS['roi-consideration'].includes(value)) {
    throw new ValidationError(questionId, 'Invalid selection', 'INVALID_OPTION');
  }

  return {
    valid: true,
    questionId,
    value,
    normalized: value
  };
}

/**
 * Validate contingency comfort
 */
function validateContingency(value) {
  const questionId = 'contingency-comfort';

  if (!value) {
    throw new ValidationError(questionId, 'Please indicate your contingency situation', 'REQUIRED');
  }

  if (!VALID_OPTIONS['contingency-comfort'].includes(value)) {
    throw new ValidationError(questionId, 'Invalid selection', 'INVALID_OPTION');
  }

  const warnings = [];
  if (value === 'no-buffer') {
    warnings.push({
      code: 'NO_CONTINGENCY',
      message: 'Renovations often have unexpected costs. Consider setting aside at least 10% for surprises.',
      severity: 'warning'
    });
  }

  return {
    valid: true,
    questionId,
    value,
    normalized: value,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Validate entire section
 */
function validateSection(answers, context = {}) {
  const results = {
    valid: true,
    errors: [],
    warnings: [],
    answeredQuestions: [],
    missingRequired: [],
    validatedAnswers: {},
    budgetAnalysis: null
  };

  // Check required questions
  for (const questionId of REQUIRED_QUESTIONS) {
    const value = answers[questionId];
    if (value === undefined || value === null || value === '' ||
        (Array.isArray(value) && value.length === 0)) {
      results.missingRequired.push(questionId);
    }
  }

  if (results.missingRequired.length > 0) {
    results.valid = false;
    results.errors.push({
      code: 'MISSING_REQUIRED',
      message: `Please answer: ${results.missingRequired.join(', ')}`,
      questions: results.missingRequired
    });
  }

  // Validate each answer
  for (const [questionId, value] of Object.entries(answers)) {
    const validationResult = validateAnswer(questionId, value, { ...context, answers });

    if (!validationResult.valid) {
      results.valid = false;
      results.errors.push({ questionId, ...validationResult.error });
    } else {
      results.answeredQuestions.push(questionId);
      results.validatedAnswers[questionId] = validationResult.normalized || validationResult.value;

      if (validationResult.warnings) {
        results.warnings.push(...validationResult.warnings.map(w => ({ questionId, ...w })));
      }
    }
  }

  // Cross-validate budget consistency
  if (results.valid && answers['total-budget'] && answers['appliance-budget']) {
    const crossValidation = crossValidateBudgets(answers);
    if (crossValidation.errors.length > 0) {
      results.errors.push(...crossValidation.errors);
    }
    if (crossValidation.warnings.length > 0) {
      results.warnings.push(...crossValidation.warnings);
    }
  }

  // Calculate completion
  results.completionPercentage = Math.round(
    (results.answeredQuestions.length / REQUIRED_QUESTIONS.length) * 100
  );

  return results;
}

/**
 * Cross-validate budget selections
 */
function crossValidateBudgets(answers) {
  const errors = [];
  const warnings = [];

  const totalRange = budgetCalculator.BUDGET_RANGES[answers['total-budget']];
  const applianceRange = budgetCalculator.APPLIANCE_RANGES[answers['appliance-budget']];

  if (totalRange && applianceRange) {
    // Check if appliance budget exceeds total
    if (applianceRange.min > totalRange.max) {
      errors.push({
        code: 'BUDGET_MISMATCH',
        message: 'Your appliance budget minimum exceeds your total budget maximum',
        questionIds: ['total-budget', 'appliance-budget']
      });
    }

    // Check if appliance budget is disproportionate
    const totalMid = (totalRange.min + totalRange.max) / 2;
    const applianceMid = (applianceRange.min + applianceRange.max) / 2;

    if (applianceMid > totalMid * 0.5) {
      warnings.push({
        code: 'APPLIANCE_HEAVY_BUDGET',
        message: 'More than 50% of your budget would go to appliances, leaving limited funds for cabinets, countertops, and installation'
      });
    }
  }

  return { errors, warnings };
}

/**
 * Check if section is complete
 */
function isSectionComplete(answers) {
  const result = validateSection(answers);
  return result.valid && result.missingRequired.length === 0;
}

module.exports = {
  validateAnswer,
  validateSection,
  isSectionComplete,
  crossValidateBudgets,
  ValidationError,
  VALID_OPTIONS,
  REQUIRED_QUESTIONS
};
