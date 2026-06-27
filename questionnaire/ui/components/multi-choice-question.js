/**
 * Multi Choice Question Component
 *
 * Renders single-choice (radio) or multi-choice (checkbox) questions.
 */

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * MultiChoiceQuestion Component
 */
function MultiChoiceQuestion({ question, value, onChange, language, disabled }) {
  const isMultiSelect = question.type === 'multi-choice';
  const options = question.options || [];
  const maxSelections = question.maxSelections;

  // Handle selection change
  const handleChange = useCallback(
    (optionValue) => {
      if (disabled) return;

      if (isMultiSelect) {
        const currentValues = Array.isArray(value) ? value : [];
        let newValues;

        if (currentValues.includes(optionValue)) {
          // Remove option
          newValues = currentValues.filter((v) => v !== optionValue);
        } else {
          // Add option (respecting max selections)
          if (maxSelections && currentValues.length >= maxSelections) {
            // Replace oldest selection
            newValues = [...currentValues.slice(1), optionValue];
          } else {
            newValues = [...currentValues, optionValue];
          }
        }
        onChange(newValues);
      } else {
        // Single selection
        onChange(optionValue);
      }
    },
    [value, onChange, isMultiSelect, maxSelections, disabled]
  );

  // Check if option is selected
  const isSelected = useCallback(
    (optionValue) => {
      if (isMultiSelect) {
        return Array.isArray(value) && value.includes(optionValue);
      }
      return value === optionValue;
    },
    [value, isMultiSelect]
  );

  // Check if more selections allowed
  const canSelectMore = useCallback(() => {
    if (!isMultiSelect || !maxSelections) return true;
    const currentCount = Array.isArray(value) ? value.length : 0;
    return currentCount < maxSelections;
  }, [value, isMultiSelect, maxSelections]);

  const inputType = isMultiSelect ? 'checkbox' : 'radio';
  const inputName = `question-${question.id}`;

  return (
    <div className={`multi-choice-question ${isMultiSelect ? 'multi-select' : 'single-select'}`}>
      {maxSelections && isMultiSelect && (
        <p className="selection-limit">
          {language === 'fr'
            ? `Sélectionnez jusqu'à ${maxSelections} options`
            : `Select up to ${maxSelections} options`}
        </p>
      )}

      <div className="options-list" role={isMultiSelect ? 'group' : 'radiogroup'}>
        {options.map((option) => {
          const optionLabel = option.label[language] || option.label.en;
          const optionDescription = option.description?.[language] || option.description?.en;
          const selected = isSelected(option.value);
          const canSelect = selected || canSelectMore();

          return (
            <label
              key={option.value}
              className={`option-item ${selected ? 'selected' : ''} ${!canSelect ? 'disabled' : ''}`}
            >
              <input
                type={inputType}
                name={inputName}
                value={option.value}
                checked={selected}
                onChange={() => handleChange(option.value)}
                disabled={disabled || (!selected && !canSelect)}
                aria-describedby={
                  optionDescription ? `${question.id}-${option.value}-desc` : undefined
                }
              />
              <span className="option-indicator" />
              <span className="option-content">
                <span className="option-label">{optionLabel}</span>
                {optionDescription && (
                  <span id={`${question.id}-${option.value}-desc`} className="option-description">
                    {optionDescription}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {isMultiSelect && value && Array.isArray(value) && value.length > 0 && (
        <div className="selection-summary">
          <span className="selection-count">
            {language === 'fr' ? `${value.length} sélectionné(s)` : `${value.length} selected`}
          </span>
          <button
            type="button"
            className="clear-selection"
            onClick={() => onChange([])}
            disabled={disabled}
          >
            {language === 'fr' ? 'Effacer' : 'Clear'}
          </button>
        </div>
      )}
    </div>
  );
}

MultiChoiceQuestion.propTypes = {
  question: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['single-choice', 'multi-choice']).isRequired,
    options: PropTypes.arrayOf(
      PropTypes.shape({
        value: PropTypes.string.isRequired,
        label: PropTypes.shape({
          en: PropTypes.string.isRequired,
          fr: PropTypes.string,
        }).isRequired,
        description: PropTypes.shape({
          en: PropTypes.string,
          fr: PropTypes.string,
        }),
      })
    ).isRequired,
    maxSelections: PropTypes.number,
  }).isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
  onChange: PropTypes.func.isRequired,
  language: PropTypes.oneOf(['en', 'fr']),
  disabled: PropTypes.bool,
};

MultiChoiceQuestion.defaultProps = {
  value: null,
  language: 'en',
  disabled: false,
};

export default MultiChoiceQuestion;
