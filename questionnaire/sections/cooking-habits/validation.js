/**
 * Cooking Habits Section Validation Module
 */
class ValidationError extends Error {
  constructor(questionId, message, code) {
    super(message);
    this.name = 'ValidationError';
    this.questionId = questionId;
    this.code = code;
  }
}

const VALID_OPTIONS = {
  'cooking-frequency': ['rarely', 'sometimes', 'often', 'daily', 'multiple-daily'],
  'meal-types': [
    'quick-meals',
    'everyday-cooking',
    'elaborate-dishes',
    'baking',
    'meal-prep',
    'entertaining',
    'preserving',
  ],
  'cuisine-types': [
    'american',
    'mediterranean',
    'asian',
    'indian',
    'latin',
    'french',
    'middle-eastern',
    'varied',
  ],
  'cooking-methods': [
    'stovetop',
    'oven-baking',
    'grilling',
    'wok',
    'slow-cooking',
    'steaming',
    'sous-vide',
    'smoking',
  ],
  'range-preference': [
    'gas',
    'electric-coil',
    'electric-smooth',
    'induction',
    'dual-fuel',
    'no-preference',
  ],
  'oven-needs': [
    'convection',
    'double-oven',
    'steam',
    'self-cleaning',
    'speed-oven',
    'pizza-setting',
    'air-fry',
    'basic',
  ],
  'counter-workspace': ['minimal', 'standard', 'generous', 'extensive'],
  'small-appliances': [
    'coffee-maker',
    'toaster',
    'stand-mixer',
    'food-processor',
    'blender',
    'instant-pot',
    'air-fryer',
    'rice-cooker',
    'bread-maker',
  ],
};

const REQUIRED_QUESTIONS = [
  'cooking-frequency',
  'meal-types',
  'cuisine-types',
  'cooking-methods',
  'range-preference',
  'oven-needs',
  'counter-workspace',
];

function validateAnswer(questionId, value) {
  const multiChoiceFields = [
    'meal-types',
    'cuisine-types',
    'cooking-methods',
    'oven-needs',
    'small-appliances',
  ];
  if (multiChoiceFields.includes(questionId)) {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      if (REQUIRED_QUESTIONS.includes(questionId))
        return {
          valid: false,
          questionId,
          error: { code: 'REQUIRED', message: 'Select at least one' },
        };
      return { valid: true, questionId, value: [] };
    }
    const values = Array.isArray(value) ? value : [value];
    const invalid = values.filter((v) => !VALID_OPTIONS[questionId]?.includes(v));
    if (invalid.length)
      return {
        valid: false,
        questionId,
        error: { code: 'INVALID_OPTION', message: `Invalid: ${invalid.join(', ')}` },
      };
    return { valid: true, questionId, value: values, normalized: values };
  }
  if (!value && REQUIRED_QUESTIONS.includes(questionId))
    return { valid: false, questionId, error: { code: 'REQUIRED', message: 'Required' } };
  if (VALID_OPTIONS[questionId] && !VALID_OPTIONS[questionId].includes(value))
    return { valid: false, questionId, error: { code: 'INVALID_OPTION', message: 'Invalid' } };
  return { valid: true, questionId, value, normalized: value };
}

function validateSection(answers) {
  const results = {
    valid: true,
    errors: [],
    warnings: [],
    answeredQuestions: [],
    missingRequired: [],
    validatedAnswers: {},
  };
  for (const q of REQUIRED_QUESTIONS) {
    const v = answers[q];
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0))
      results.missingRequired.push(q);
  }
  if (results.missingRequired.length) {
    results.valid = false;
    results.errors.push({
      code: 'MISSING_REQUIRED',
      message: `Answer: ${results.missingRequired.join(', ')}`,
    });
  }
  for (const [qid, val] of Object.entries(answers)) {
    const r = validateAnswer(qid, val);
    if (!r.valid) {
      results.valid = false;
      results.errors.push({ questionId: qid, ...r.error });
    } else {
      results.answeredQuestions.push(qid);
      results.validatedAnswers[qid] = r.normalized || r.value;
    }
  }
  results.completionPercentage = Math.round(
    (results.answeredQuestions.length / REQUIRED_QUESTIONS.length) * 100
  );
  return results;
}

function isSectionComplete(answers) {
  const r = validateSection(answers);
  return r.valid && r.missingRequired.length === 0;
}

module.exports = {
  validateAnswer,
  validateSection,
  isSectionComplete,
  ValidationError,
  VALID_OPTIONS,
  REQUIRED_QUESTIONS,
};
