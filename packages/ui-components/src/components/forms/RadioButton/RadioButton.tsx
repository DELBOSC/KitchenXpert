/**
 * RadioButton Component
 * Radio button with group support and validation
 */

import React, {
  forwardRef,
  createContext,
  useContext,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import styled, { css } from 'styled-components';

export type RadioSize = 'sm' | 'md' | 'lg';
export type RadioState = 'default' | 'error' | 'success' | 'warning';

// Radio Group Context
interface RadioGroupContextValue {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  size?: RadioSize;
  state?: RadioState;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

// Radio Group Props
export interface RadioGroupProps {
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  size?: RadioSize;
  state?: RadioState;
  orientation?: 'horizontal' | 'vertical';
  label?: string;
  helperText?: string;
  errorText?: string;
  children: ReactNode;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

// Radio Button Props
export interface RadioButtonProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  label?: ReactNode;
  description?: string;
  size?: RadioSize;
  state?: RadioState;
  value: string;
}

const sizeStyles = {
  sm: {
    radio: css`
      width: 14px;
      height: 14px;
    `,
    dot: css`
      width: 6px;
      height: 6px;
    `,
    label: css`
      font-size: 13px;
    `,
    description: css`
      font-size: 11px;
    `,
  },
  md: {
    radio: css`
      width: 18px;
      height: 18px;
    `,
    dot: css`
      width: 8px;
      height: 8px;
    `,
    label: css`
      font-size: 14px;
    `,
    description: css`
      font-size: 12px;
    `,
  },
  lg: {
    radio: css`
      width: 22px;
      height: 22px;
    `,
    dot: css`
      width: 10px;
      height: 10px;
    `,
    label: css`
      font-size: 16px;
    `,
    description: css`
      font-size: 13px;
    `,
  },
};

const stateColors = {
  default: {
    border: 'var(--color-gray-300, #d1d5db)',
    focusRing: 'var(--color-primary-light, rgba(37, 99, 235, 0.2))',
    checked: 'var(--color-primary, #2563eb)',
  },
  error: {
    border: 'var(--color-error, #dc2626)',
    focusRing: 'rgba(220, 38, 38, 0.2)',
    checked: 'var(--color-error, #dc2626)',
  },
  success: {
    border: 'var(--color-success, #16a34a)',
    focusRing: 'rgba(22, 163, 74, 0.2)',
    checked: 'var(--color-success, #16a34a)',
  },
  warning: {
    border: 'var(--color-warning, #d97706)',
    focusRing: 'rgba(217, 119, 6, 0.2)',
    checked: 'var(--color-warning, #d97706)',
  },
};

// Radio Group Styles
const RadioGroupWrapper = styled.fieldset`
  border: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const RadioGroupLabel = styled.legend`
  font-size: 14px;
  font-weight: 500;
  color: var(--color-gray-700, #374151);
  margin-bottom: 8px;
  padding: 0;
`;

const RadioGroupOptions = styled.div<{ $orientation: 'horizontal' | 'vertical' }>`
  display: flex;
  flex-direction: ${({ $orientation }) =>
    $orientation === 'horizontal' ? 'row' : 'column'};
  gap: ${({ $orientation }) =>
    $orientation === 'horizontal' ? '16px' : '8px'};
  flex-wrap: wrap;
`;

const HelperText = styled.span<{ $state: RadioState }>`
  font-size: 12px;
  margin-top: 4px;
  color: ${({ $state }) => {
    switch ($state) {
      case 'error':
        return 'var(--color-error, #dc2626)';
      case 'success':
        return 'var(--color-success, #16a34a)';
      case 'warning':
        return 'var(--color-warning, #d97706)';
      default:
        return 'var(--color-gray-500, #6b7280)';
    }
  }};
`;

// Radio Button Styles
const RadioWrapper = styled.div`
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
`;

const RadioLabel = styled.label<{ $disabled: boolean }>`
  display: inline-flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  user-select: none;

  ${({ $disabled }) =>
    $disabled &&
    css`
      cursor: not-allowed;
      opacity: 0.6;
    `}
`;

const HiddenInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

const RadioCircle = styled.span<{
  $size: RadioSize;
  $state: RadioState;
  $checked: boolean;
  $disabled: boolean;
  $focused: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 2px solid ${({ $state }) => stateColors[$state].border};
  border-radius: 50%;
  background: var(--color-white, #ffffff);
  transition: all 0.15s ease;
  margin-top: 2px;

  ${({ $size }) => sizeStyles[$size].radio}

  ${({ $checked, $state }) =>
    $checked &&
    css`
      border-color: ${stateColors[$state].checked};
    `}

  ${({ $focused, $state }) =>
    $focused &&
    css`
      box-shadow: 0 0 0 3px ${stateColors[$state].focusRing};
    `}

  ${({ $disabled }) =>
    $disabled &&
    css`
      background: var(--color-gray-100, #f3f4f6);
    `}

  &:hover {
    ${({ $disabled, $state }) =>
      !$disabled &&
      css`
        border-color: ${stateColors[$state].checked};
      `}
  }
`;

const RadioDot = styled.span<{
  $size: RadioSize;
  $state: RadioState;
  $checked: boolean;
}>`
  border-radius: 50%;
  background: ${({ $state }) => stateColors[$state].checked};
  opacity: 0;
  transform: scale(0);
  transition: all 0.15s ease;

  ${({ $size }) => sizeStyles[$size].dot}

  ${({ $checked }) =>
    $checked &&
    css`
      opacity: 1;
      transform: scale(1);
    `}
`;

const LabelContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const LabelText = styled.span<{ $size: RadioSize }>`
  color: var(--color-gray-900, #111827);
  font-family: var(--font-family-sans, system-ui, sans-serif);
  font-weight: 500;
  line-height: 1.4;
  ${({ $size }) => sizeStyles[$size].label}
`;

const Description = styled.span<{ $size: RadioSize }>`
  color: var(--color-gray-500, #6b7280);
  font-family: var(--font-family-sans, system-ui, sans-serif);
  line-height: 1.4;
  ${({ $size }) => sizeStyles[$size].description}
`;

// RadioGroup Component
export const RadioGroup = forwardRef<HTMLFieldSetElement, RadioGroupProps>(
  (
    {
      name,
      value: controlledValue,
      defaultValue,
      onChange,
      disabled = false,
      size = 'md',
      state = 'default',
      orientation = 'vertical',
      label,
      helperText,
      errorText,
      children,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
    },
    ref
  ) => {
    const generatedId = useId();
    const groupId = `radio-group-${generatedId}`;
    const helperId = `${groupId}-helper`;

    const [internalValue, setInternalValue] = React.useState(defaultValue);
    const isControlled = controlledValue !== undefined;
    const currentValue = isControlled ? controlledValue : internalValue;

    const displayState = errorText ? 'error' : state;
    const displayHelperText = errorText || helperText;

    const handleChange = (newValue: string) => {
      if (!isControlled) {
        setInternalValue(newValue);
      }
      onChange?.(newValue);
    };

    const contextValue: RadioGroupContextValue = {
      name,
      value: currentValue,
      onChange: handleChange,
      disabled,
      size,
      state: displayState,
    };

    return (
      <RadioGroupContext.Provider value={contextValue}>
        <RadioGroupWrapper
          ref={ref}
          role="radiogroup"
          aria-label={ariaLabel || label}
          aria-describedby={
            ariaDescribedBy || (displayHelperText ? helperId : undefined)
          }
        >
          {label && <RadioGroupLabel>{label}</RadioGroupLabel>}
          <RadioGroupOptions $orientation={orientation}>
            {children}
          </RadioGroupOptions>
          {displayHelperText && (
            <HelperText $state={displayState} id={helperId}>
              {displayHelperText}
            </HelperText>
          )}
        </RadioGroupWrapper>
      </RadioGroupContext.Provider>
    );
  }
);

RadioGroup.displayName = 'RadioGroup';

// RadioButton Component
export const RadioButton = forwardRef<HTMLInputElement, RadioButtonProps>(
  (
    {
      label,
      description,
      size: propSize,
      state: propState,
      value,
      disabled: propDisabled,
      checked: propChecked,
      onChange,
      name: propName,
      id,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const radioId = id || `radio-${generatedId}`;
    const descriptionId = `${radioId}-description`;

    const groupContext = useContext(RadioGroupContext);

    const [isFocused, setIsFocused] = React.useState(false);

    // Use context values or prop values
    const name = groupContext?.name || propName || '';
    const size = propSize || groupContext?.size || 'md';
    const state = propState || groupContext?.state || 'default';
    const disabled = propDisabled ?? groupContext?.disabled ?? false;

    // Determine checked state
    const isChecked = groupContext
      ? groupContext.value === value
      : propChecked ?? false;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        groupContext?.onChange?.(value);
      }
      onChange?.(e);
    };

    const describedBy = [
      description ? descriptionId : null,
      ariaDescribedBy,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <RadioWrapper>
        <RadioLabel $disabled={disabled}>
          <HiddenInput
            ref={ref}
            type="radio"
            id={radioId}
            name={name}
            value={value}
            checked={isChecked}
            disabled={disabled}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            aria-describedby={describedBy}
            {...props}
          />
          <RadioCircle
            $size={size}
            $state={state}
            $checked={isChecked}
            $disabled={disabled}
            $focused={isFocused}
            aria-hidden="true"
          >
            <RadioDot $size={size} $state={state} $checked={isChecked} />
          </RadioCircle>
          {(label || description) && (
            <LabelContent>
              {label && <LabelText $size={size}>{label}</LabelText>}
              {description && (
                <Description $size={size} id={descriptionId}>
                  {description}
                </Description>
              )}
            </LabelContent>
          )}
        </RadioLabel>
      </RadioWrapper>
    );
  }
);

RadioButton.displayName = 'RadioButton';

export default RadioButton;
