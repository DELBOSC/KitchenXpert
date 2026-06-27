/**
 * Slider Question Component
 *
 * Renders a slider/range input for numeric questions with optional labels.
 */

import React, { useCallback, useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * SliderQuestion Component
 */
function SliderQuestion({ question, value, onChange, language, disabled }) {
  const {
    min = 1,
    max = 10,
    step = 1,
    minLabel,
    maxLabel,
    showValue = true,
    showLabels = true,
  } = question;

  // Local state for smooth dragging
  const [localValue, setLocalValue] = useState(value ?? Math.round((min + max) / 2));

  // Sync with external value
  useEffect(() => {
    if (value !== null && value !== undefined) {
      setLocalValue(value);
    }
  }, [value]);

  // Handle slider change
  const handleChange = useCallback((e) => {
    const newValue = parseFloat(e.target.value);
    setLocalValue(newValue);
  }, []);

  // Commit value on release
  const handleChangeComplete = useCallback(() => {
    onChange(localValue);
  }, [onChange, localValue]);

  // Calculate percentage for custom styling
  const percentage = ((localValue - min) / (max - min)) * 100;

  // Get labels
  const minLabelText = minLabel?.[language] || minLabel?.en || min.toString();
  const maxLabelText = maxLabel?.[language] || maxLabel?.en || max.toString();

  return (
    <div className="slider-question">
      {showLabels && (
        <div className="slider-labels">
          <span className="slider-label-min">{minLabelText}</span>
          <span className="slider-label-max">{maxLabelText}</span>
        </div>
      )}

      <div className="slider-container">
        <input
          type="range"
          id={question.id}
          min={min}
          max={max}
          step={step}
          value={localValue}
          onChange={handleChange}
          onMouseUp={handleChangeComplete}
          onTouchEnd={handleChangeComplete}
          onKeyUp={handleChangeComplete}
          disabled={disabled}
          className="slider-input"
          style={{
            '--slider-percentage': `${percentage}%`,
          }}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={localValue}
          aria-valuetext={`${localValue}`}
        />

        {showValue && (
          <output className="slider-value" htmlFor={question.id}>
            {localValue}
          </output>
        )}
      </div>

      {question.valueLabels && (
        <div className="slider-value-labels">
          {question.valueLabels.map((label, index) => {
            const labelValue = min + (index * (max - min)) / (question.valueLabels.length - 1);
            const isActive = Math.abs(localValue - labelValue) < step / 2;
            return (
              <span
                key={index}
                className={`value-label ${isActive ? 'active' : ''}`}
                style={{ left: `${(index / (question.valueLabels.length - 1)) * 100}%` }}
              >
                {label[language] || label.en || label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

SliderQuestion.propTypes = {
  question: PropTypes.shape({
    id: PropTypes.string.isRequired,
    min: PropTypes.number,
    max: PropTypes.number,
    step: PropTypes.number,
    minLabel: PropTypes.shape({
      en: PropTypes.string,
      fr: PropTypes.string,
    }),
    maxLabel: PropTypes.shape({
      en: PropTypes.string,
      fr: PropTypes.string,
    }),
    showValue: PropTypes.bool,
    showLabels: PropTypes.bool,
    valueLabels: PropTypes.arrayOf(
      PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.shape({
          en: PropTypes.string,
          fr: PropTypes.string,
        }),
      ])
    ),
  }).isRequired,
  value: PropTypes.number,
  onChange: PropTypes.func.isRequired,
  language: PropTypes.oneOf(['en', 'fr']),
  disabled: PropTypes.bool,
};

SliderQuestion.defaultProps = {
  value: null,
  language: 'en',
  disabled: false,
};

export default SliderQuestion;
