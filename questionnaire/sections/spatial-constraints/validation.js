/**
 * Spatial Constraints Section Validation Module
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
  'kitchen-size': ['small', 'medium', 'large', 'very-large'],
  'ceiling-height': ['standard', 'tall', 'very-tall', 'vaulted'],
  'current-layout': ['one-wall', 'galley', 'l-shaped', 'u-shaped', 'peninsula', 'island'],
  'desired-layout': [
    'keep-current',
    'one-wall',
    'galley',
    'l-shaped',
    'u-shaped',
    'peninsula',
    'island',
  ],
  'island-preference': ['yes-large', 'yes-small', 'yes-mobile', 'peninsula-instead', 'no'],
  'structural-constraints': [
    'load-bearing-wall',
    'window-placement',
    'plumbing-location',
    'gas-line',
    'electrical-panel',
    'hvac-ducts',
    'door-locations',
    'none',
  ],
  'open-concept': ['fully-open', 'partial-open', 'closed', 'want-to-open'],
  'storage-needs': ['minimal', 'average', 'above-average', 'maximum'],
  'pantry-preference': ['walk-in', 'cabinet-pantry', 'pull-out', 'butler', 'none'],
};

const REQUIRED_QUESTIONS = [
  'kitchen-size',
  'ceiling-height',
  'current-layout',
  'desired-layout',
  'island-preference',
  'structural-constraints',
  'open-concept',
  'storage-needs',
  'pantry-preference',
];

function validateAnswer(questionId, value) {
  if (questionId === 'exact-dimensions') {
    if (!value) return { valid: true, questionId, value: null };
    if (value.length && (value.length < 4 || value.length > 100))
      return {
        valid: false,
        questionId,
        error: { code: 'OUT_OF_RANGE', message: 'Length must be 4-100' },
      };
    return { valid: true, questionId, value, normalized: value };
  }
  if (questionId === 'structural-constraints') {
    if (!value || (Array.isArray(value) && value.length === 0))
      return {
        valid: false,
        questionId,
        error: { code: 'REQUIRED', message: 'Select at least one' },
      };
    const values = Array.isArray(value) ? value : [value];
    const invalid = values.filter((v) => !VALID_OPTIONS[questionId].includes(v));
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
