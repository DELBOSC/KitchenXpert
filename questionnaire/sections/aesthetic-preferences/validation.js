/**
 * Aesthetic Preferences Section Validation Module
 *
 * Validates user inputs for the aesthetic preferences section.
 */

const styleMatrix = require('./style-matrix.json');

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
  'kitchen-style': Object.keys(styleMatrix.styles),
  'color-preference': [
    'neutral-light',
    'neutral-warm',
    'neutral-dark',
    'two-tone',
    'colorful',
    'natural',
  ],
  'cabinet-style': ['flat-panel', 'shaker', 'raised-panel', 'beadboard', 'glass-front', 'louvered'],
  'countertop-material': [
    'quartz',
    'granite',
    'marble',
    'butcher-block',
    'solid-surface',
    'concrete',
    'laminate',
    'stainless-steel',
  ],
  'hardware-style': ['handleless', 'bar-pulls', 'knobs', 'cup-pulls', 'mixed'],
  'hardware-finish': [
    'matte-black',
    'brushed-nickel',
    'polished-chrome',
    'brass',
    'oil-rubbed-bronze',
    'copper',
    'stainless',
  ],
  'backsplash-preference': [
    'subway-tile',
    'large-format',
    'mosaic',
    'natural-stone',
    'glass',
    'patterned-tile',
    'slab',
  ],
  'flooring-preference': [
    'hardwood',
    'engineered-wood',
    'tile',
    'lvp',
    'natural-stone',
    'concrete',
  ],
  'lighting-style': [
    'pendant-lights',
    'under-cabinet',
    'recessed',
    'in-cabinet',
    'toe-kick',
    'natural-light',
    'smart-lighting',
  ],
};

/**
 * Required questions
 */
const REQUIRED_QUESTIONS = [
  'kitchen-style',
  'color-preference',
  'cabinet-style',
  'countertop-material',
  'hardware-style',
  'hardware-finish',
  'backsplash-preference',
  'flooring-preference',
  'lighting-style',
];

/**
 * Validate a single answer
 */
function validateAnswer(questionId, value, context = {}) {
  const validators = {
    'kitchen-style': validateKitchenStyle,
    'color-preference': validateColorPreference,
    'cabinet-style': validateCabinetStyle,
    'countertop-material': validateCountertopMaterial,
    'hardware-style': validateHardwareStyle,
    'hardware-finish': validateHardwareFinish,
    'backsplash-preference': validateBacksplashPreference,
    'flooring-preference': validateFlooringPreference,
    'lighting-style': validateLightingStyle,
  };

  const validator = validators[questionId];

  if (!validator) {
    return {
      valid: true,
      questionId,
      value,
      warnings: [{ code: 'UNKNOWN_QUESTION', message: 'No validator defined' }],
    };
  }

  try {
    return validator(value, context);
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        valid: false,
        questionId: error.questionId,
        error: { code: error.code, message: error.message },
      };
    }
    throw error;
  }
}

/**
 * Validate kitchen style
 */
function validateKitchenStyle(value) {
  const questionId = 'kitchen-style';

  if (!value) {
    throw new ValidationError(questionId, 'Please select a kitchen style', 'REQUIRED');
  }

  if (!VALID_OPTIONS['kitchen-style'].includes(value)) {
    throw new ValidationError(questionId, 'Invalid kitchen style selection', 'INVALID_OPTION');
  }

  return {
    valid: true,
    questionId,
    value,
    normalized: value,
    styleConfig: styleMatrix.styles[value],
  };
}

/**
 * Validate color preference
 */
function validateColorPreference(value) {
  const questionId = 'color-preference';

  if (!value) {
    throw new ValidationError(questionId, 'Please select a color preference', 'REQUIRED');
  }

  if (!VALID_OPTIONS['color-preference'].includes(value)) {
    throw new ValidationError(questionId, 'Invalid color preference', 'INVALID_OPTION');
  }

  return {
    valid: true,
    questionId,
    value,
    normalized: value,
  };
}

/**
 * Validate cabinet style
 */
function validateCabinetStyle(value) {
  const questionId = 'cabinet-style';

  if (!value) {
    throw new ValidationError(questionId, 'Please select a cabinet style', 'REQUIRED');
  }

  if (!VALID_OPTIONS['cabinet-style'].includes(value)) {
    throw new ValidationError(questionId, 'Invalid cabinet style', 'INVALID_OPTION');
  }

  return {
    valid: true,
    questionId,
    value,
    normalized: value,
  };
}

/**
 * Validate countertop material
 */
function validateCountertopMaterial(value) {
  const questionId = 'countertop-material';

  if (!value) {
    throw new ValidationError(questionId, 'Please select a countertop material', 'REQUIRED');
  }

  if (!VALID_OPTIONS['countertop-material'].includes(value)) {
    throw new ValidationError(questionId, 'Invalid countertop material', 'INVALID_OPTION');
  }

  return {
    valid: true,
    questionId,
    value,
    normalized: value,
  };
}

