/**
 * Technology Preferences Section Validation Module
 */

const VALID_OPTIONS = {
  'tech-comfort': ['very-comfortable', 'comfortable', 'somewhat', 'not-comfortable'],
  'smart-appliances': ['smart-fridge', 'smart-oven', 'smart-dishwasher', 'smart-coffee', 'smart-faucet', 'none'],
  'voice-control': ['yes-alexa', 'yes-google', 'yes-apple', 'yes-multiple', 'no'],
  'smart-lighting': ['full-system', 'some-areas', 'dimmers-only', 'standard'],
  'charging-stations': ['dedicated-area', 'built-in-outlets', 'wireless-charging', 'not-needed'],
  'connectivity': ['strong-wifi', 'ethernet', 'bluetooth-speakers', 'hub-location', 'basic'],
  'security-features': ['smart-locks', 'leak-sensors', 'smoke-detector', 'cameras', 'none']
};

const REQUIRED_QUESTIONS = ['tech-comfort', 'smart-appliances', 'voice-control', 'smart-lighting'];
const MULTI_CHOICE_QUESTIONS = ['smart-appliances', 'connectivity', 'security-features'];

class TechValidationError extends Error {
  constructor(message, questionId, errorType) {
    super(message);
    this.name = 'TechValidationError';
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

  if (questionId === 'smart-appliances' && value.includes('none') && value.length > 1) {
    warnings.push({
      questionId,
      type: 'conflicting-selection',
      message: { en: 'You selected "None" along with other options', fr: 'Vous avez sélectionné "Aucun" avec d\'autres options' }
    });
  }

  if (questionId === 'connectivity' && value.includes('basic') && value.length > 1) {
    warnings.push({
      questionId,
      type: 'conflicting-selection',
      message: { en: 'You selected "Basic" along with advanced options', fr: 'Vous avez sélectionné "Basique" avec des options avancées' }
    });
  }

  if (questionId === 'security-features' && value.includes('none') && value.length > 1) {
    warnings.push({
      questionId,
      type: 'conflicting-selection',
      message: { en: 'You selected "None" along with other security features', fr: 'Vous avez sélectionné "Aucun" avec d\'autres fonctions de sécurité' }
    });
  }

  return { errors, warnings };
}

function validateWithContext(questionId, value, context) {
  const warnings = [];

  if (questionId === 'smart-appliances' && context['tech-comfort'] === 'not-comfortable') {
    if (Array.isArray(value) && value.length > 0 && !value.includes('none')) {
      warnings.push({
        questionId,
        type: 'preference-mismatch',
        message: {
          en: 'You indicated preference for traditional technology but selected smart appliances.',
          fr: 'Vous avez indiqué une préférence pour la technologie traditionnelle mais sélectionné des appareils intelligents.'
        }
      });
    }
  }

  if (questionId === 'voice-control' && context['tech-comfort'] === 'not-comfortable') {
    if (value && value !== 'no') {
      warnings.push({
        questionId,
        type: 'preference-mismatch',
        message: {
          en: 'Voice control may require some comfort with technology.',
          fr: 'Le contrôle vocal peut nécessiter une certaine aisance avec la technologie.'
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

  const sectionWarnings = validateSectionLogic(answers);
  allWarnings.push(...sectionWarnings);

  return {
    valid: allErrors.length === 0,
    complete: REQUIRED_QUESTIONS.every(q => answers[q] !== undefined && answers[q] !== null),
    errors: allErrors,
    warnings: allWarnings
  };
}

function validateSectionLogic(answers) {
  const warnings = [];

  const smartAppliances = answers['smart-appliances'] || [];
  const hasMultipleSmartAppliances = smartAppliances.filter(a => a !== 'none').length >= 3;
  const wantsFullSmartLighting = answers['smart-lighting'] === 'full-system';
  const wantsVoiceControl = answers['voice-control'] && answers['voice-control'] !== 'no';

  if (hasMultipleSmartAppliances && wantsFullSmartLighting && wantsVoiceControl) {
    warnings.push({
      type: 'high-tech-requirements',
      message: {
        en: 'Your technology preferences will require significant infrastructure investment.',
        fr: 'Vos préférences technologiques nécessiteront un investissement important en infrastructure.'
      }
    });
  }

  if (answers['tech-comfort'] === 'not-comfortable') {
    const hasSmartFeatures =
      (smartAppliances.length > 0 && !smartAppliances.includes('none')) ||
      (answers['voice-control'] && answers['voice-control'] !== 'no') ||
      answers['smart-lighting'] === 'full-system';

    if (hasSmartFeatures) {
      warnings.push({
        type: 'comfort-feature-mismatch',
        message: {
          en: 'Consider starting with fewer smart features to build comfort with technology.',
          fr: 'Envisagez de commencer avec moins de fonctions intelligentes pour vous familiariser avec la technologie.'
        }
      });
    }
  }

  return warnings;
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
  validateSectionLogic,
  getValidationSummary,
  TechValidationError,
  VALID_OPTIONS,
  REQUIRED_QUESTIONS,
  MULTI_CHOICE_QUESTIONS
};
