/**
 * Environmental Concerns Section Validation Module
 */

const VALID_OPTIONS = {
  'eco-priority': ['top-priority', 'important', 'nice-to-have', 'not-priority'],
  'energy-efficiency': ['very-important', 'somewhat', 'not-primary'],
  'sustainable-materials': ['bamboo', 'reclaimed-wood', 'recycled-glass', 'low-voc', 'fsc-certified', 'none-specific'],
  'water-conservation': ['very-interested', 'somewhat', 'not-priority'],
  'waste-management': ['recycling-bins', 'compost-bin', 'garbage-disposal', 'trash-compactor', 'basic']
};

const REQUIRED_QUESTIONS = ['eco-priority', 'energy-efficiency', 'water-conservation', 'waste-management'];
const MULTI_CHOICE_QUESTIONS = ['sustainable-materials', 'waste-management'];

class EnvValidationError extends Error {
  constructor(message, questionId, errorType) {
    super(message);
    this.name = 'EnvValidationError';
    this.questionId = questionId;
    this.errorType = errorType;
  }
}

function validateAnswer(questionId, value, context) {
  const errors = [];
  const warnings = [];

  if (!VALID_OPTIONS[questionId]) {
    errors.push({
      questionId,
      type: 'unknown-question',
      message: { en: `Unknown question: ${questionId}`, fr: `Question inconnue: ${questionId}` }
    });
    return { valid: false, errors, warnings };
  }

  if (REQUIRED_QUESTIONS.includes(questionId)) {
    if (value === undefined || value === null ||
        (Array.isArray(value) && value.length === 0)) {
      errors.push({
        questionId,
        type: 'required',
        message: { en: 'This question is required', fr: 'Cette question est obligatoire' }
      });
      return { valid: false, errors, warnings };
    }
  }

  if (value === undefined || value === null) {
    return { valid: true, errors: [], warnings: [] };
  }

  if (MULTI_CHOICE_QUESTIONS.includes(questionId)) {
    const result = validateMultiChoice(questionId, value);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  } else {
    const result = validateSingleChoice(questionId, value);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  if (context && errors.length === 0) {
    const crossResult = validateWithContext(questionId, value, context);
    warnings.push(...crossResult.warnings);
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateSingleChoice(questionId, value) {
  const errors = [];
  const warnings = [];

  if (typeof value !== 'string') {
    errors.push({
      questionId,
      type: 'invalid-type',
      message: { en: 'Must be a single selection', fr: 'Doit être une sélection unique' }
    });
    return { errors, warnings };
  }

  if (!VALID_OPTIONS[questionId].includes(value)) {
    errors.push({
      questionId,
      type: 'invalid-option',
      message: { en: `Invalid option: ${value}`, fr: `Option invalide: ${value}` }
    });
  }

  return { errors, warnings };
}

function validateMultiChoice(questionId, value) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(value)) {
    errors.push({
      questionId,
      type: 'invalid-type',
      message: { en: 'Must be an array of selections', fr: 'Doit être un tableau de sélections' }
    });
    return { errors, warnings };
  }

  const invalidOptions = value.filter(v => !VALID_OPTIONS[questionId].includes(v));
  if (invalidOptions.length > 0) {
    errors.push({
      questionId,
      type: 'invalid-options',
      message: { en: `Invalid options: ${invalidOptions.join(', ')}`, fr: `Options invalides: ${invalidOptions.join(', ')}` }
    });
  }

  if (questionId === 'sustainable-materials' && value.includes('none-specific') && value.length > 1) {
    warnings.push({
      questionId,
      type: 'conflicting-selection',
      message: { en: 'You selected "No preference" along with specific materials', fr: 'Vous avez sélectionné "Pas de préférence" avec des matériaux spécifiques' }
    });
  }

  if (questionId === 'waste-management' && value.includes('basic') && value.length > 1) {
    warnings.push({
      questionId,
      type: 'conflicting-selection',
      message: { en: 'You selected "Basic" along with advanced options', fr: 'Vous avez sélectionné "Basique" avec des options avancées' }
    });
  }

  return { errors, warnings };
}

function validateWithContext(questionId, value, context) {
  const warnings = [];

  if (questionId === 'sustainable-materials' && context['eco-priority'] === 'not-priority') {
    if (Array.isArray(value) && value.length > 0 && !value.includes('none-specific')) {
      warnings.push({
        questionId,
        type: 'preference-mismatch',
        message: {
          en: 'You indicated sustainability is not a priority but selected specific sustainable materials.',
          fr: 'Vous avez indiqué que la durabilité n\'est pas une priorité mais avez sélectionné des matériaux durables spécifiques.'
        }
      });
    }
  }

  if (questionId === 'water-conservation' && context['eco-priority'] === 'not-priority') {
    if (value === 'very-interested') {
      warnings.push({
        questionId,
        type: 'preference-mismatch',
        message: {
          en: 'High interest in water conservation noted despite general eco preference being low.',
          fr: 'Intérêt élevé pour la conservation de l\'eau noté malgré une faible préférence écologique générale.'
        }
      });
    }
  }

  return { warnings };
}

function validateSection(answers) {
  const allErrors = [];
  const allWarnings = [];

  for (const questionId of REQUIRED_QUESTIONS) {
    const result = validateAnswer(questionId, answers[questionId], answers);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  for (const [questionId, value] of Object.entries(answers)) {
    if (!REQUIRED_QUESTIONS.includes(questionId) && VALID_OPTIONS[questionId]) {
      const result = validateAnswer(questionId, value, answers);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }
  }

  return {
    valid: allErrors.length === 0,
    complete: REQUIRED_QUESTIONS.every(q => answers[q] !== undefined && answers[q] !== null),
    errors: allErrors,
    warnings: allWarnings
  };
}

function getValidationSummary(answers) {
  const result = validateSection(answers);

  return {
    ...result,
    answeredCount: Object.keys(answers).filter(k => VALID_OPTIONS[k]).length,
    totalQuestions: Object.keys(VALID_OPTIONS).length,
    requiredComplete: REQUIRED_QUESTIONS.every(q => answers[q] !== undefined),
    percentComplete: Math.round(
      (Object.keys(answers).filter(k => VALID_OPTIONS[k]).length / Object.keys(VALID_OPTIONS).length) * 100
    )
  };
}

module.exports = {
  validateAnswer,
  validateSection,
  validateSingleChoice,
  validateMultiChoice,
  validateWithContext,
  getValidationSummary,
  EnvValidationError,
  VALID_OPTIONS,
  REQUIRED_QUESTIONS,
  MULTI_CHOICE_QUESTIONS
};
