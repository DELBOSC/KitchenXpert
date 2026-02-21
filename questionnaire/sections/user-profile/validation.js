/**
 * User Profile Section Validation Module
 *
 * Validates user inputs for the user profile section of the questionnaire.
 */

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
 * Valid options for each question
 */
const VALID_OPTIONS = {
  'household-size': ['1', '2', '3-4', '5+'],
  'household-type': [
    'single-professional',
    'couple-no-kids',
    'family-young-kids',
    'family-teens',
    'multi-generational',
    'retired'
  ],
  'primary-cook': ['one-person', 'shared-equally', 'everyone-cooks', 'rarely-cook'],
  'special-needs': [
    'wheelchair-access',
    'mobility-limited',
    'vision-impaired',
    'height-considerations',
    'child-safety',
    'none'
  ],
  'ownership-status': ['owner', 'renter-allowed', 'renter-limited'],
  'project-timeline': ['immediately', '1-3-months', '3-6-months', '6-12-months', 'just-exploring']
};

/**
 * Required questions in this section
 */
const REQUIRED_QUESTIONS = [
  'household-size',
  'household-type',
  'cooking-skill-level',
  'ownership-status',
  'project-timeline'
];

/**
 * Validate a single answer
 * @param {string} questionId - The question identifier
 * @param {any} value - The answer value
 * @param {Object} context - Additional context (other answers, user info)
 * @returns {Object} Validation result
 */
function validateAnswer(questionId, value, context = {}) {
  const validators = {
    'household-size': validateHouseholdSize,
    'household-type': validateHouseholdType,
    'primary-cook': validatePrimaryCook,
    'cooking-skill-level': validateCookingSkillLevel,
    'special-needs': validateSpecialNeeds,
    'ownership-status': validateOwnershipStatus,
    'project-timeline': validateProjectTimeline
  };

  const validator = validators[questionId];

  if (!validator) {
    return {
      valid: true,
      questionId,
      value,
      warnings: [{ code: 'UNKNOWN_QUESTION', message: 'No validator defined for this question' }]
    };
  }

  try {
    return validator(value, context);
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        valid: false,
        questionId: error.questionId,
        error: {
          code: error.code,
          message: error.message
        }
      };
    }
    throw error;
  }
}

/**
 * Validate household size
 */
function validateHouseholdSize(value, context) {
  const questionId = 'household-size';

  if (value === undefined || value === null || value === '') {
    throw new ValidationError(questionId, 'Please select your household size', 'REQUIRED');
  }

  if (!VALID_OPTIONS['household-size'].includes(value)) {
    throw new ValidationError(questionId, 'Invalid household size selection', 'INVALID_OPTION');
  }

  return {
    valid: true,
    questionId,
    value,
    normalized: value
  };
}

/**
 * Validate household type
 */
