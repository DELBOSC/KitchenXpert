/**
 * Maintenance Preferences Section Validation Module
 */

const VALID_OPTIONS = {
  'maintenance-time': ['minimal', 'moderate', 'willing'],
  'cleaning-frequency': ['daily', 'weekly', 'monthly', 'rarely'],
  'material-care': ['no-special', 'some-ok', 'willing'],
  'durability-priority': ['durability-first', 'balanced', 'aesthetics-first'],
  'stain-concern': ['very-concerned', 'somewhat', 'not-worried']
};

const REQUIRED_QUESTIONS = ['maintenance-time', 'cleaning-frequency', 'material-care', 'durability-priority', 'stain-concern'];

class MaintenanceValidationError extends Error {
  constructor(message, questionId, errorType) {
    super(message);
    this.name = 'MaintenanceValidationError';
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
    if (value === undefined || value === null) {
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

  if (typeof value !== 'string') {
    errors.push({
      questionId,
      type: 'invalid-type',
      message: { en: 'Must be a single selection', fr: 'Doit être une sélection unique' }
    });
    return { valid: false, errors, warnings };
  }

  if (!VALID_OPTIONS[questionId].includes(value)) {
    errors.push({
      questionId,
      type: 'invalid-option',
      message: { en: `Invalid option: ${value}`, fr: `Option invalide: ${value}` }
    });
  }

  if (context && errors.length === 0) {
    const crossResult = validateWithContext(questionId, value, context);
    warnings.push(...crossResult.warnings);
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateWithContext(questionId, value, context) {
  const warnings = [];

  if (questionId === 'material-care' && value === 'willing') {
    if (context['maintenance-time'] === 'minimal') {
      warnings.push({
        questionId,
        type: 'preference-mismatch',
        message: {
          en: 'You want minimal maintenance time but are willing to do special material care.',
          fr: 'Vous voulez un temps d\'entretien minimal mais êtes prêt à faire des soins spéciaux.'
        }
      });
    }
  }

  if (questionId === 'stain-concern' && value === 'not-worried') {
    if (context['durability-priority'] === 'durability-first') {
      warnings.push({
        questionId,
        type: 'preference-note',
        message: {
          en: 'Not worried about stains is noted, though durability is your priority.',
          fr: 'Pas inquiet des taches est noté, bien que la durabilité soit votre priorité.'
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
  validateWithContext,
  getValidationSummary,
  MaintenanceValidationError,
  VALID_OPTIONS,
  REQUIRED_QUESTIONS
};
