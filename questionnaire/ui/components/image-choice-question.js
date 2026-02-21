/**
 * Image Choice Question Component
 *
 * Renders a visual selection question with image thumbnails.
 */

import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';

/**
 * ImageChoiceQuestion Component
 */
function ImageChoiceQuestion({
  question,
  value,
  onChange,
  language,
  disabled
}) {
  const isMultiSelect = question.type === 'multi-choice' || question.allowMultiple;
  const options = question.options || [];
  const maxSelections = question.maxSelections;
  const columns = question.columns || 3;

  const [loadedImages, setLoadedImages] = useState({});
  const [errorImages, setErrorImages] = useState({});

  // Handle image load
  const handleImageLoad = useCallback((optionValue) => {
    setLoadedImages(prev => ({ ...prev, [optionValue]: true }));
  }, []);

  // Handle image error
  const handleImageError = useCallback((optionValue) => {
    setErrorImages(prev => ({ ...prev, [optionValue]: true }));
  }, []);

  // Handle selection change
  const handleSelect = useCallback((optionValue) => {
    if (disabled) return;

    if (isMultiSelect) {
      const currentValues = Array.isArray(value) ? value : [];
      let newValues;

      if (currentValues.includes(optionValue)) {
        newValues = currentValues.filter(v => v !== optionValue);
      } else {
        if (maxSelections && currentValues.length >= maxSelections) {
          newValues = [...currentValues.slice(1), optionValue];
        } else {
          newValues = [...currentValues, optionValue];
        }
      }
      onChange(newValues);
    } else {
      onChange(optionValue);
    }
  }, [value, onChange, isMultiSelect, maxSelections, disabled]);

  // Check if option is selected
  const isSelected = useCallback((optionValue) => {
    if (isMultiSelect) {
      return Array.isArray(value) && value.includes(optionValue);
    }
    return value === optionValue;
  }, [value, isMultiSelect]);

  // Check if more selections allowed
  const canSelectMore = useCallback(() => {
    if (!isMultiSelect || !maxSelections) return true;
    const currentCount = Array.isArray(value) ? value.length : 0;
    return currentCount < maxSelections;
  }, [value, isMultiSelect, maxSelections]);

  return (
    <div className="image-choice-question">
      {maxSelections && isMultiSelect && (
        <p className="selection-limit">
          {language === 'fr'
            ? `Sélectionnez jusqu'à ${maxSelections} options`
            : `Select up to ${maxSelections} options`}
        </p>
      )}

      <div
        className="image-options-grid"
        style={{ '--columns': columns }}
        role={isMultiSelect ? 'group' : 'radiogroup'}
        aria-label={question.question[language] || question.question.en}
      >
        {options.map((option) => {
          const optionLabel = option.label[language] || option.label.en;
          const optionDescription = option.description?.[language] || option.description?.en;
          const selected = isSelected(option.value);
          const canSelect = selected || canSelectMore();
          const imageLoaded = loadedImages[option.value];
          const imageError = errorImages[option.value];

          return (
            <button
              key={option.value}
              type="button"
              className={`image-option ${selected ? 'selected' : ''} ${!canSelect ? 'disabled' : ''} ${imageLoaded ? 'loaded' : 'loading'}`}
              onClick={() => handleSelect(option.value)}
              disabled={disabled || (!selected && !canSelect)}
              aria-pressed={selected}
              aria-label={optionLabel}
            >
              <div className="image-wrapper">
                {!imageError ? (
                  <>
                    {!imageLoaded && (
                      <div className="image-placeholder">
                        <span className="loading-spinner" />
                      </div>
                    )}
                    <img
                      src={option.image}
                      alt={optionLabel}
                      onLoad={() => handleImageLoad(option.value)}
                      onError={() => handleImageError(option.value)}
                      style={{ opacity: imageLoaded ? 1 : 0 }}
                    />
                  </>
                ) : (
                  <div className="image-error">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                    </svg>
                  </div>
                )}

                {selected && (
                  <div className="selection-indicator">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="option-info">
                <span className="option-label">{optionLabel}</span>
                {optionDescription && (
                  <span className="option-description">{optionDescription}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {isMultiSelect && value && Array.isArray(value) && value.length > 0 && (
        <div className="selection-summary">
          <span className="selection-count">
            {language === 'fr'
              ? `${value.length} sélectionné(s)`
              : `${value.length} selected`}
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

ImageChoiceQuestion.propTypes = {
  question: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string,
    question: PropTypes.shape({
      en: PropTypes.string.isRequired,
      fr: PropTypes.string
    }).isRequired,
    options: PropTypes.arrayOf(PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.shape({
        en: PropTypes.string.isRequired,
        fr: PropTypes.string
      }).isRequired,
      description: PropTypes.shape({
        en: PropTypes.string,
        fr: PropTypes.string
      }),
      image: PropTypes.string.isRequired
    })).isRequired,
    allowMultiple: PropTypes.bool,
    maxSelections: PropTypes.number,
    columns: PropTypes.number
  }).isRequired,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string)
  ]),
  onChange: PropTypes.func.isRequired,
  language: PropTypes.oneOf(['en', 'fr']),
  disabled: PropTypes.bool
};

ImageChoiceQuestion.defaultProps = {
  value: null,
  language: 'en',
  disabled: false
};

export default ImageChoiceQuestion;
