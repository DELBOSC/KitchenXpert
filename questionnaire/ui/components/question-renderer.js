/**
 * Question Renderer Component
 *
 * Renders different question types based on question configuration.
 */

import React from 'react';
import PropTypes from 'prop-types';
import MultiChoiceQuestion from './multi-choice-question';
import SliderQuestion from './slider-question';
import TextQuestion from './text-question';
import ImageChoiceQuestion from './image-choice-question';
import DimensionInput from './dimension-input';

/**
 * Map question types to components
 */
const QUESTION_COMPONENTS = {
  'single-choice': MultiChoiceQuestion,
  'multi-choice': MultiChoiceQuestion,
  slider: SliderQuestion,
  'number-input': TextQuestion,
  'text-input': TextQuestion,
  'image-choice': ImageChoiceQuestion,
  'dimension-input': DimensionInput,
};

/**
 * QuestionRenderer Component
 */
function QuestionRenderer({ question, value, onChange, language, errors, disabled }) {
  const QuestionComponent = QUESTION_COMPONENTS[question.type];

  if (!QuestionComponent) {
    console.warn(`Unknown question type: ${question.type}`);
    return (
      <div className="question-error">
        <p>{language === 'fr' ? 'Type de question non supporté' : 'Unsupported question type'}</p>
      </div>
    );
  }

  const questionText = question.question[language] || question.question.en;
  const helpText = question.helpText?.[language] || question.helpText?.en;
  const error = errors?.[question.id];

  return (
    <div
      className={`question-container ${error ? 'has-error' : ''} ${question.required ? 'required' : ''}`}
    >
      <div className="question-header">
        <label className="question-label" htmlFor={question.id}>
          {questionText}
          {question.required && <span className="required-indicator">*</span>}
        </label>
        {helpText && <p className="question-help">{helpText}</p>}
      </div>

      <div className="question-input">
        <QuestionComponent
          question={question}
          value={value}
          onChange={onChange}
          language={language}
          disabled={disabled}
        />
      </div>

      {error && (
        <div className="question-error-message" role="alert">
          {error[language] || error.en || error}
        </div>
      )}
    </div>
  );
}

QuestionRenderer.propTypes = {
  question: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    question: PropTypes.shape({
      en: PropTypes.string.isRequired,
      fr: PropTypes.string,
    }).isRequired,
    helpText: PropTypes.shape({
      en: PropTypes.string,
      fr: PropTypes.string,
    }),
    required: PropTypes.bool,
    options: PropTypes.array,
  }).isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  language: PropTypes.oneOf(['en', 'fr']),
  errors: PropTypes.object,
  disabled: PropTypes.bool,
};

QuestionRenderer.defaultProps = {
  value: null,
  language: 'en',
  errors: null,
  disabled: false,
};

export default QuestionRenderer;
