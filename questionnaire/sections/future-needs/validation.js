/**
 * Future Needs Section Validation Module
 */

const VALID_OPTIONS = {
  'time-in-home': ['1-3-years', '3-5-years', '5-10-years', '10-plus'],
  'family-changes': ['children', 'kids-leaving', 'aging-parents', 'work-from-home', 'none'],
  'aging-in-place': ['yes-plan-now', 'prepare-later', 'not-needed'],
  'cooking-evolution': ['more-cooking', 'less-cooking', 'same', 'unsure'],
  'future-tech': ['yes-important', 'some-prep', 'not-concerned'],
};

const REQUIRED_QUESTIONS = ['time-in-home', 'aging-in-place'];
const MULTI_CHOICE_QUESTIONS = ['family-changes'];

class FutureValidationError extends Error {
  constructor(message, questionId, errorType) {
    super(message);
    this.name = 'FutureValidationError';
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
      message: { en: `Unknown question: ${questionId}`, fr: `Question inconnue: ${questionId}` },
    });
    return { valid: false, errors, warnings };
  }

  if (REQUIRED_QUESTIONS.includes(questionId)) {
    if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
      errors.push({
        questionId,
        type: 'required',
        message: { en: 'This question is required', fr: 'Cette question est obligatoire' },
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
      message: { en: 'Must be a single selection', fr: 'Doit être une sélection unique' },
    });
    return { errors, warnings };
  }

  if (!VALID_OPTIONS[questionId].includes(value)) {
    errors.push({
      questionId,
      type: 'invalid-option',
      message: { en: `Invalid option: ${value}`, fr: `Option invalide: ${value}` },
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
      message: { en: 'Must be an array of selections', fr: 'Doit être un tableau de sélections' },
    });
    return { errors, warnings };
  }

  const invalidOptions = value.filter((v) => !VALID_OPTIONS[questionId].includes(v));
  if (invalidOptions.length > 0) {
    errors.push({
      questionId,
      type: 'invalid-options',
      message: {
        en: `Invalid options: ${invalidOptions.join(', ')}`,
        fr: `Options invalides: ${invalidOptions.join(', ')}`,
      },
    });
  }

  if (questionId === 'family-changes' && value.includes('none') && value.length > 1) {
    warnings.push({
      questionId,
      type: 'conflicting-selection',
      message: {
        en: 'You selected "No changes" along with other changes',
        fr: 'Vous avez sélectionné "Aucun changement" avec d\'autres changements',
      },
    });
  }

  return { errors, warnings };
}

function validateWithContext(questionId, value, context) {
  const warnings = [];

  if (questionId === 'aging-in-place' && value === 'yes-plan-now') {
    if (context['time-in-home'] === '1-3-years') {
      warnings.push({
        questionId,
        type: 'timeline-mismatch',
        message: {
          en: 'Planning aging-in-place features for a short-term stay may not provide full ROI.',
          fr: 'Planifier des fonctions de vieillissement sur place pour un séjour court peut ne pas offrir un retour sur investissement complet.',
        },
      });
    }
  }

  if (questionId === 'future-tech' && value === 'yes-important') {
    if (context['time-in-home'] === '1-3-years') {
      warnings.push({
        questionId,
        type: 'timeline-note',
        message: {
          en: 'Extensive tech future-proofing may not be fully utilized in a short-term stay.',
          fr: "Une préparation technologique extensive peut ne pas être pleinement utilisée lors d'un séjour court.",
        },
      });
    }
  }

  const changes = context['family-changes'] || [];
  if (questionId === 'cooking-evolution' && value === 'more-cooking') {
    if (changes.includes('kids-leaving')) {
      warnings.push({
        questionId,
        type: 'lifestyle-note',
        message: {
          en: 'Note: With kids leaving, cooking patterns often change.',
          fr: 'Note : Avec le départ des enfants, les habitudes de cuisine changent souvent.',
        },
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
    complete: REQUIRED_QUESTIONS.every((q) => answers[q] !== undefined && answers[q] !== null),
    errors: allErrors,
    warnings: allWarnings,
  };
}

function getValidationSummary(answers) {
  const result = validateSection(answers);

  return {
    ...result,
    answeredCount: Object.keys(answers).filter((k) => VALID_OPTIONS[k]).length,
    totalQuestions: Object.keys(VALID_OPTIONS).length,
    requiredComplete: REQUIRED_QUESTIONS.every((q) => answers[q] !== undefined),
    percentComplete: Math.round(
      (Object.keys(answers).filter((k) => VALID_OPTIONS[k]).length /
        Object.keys(VALID_OPTIONS).length) *
        100
    ),
  };
}

module.exports = {
  validateAnswer,
  validateSection,
  validateSingleChoice,
  validateMultiChoice,
  validateWithContext,
  getValidationSummary,
  FutureValidationError,
  VALID_OPTIONS,
  REQUIRED_QUESTIONS,
  MULTI_CHOICE_QUESTIONS,
};
