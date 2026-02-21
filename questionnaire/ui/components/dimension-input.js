/**
 * Dimension Input Component
 *
 * Specialized input for spatial dimensions with unit conversion.
 */

import React, { useCallback, useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Unit conversion constants
 */
const CONVERSIONS = {
  feet: {
    toMeters: 0.3048,
    fromMeters: 3.28084,
    label: { en: 'ft', fr: 'pi' }
  },
  meters: {
    toMeters: 1,
    fromMeters: 1,
    label: { en: 'm', fr: 'm' }
  },
  inches: {
    toMeters: 0.0254,
    fromMeters: 39.3701,
    label: { en: 'in', fr: 'po' }
  },
  centimeters: {
    toMeters: 0.01,
    fromMeters: 100,
    label: { en: 'cm', fr: 'cm' }
  }
};

/**
 * DimensionInput Component
 */
function DimensionInput({
  question,
  value,
  onChange,
  language,
  disabled
}) {
  const {
    dimensions = ['width', 'length'],
    defaultUnit = 'feet',
    allowUnitChange = true,
    min = 0,
    max = 100
  } = question;

  // Parse value into individual dimensions
  const parseValue = useCallback((val) => {
    if (!val || typeof val !== 'object') {
      return {
        values: dimensions.reduce((acc, dim) => ({ ...acc, [dim]: '' }), {}),
        unit: defaultUnit
      };
    }
    return {
      values: val.values || dimensions.reduce((acc, dim) => ({ ...acc, [dim]: '' }), {}),
      unit: val.unit || defaultUnit
    };
  }, [dimensions, defaultUnit]);

  const [localState, setLocalState] = useState(() => parseValue(value));

  // Sync with external value
  useEffect(() => {
    const parsed = parseValue(value);
    setLocalState(parsed);
  }, [value, parseValue]);

  // Get dimension labels
  const getDimensionLabel = useCallback((dim) => {
    const labels = {
      width: { en: 'Width', fr: 'Largeur' },
      length: { en: 'Length', fr: 'Longueur' },
      height: { en: 'Height', fr: 'Hauteur' },
      depth: { en: 'Depth', fr: 'Profondeur' }
    };
    return labels[dim]?.[language] || labels[dim]?.en || dim;
  }, [language]);

  // Handle dimension value change
  const handleDimensionChange = useCallback((dimension, inputValue) => {
    const numValue = inputValue === '' ? '' : parseFloat(inputValue);

    const newState = {
      ...localState,
      values: {
        ...localState.values,
        [dimension]: numValue
      }
    };

    setLocalState(newState);
    onChange(newState);
  }, [localState, onChange]);

  // Handle unit change
  const handleUnitChange = useCallback((newUnit) => {
    if (newUnit === localState.unit) return;

    // Convert existing values to new unit
    const oldConversion = CONVERSIONS[localState.unit];
    const newConversion = CONVERSIONS[newUnit];

    const convertedValues = {};
    dimensions.forEach(dim => {
      const currentValue = localState.values[dim];
      if (currentValue !== '' && currentValue !== null && currentValue !== undefined) {
        // Convert to meters, then to new unit
        const inMeters = currentValue * oldConversion.toMeters;
        const inNewUnit = inMeters * newConversion.fromMeters;
        convertedValues[dim] = Math.round(inNewUnit * 100) / 100;
      } else {
        convertedValues[dim] = '';
      }
    });

    const newState = {
      values: convertedValues,
      unit: newUnit
    };

    setLocalState(newState);
    onChange(newState);
  }, [localState, dimensions, onChange]);

  const unitLabel = CONVERSIONS[localState.unit]?.label[language] || localState.unit;

  return (
    <div className="dimension-input">
      <div className="dimension-fields">
        {dimensions.map((dimension) => (
          <div key={dimension} className="dimension-field">
            <label htmlFor={`${question.id}-${dimension}`}>
              {getDimensionLabel(dimension)}
            </label>
            <div className="input-with-unit">
              <input
                type="number"
                id={`${question.id}-${dimension}`}
                value={localState.values[dimension]}
                onChange={(e) => handleDimensionChange(dimension, e.target.value)}
                disabled={disabled}
                min={min}
                max={max}
                step="0.1"
                placeholder="0"
                aria-label={`${getDimensionLabel(dimension)} in ${unitLabel}`}
              />
              <span className="unit-label">{unitLabel}</span>
            </div>
          </div>
        ))}
      </div>

      {allowUnitChange && (
        <div className="unit-selector">
          <span className="unit-selector-label">
            {language === 'fr' ? 'Unité:' : 'Unit:'}
          </span>
          <div className="unit-buttons" role="radiogroup">
            {Object.keys(CONVERSIONS).map((unit) => (
              <button
                key={unit}
                type="button"
                className={`unit-button ${localState.unit === unit ? 'active' : ''}`}
                onClick={() => handleUnitChange(unit)}
                disabled={disabled}
                role="radio"
                aria-checked={localState.unit === unit}
              >
                {CONVERSIONS[unit].label[language]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Area calculation if width and length provided */}
      {dimensions.includes('width') && dimensions.includes('length') &&
        localState.values.width && localState.values.length && (
        <div className="area-calculation">
          <span className="area-label">
            {language === 'fr' ? 'Surface:' : 'Area:'}
          </span>
          <span className="area-value">
            {(localState.values.width * localState.values.length).toFixed(1)} {unitLabel}²
          </span>
        </div>
      )}
    </div>
  );
}

DimensionInput.propTypes = {
  question: PropTypes.shape({
    id: PropTypes.string.isRequired,
    dimensions: PropTypes.arrayOf(PropTypes.oneOf(['width', 'length', 'height', 'depth'])),
    defaultUnit: PropTypes.oneOf(['feet', 'meters', 'inches', 'centimeters']),
    allowUnitChange: PropTypes.bool,
    min: PropTypes.number,
    max: PropTypes.number
  }).isRequired,
  value: PropTypes.shape({
    values: PropTypes.object,
    unit: PropTypes.string
  }),
  onChange: PropTypes.func.isRequired,
  language: PropTypes.oneOf(['en', 'fr']),
  disabled: PropTypes.bool
};

DimensionInput.defaultProps = {
  value: null,
  language: 'en',
  disabled: false
};

export default DimensionInput;
