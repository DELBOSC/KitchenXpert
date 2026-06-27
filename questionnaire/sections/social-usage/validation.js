/**
 * Social Usage Section Validation Module
 */

const VALID_OPTIONS = {
  'entertaining-frequency': ['rarely', 'occasionally', 'monthly', 'weekly'],
  'party-size': ['small', 'medium', 'large', 'very-large'],
  'seating-preference': ['island-seating', 'breakfast-nook', 'small-table', 'no-seating'],
  'beverage-station': [
    'full-bar',
    'coffee-station',
    'wine-storage',
    'beverage-fridge',
    'not-needed',
  ],
  'tv-kitchen': ['yes-mounted', 'yes-integrated', 'smart-display', 'no'],
};

const REQUIRED_QUESTIONS = ['entertaining-frequency', 'party-size', 'seating-preference'];

class SocialValidationError extends Error {
  constructor(message, questionId, errorType) {
    super(message);
    this.name = 'SocialValidationError';
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
    if (value === undefined || value === null) {
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

  if (typeof value !== 'string') {
    errors.push({
      questionId,
      type: 'invalid-type',
      message: { en: 'Must be a single selection', fr: 'Doit être une sélection unique' },
    });
    return { valid: false, errors, warnings };
  }

  if (!VALID_OPTIONS[questionId].includes(value)) {
    errors.push({
      questionId,
      type: 'invalid-option',
      message: { en: `Invalid option: ${value}`, fr: `Option invalide: ${value}` },
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

  if (questionId === 'party-size' && (value === 'large' || value === 'very-large')) {
    if (context['entertaining-frequency'] === 'rarely') {
      warnings.push({
        questionId,
        type: 'frequency-size-mismatch',
        message: {
          en: 'You rarely entertain but indicated large party sizes.',
          fr: 'Vous recevez rarement mais avez indiqué de grandes réunions.',
        },
      });
    }
  }

  if (questionId === 'beverage-station' && value === 'full-bar') {
    if (context['entertaining-frequency'] === 'rarely') {
      warnings.push({
        questionId,
        type: 'feature-frequency-mismatch',
        message: {
          en: 'A full bar may be underutilized if you rarely entertain.',
          fr: 'Un bar complet peut être sous-utilisé si vous recevez rarement.',
        },
      });
    }
  }

  if (questionId === 'seating-preference' && value === 'no-seating') {
    if (
      context['entertaining-frequency'] === 'weekly' ||
      context['entertaining-frequency'] === 'monthly'
    ) {
      warnings.push({
        questionId,
        type: 'seating-frequency-mismatch',
        message: {
          en: 'Consider adding seating since you entertain regularly.',
          fr: "Envisagez d'ajouter des places assises puisque vous recevez régulièrement.",
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
  validateWithContext,
  getValidationSummary,
  SocialValidationError,
  VALID_OPTIONS,
  REQUIRED_QUESTIONS,
};
