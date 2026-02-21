/**
 * Text Question Component
 *
 * Renders text input, textarea, or number input questions.
 */

import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';

/**
 * TextQuestion Component
 */
function TextQuestion({
  question,
  value,
  onChange,
  language,
  disabled
}) {
  const {
    type,
    placeholder,
    minLength,
    maxLength,
    min,
    max,
    step,
    unit,
    multiline = false,
    rows = 3
  } = question;

  const [isFocused, setIsFocused] = useState(false);

  // Get localized placeholder
  const placeholderText = placeholder?.[language] || placeholder?.en || '';
  const unitText = unit?.[language] || unit?.en || unit || '';

  // Determine input type
  const inputType = type === 'number-input' ? 'number' : 'text';
  const isNumeric = type === 'number-input';

  // Handle input change
  const handleChange = useCallback((e) => {
    let newValue = e.target.value;

    if (isNumeric) {
      // Parse as number or keep empty
      newValue = newValue === '' ? null : parseFloat(newValue);
    }

    onChange(newValue);
  }, [onChange, isNumeric]);

  // Handle focus events
  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);

  // Calculate character count for text inputs
  const charCount = typeof value === 'string' ? value.length : 0;
  const showCharCount = !isNumeric && maxLength;

  // Common input props
  const inputProps = {
    id: question.id,
    value: value ?? '',
    onChange: handleChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
    disabled,
    placeholder: placeholderText,
    'aria-describedby': question.helpText ? `${question.id}-help` : undefined
  };

  return (
    <div className={`text-question ${isFocused ? 'focused' : ''} ${isNumeric ? 'numeric' : ''}`}>
      <div className="input-wrapper">
        {multiline ? (
          <textarea
            {...inputProps}
            rows={rows}
            minLength={minLength}
            maxLength={maxLength}
            className="text-input textarea"
          />
        ) : (
          <>
            <input
              {...inputProps}
              type={inputType}
              min={min}
              max={max}
              step={step}
              minLength={minLength}
              maxLength={maxLength}
              className="text-input"
            />
            {unitText && (
              <span className="input-unit">{unitText}</span>
            )}
          </>
        )}
      </div>

      {/* Character count for text inputs */}
      {showCharCount && (
        <div className="char-count">
          <span className={charCount > maxLength ? 'over-limit' : ''}>
            {charCount}
          </span>
          <span className="char-limit">/{maxLength}</span>
        </div>
      )}

      {/* Numeric range hint */}
      {isNumeric && (min !== undefined || max !== undefined) && (
        <div className="range-hint">
          {min !== undefined && max !== undefined ? (
            <span>
              {language === 'fr'
                ? `Entre ${min} et ${max}`
                : `Between ${min} and ${max}`}
              {unitText && ` ${unitText}`}
            </span>
          ) : min !== undefined ? (
            <span>
              {language === 'fr' ? `Minimum: ${min}` : `Minimum: ${min}`}
              {unitText && ` ${unitText}`}
            </span>
          ) : (
            <span>
              {language === 'fr' ? `Maximum: ${max}` : `Maximum: ${max}`}
              {unitText && ` ${unitText}`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

TextQuestion.propTypes = {
  question: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['text-input', 'number-input']).isRequired,
    placeholder: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        en: PropTypes.string,
        fr: PropTypes.string
      })
    ]),
    minLength: PropTypes.number,
    maxLength: PropTypes.number,
    min: PropTypes.number,
    max: PropTypes.number,
    step: PropTypes.number,
    unit: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        en: PropTypes.string,
        fr: PropTypes.string
      })
    ]),
    multiline: PropTypes.bool,
    rows: PropTypes.number,
    helpText: PropTypes.object
  }).isRequired,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  onChange: PropTypes.func.isRequired,
  language: PropTypes.oneOf(['en', 'fr']),
  disabled: PropTypes.bool
};

TextQuestion.defaultProps = {
  value: null,
  language: 'en',
  disabled: false
};

export default TextQuestion;