function validateHouseholdType(value, context) {
  const questionId = 'household-type';

  if (value === undefined || value === null || value === '') {
    throw new ValidationError(questionId, 'Please select your household type', 'REQUIRED');
  }

  if (!VALID_OPTIONS['household-type'].includes(value)) {
    throw new ValidationError(questionId, 'Invalid household type selection', 'INVALID_OPTION');
  }

  // Cross-validation with household size
  const warnings = [];
  if (context.answers?.['household-size'] === '1' &&
      ['family-young-kids', 'family-teens', 'multi-generational'].includes(value)) {
    warnings.push({
      code: 'INCONSISTENT_ANSWERS',
      message: 'Your household type seems inconsistent with a household of 1 person'
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
 * Validate primary cook
 */
function validatePrimaryCook(value, context) {
  const questionId = 'primary-cook';

  // This question can be skipped for solo households
  if (context.answers?.['household-size'] === '1') {
    return {
      valid: true,
      questionId,
      value: 'one-person',
      normalized: 'one-person',
      skipped: true,
      skipReason: 'Single-person household'
    };
  }

  if (value === undefined || value === null || value === '') {
    throw new ValidationError(questionId, 'Please indicate who does the cooking', 'REQUIRED');
  }

  if (!VALID_OPTIONS['primary-cook'].includes(value)) {
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
 * Validate cooking skill level
 */
function validateCookingSkillLevel(value, context) {
  const questionId = 'cooking-skill-level';

  if (value === undefined || value === null || value === '') {
    throw new ValidationError(questionId, 'Please rate your cooking skill level', 'REQUIRED');
  }

  const numValue = parseInt(value, 10);

  if (isNaN(numValue)) {
    throw new ValidationError(questionId, 'Skill level must be a number', 'INVALID_TYPE');
  }

  if (numValue < 1 || numValue > 5) {
    throw new ValidationError(questionId, 'Skill level must be between 1 and 5', 'OUT_OF_RANGE');
  }

  return {
    valid: true,
    questionId,
    value: numValue,
    normalized: numValue,
    label: ['beginner', 'basic', 'intermediate', 'advanced', 'professional'][numValue - 1]
  };
}

/**
 * Validate special needs
 */
function validateSpecialNeeds(value, context) {
  const questionId = 'special-needs';

  // This is an optional multi-select question
  if (value === undefined || value === null) {
    return {
      valid: true,
      questionId,
      value: [],
      normalized: []
    };
  }

  // Ensure value is an array
  const values = Array.isArray(value) ? value : [value];

  // Validate each selected option
  const invalidOptions = values.filter(v => !VALID_OPTIONS['special-needs'].includes(v));

  if (invalidOptions.length > 0) {
    throw new ValidationError(
      questionId,
      `Invalid options selected: ${invalidOptions.join(', ')}`,
      'INVALID_OPTION'
    );
  }

  // Check for logical conflicts
  const warnings = [];
  if (values.includes('none') && values.length > 1) {
    warnings.push({
      code: 'CONFLICTING_OPTIONS',
      message: '"No special requirements" cannot be combined with other options'
    });
  }

  // Normalize: if 'none' is selected with others, remove 'none'
  let normalized = values;
  if (values.includes('none') && values.length > 1) {
    normalized = values.filter(v => v !== 'none');
  }

  return {
    valid: true,
    questionId,
    value: values,
    normalized,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Validate ownership status
 */
function validateOwnershipStatus(value, context) {
  const questionId = 'ownership-status';

  if (value === undefined || value === null || value === '') {
    throw new ValidationError(questionId, 'Please indicate your ownership status', 'REQUIRED');
  }

  if (!VALID_OPTIONS['ownership-status'].includes(value)) {
    throw new ValidationError(questionId, 'Invalid ownership status selection', 'INVALID_OPTION');
  }

  return {
    valid: true,
    questionId,
    value,
    normalized: value
  };
}

/**
 * Validate project timeline
 */
function validateProjectTimeline(value, context) {
  const questionId = 'project-timeline';

  if (value === undefined || value === null || value === '') {
    throw new ValidationError(questionId, 'Please select your project timeline', 'REQUIRED');
  }

  if (!VALID_OPTIONS['project-timeline'].includes(value)) {
    throw new ValidationError(questionId, 'Invalid timeline selection', 'INVALID_OPTION');
  }

  return {
    valid: true,
    questionId,
    value,
    normalized: value
  };
}

/**
 * Validate entire section
 * @param {Object} answers - All answers for this section
 * @param {Object} context - Additional context
 * @returns {Object} Section validation result
 */
function validateSection(answers, context = {}) {
  const results = {
    valid: true,
    errors: [],
    warnings: [],
    answeredQuestions: [],
    missingRequired: [],
    validatedAnswers: {}
  };

  // Check for required questions
  for (const questionId of REQUIRED_QUESTIONS) {
    // Skip primary-cook if solo household
    if (questionId === 'primary-cook' && answers['household-size'] === '1') {
      continue;
    }

    const value = answers[questionId];
    if (value === undefined || value === null || value === '') {
      results.missingRequired.push(questionId);
    }
  }

  if (results.missingRequired.length > 0) {
    results.valid = false;
    results.errors.push({
      code: 'MISSING_REQUIRED',
      message: `Please answer the following required questions: ${results.missingRequired.join(', ')}`,
      questions: results.missingRequired
    });
  }

  // Validate each answered question
  for (const [questionId, value] of Object.entries(answers)) {
    const validationResult = validateAnswer(questionId, value, {
      ...context,
      answers
    });

    if (!validationResult.valid) {
      results.valid = false;
      results.errors.push({
        questionId,
        ...validationResult.error
      });
    } else {
      results.answeredQuestions.push(questionId);
      results.validatedAnswers[questionId] = validationResult.normalized || validationResult.value;

      if (validationResult.warnings) {
        results.warnings.push(...validationResult.warnings.map(w => ({
          questionId,
          ...w
        })));
      }
    }
  }

  // Calculate completion percentage
  const totalRequired = REQUIRED_QUESTIONS.filter(q => {
    // Exclude conditionally skipped questions
    if (q === 'primary-cook' && answers['household-size'] === '1') return false;
    return true;
  }).length;

  const answeredRequired = results.answeredQuestions.filter(q =>
    REQUIRED_QUESTIONS.includes(q)
  ).length;

  results.completionPercentage = Math.round((answeredRequired / totalRequired) * 100);

  return results;
}

/**
 * Check if section is complete
 * @param {Object} answers - All answers for this section
 * @returns {boolean} Whether section is complete
 */
function isSectionComplete(answers) {
  const result = validateSection(answers);
  return result.valid && result.missingRequired.length === 0;
}

// Export functions
module.exports = {
  validateAnswer,
  validateSection,
  isSectionComplete,
  ValidationError,
  VALID_OPTIONS,
  REQUIRED_QUESTIONS
};