/**
 * Validate hardware style
 */
function validateHardwareStyle(value) {
  const questionId = 'hardware-style';

  if (!value) {
    throw new ValidationError(questionId, 'Please select a hardware style', 'REQUIRED');
  }

  if (!VALID_OPTIONS['hardware-style'].includes(value)) {
    throw new ValidationError(questionId, 'Invalid hardware style', 'INVALID_OPTION');
  }

  return {
    valid: true,
    questionId,
    value,
    normalized: value,
  };
}

/**
 * Validate hardware finish
 */
function validateHardwareFinish(value) {
  const questionId = 'hardware-finish';

  if (!value) {
    throw new ValidationError(questionId, 'Please select a hardware finish', 'REQUIRED');
  }

  if (!VALID_OPTIONS['hardware-finish'].includes(value)) {
    throw new ValidationError(questionId, 'Invalid hardware finish', 'INVALID_OPTION');
  }

  return {
    valid: true,
    questionId,
    value,
    normalized: value,
  };
}

/**
 * Validate backsplash preference
 */
function validateBacksplashPreference(value) {
  const questionId = 'backsplash-preference';

  if (!value) {
    throw new ValidationError(questionId, 'Please select a backsplash preference', 'REQUIRED');
  }

  if (!VALID_OPTIONS['backsplash-preference'].includes(value)) {
    throw new ValidationError(questionId, 'Invalid backsplash preference', 'INVALID_OPTION');
  }

  return {
    valid: true,
    questionId,
    value,
    normalized: value,
  };
}

/**
 * Validate flooring preference
 */
function validateFlooringPreference(value) {
  const questionId = 'flooring-preference';

  if (!value) {
    throw new ValidationError(questionId, 'Please select a flooring preference', 'REQUIRED');
  }

  if (!VALID_OPTIONS['flooring-preference'].includes(value)) {
    throw new ValidationError(questionId, 'Invalid flooring preference', 'INVALID_OPTION');
  }

  return {
    valid: true,
    questionId,
    value,
    normalized: value,
  };
}

/**
 * Validate lighting style (multi-select)
 */
function validateLightingStyle(value) {
  const questionId = 'lighting-style';

  if (!value || (Array.isArray(value) && value.length === 0)) {
    throw new ValidationError(questionId, 'Please select at least one lighting option', 'REQUIRED');
  }

  const values = Array.isArray(value) ? value : [value];

  const invalidOptions = values.filter((v) => !VALID_OPTIONS['lighting-style'].includes(v));
  if (invalidOptions.length > 0) {
    throw new ValidationError(
      questionId,
      `Invalid options: ${invalidOptions.join(', ')}`,
      'INVALID_OPTION'
    );
  }

  return {
    valid: true,
    questionId,
    value: values,
    normalized: values,
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
    styleCoherenceWarnings: [],
  };

  // Check required questions
  for (const questionId of REQUIRED_QUESTIONS) {
    const value = answers[questionId];
    if (
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    ) {
      results.missingRequired.push(questionId);
    }
  }

  if (results.missingRequired.length > 0) {
    results.valid = false;
    results.errors.push({
      code: 'MISSING_REQUIRED',
      message: `Please answer: ${results.missingRequired.join(', ')}`,
      questions: results.missingRequired,
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
        results.warnings.push(...validationResult.warnings.map((w) => ({ questionId, ...w })));
      }
    }
  }

  // Check style coherence
  if (answers['kitchen-style']) {
    const styleConfig = styleMatrix.styles[answers['kitchen-style']];
    if (styleConfig) {
      // Check cabinet coherence
      if (
        answers['cabinet-style'] &&
        !styleConfig.recommendedCabinets.includes(answers['cabinet-style'])
      ) {
        results.styleCoherenceWarnings.push({
          code: 'CABINET_STYLE_MISMATCH',
          message: `${answers['cabinet-style']} cabinets are unconventional for ${answers['kitchen-style']} style`,
          suggestion: `Consider: ${styleConfig.recommendedCabinets.join(', ')}`,
        });
      }

      // Check countertop coherence
      if (
        answers['countertop-material'] &&
        !styleConfig.recommendedCountertops.includes(answers['countertop-material'])
      ) {
        results.styleCoherenceWarnings.push({
          code: 'COUNTERTOP_STYLE_MISMATCH',
          message: `${answers['countertop-material']} is less common for ${answers['kitchen-style']} style`,
          suggestion: `Consider: ${styleConfig.recommendedCountertops.join(', ')}`,
        });
      }
    }
  }

  // Calculate completion
  results.completionPercentage = Math.round(
    (results.answeredQuestions.length / REQUIRED_QUESTIONS.length) * 100
  );

  return results;
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
  ValidationError,
  VALID_OPTIONS,
  REQUIRED_QUESTIONS,
};
