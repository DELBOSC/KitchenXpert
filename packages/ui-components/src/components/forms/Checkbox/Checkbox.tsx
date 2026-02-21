/**
 * Checkbox Component
 * Checkbox with label, indeterminate state, and validation support
 */

import React, {
  forwardRef,
  useRef,
  useEffect,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import styled, { css } from 'styled-components';

export type CheckboxSize = 'sm' | 'md' | 'lg';
export type CheckboxState = 'default' | 'error' | 'success' | 'warning';

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  label?: ReactNode;
  description?: string;
  size?: CheckboxSize;
  state?: CheckboxState;
  indeterminate?: boolean;
  errorText?: string;
}

const sizeStyles = {
  sm: {
    box: css`
      width: 14px;
      height: 14px;
      border-radius: 3px;
    `,
    label: css`
      font-size: 13px;
    `,
    description: css`
      font-size: 11px;
    `,
    iconSize: 10,
  },
  md: {
    box: css`
      width: 18px;
      height: 18px;
      border-radius: 4px;
    `,
    label: css`
      font-size: 14px;
    `,
    description: css`
      font-size: 12px;
    `,
    iconSize: 12,
  },
  lg: {
    box: css`
      width: 22px;
      height: 22px;
      border-radius: 5px;
    `,
    label: css`
      font-size: 16px;
    `,
    description: css`
      font-size: 13px;
    `,
    iconSize: 14,
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

const CheckboxWrapper = styled.div`
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
`;

const CheckboxLabel = styled.label<{ $disabled: boolean }>`
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

const CheckboxBox = styled.span<{
  $size: CheckboxSize;
  $state: CheckboxState;
  $checked: boolean;
  $indeterminate: boolean;
  $disabled: boolean;
  $focused: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 2px solid ${({ $state }) => stateColors[$state].border};
  background: var(--color-white, #ffffff);
  transition: all 0.15s ease;
  margin-top: 2px;

  ${({ $size }) => sizeStyles[$size].box}

  ${({ $checked, $indeterminate, $state }) =>
    ($checked || $indeterminate) &&
    css`
      background: ${stateColors[$state].checked};
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
    ${({ $disabled, $checked, $indeterminate, $state }) =>
      !$disabled &&
      !$checked &&
      !$indeterminate &&
      css`
        border-color: ${stateColors[$state].checked};
      `}
  }

  svg {
    color: white;
    opacity: 0;
    transform: scale(0.8);
    transition: all 0.15s ease;
  }

  ${({ $checked, $indeterminate }) =>
    ($checked || $indeterminate) &&
    css`
      svg {
        opacity: 1;
        transform: scale(1);
      }
    `}
`;

const LabelContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const LabelText = styled.span<{ $size: CheckboxSize }>`
  color: var(--color-gray-900, #111827);
  font-family: var(--font-family-sans, system-ui, sans-serif);
  font-weight: 500;
  line-height: 1.4;
  ${({ $size }) => sizeStyles[$size].label}
`;

const Description = styled.span<{ $size: CheckboxSize }>`
  color: var(--color-gray-500, #6b7280);
  font-family: var(--font-family-sans, system-ui, sans-serif);
  line-height: 1.4;
  ${({ $size }) => sizeStyles[$size].description}
`;

const ErrorText = styled.span`
  font-size: 12px;
  color: var(--color-error, #dc2626);
  margin-left: 26px;
`;

// Check icon SVG
const CheckIcon = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M3.5 8L6.5 11L12.5 5"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Indeterminate icon (minus) SVG
const IndeterminateIcon = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M4 8H12"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      description,
      size = 'md',
      state = 'default',
      indeterminate = false,
      errorText,
      checked,
      defaultChecked,
      disabled = false,
      onChange,
      id,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const checkboxId = id || `checkbox-${generatedId}`;
    const errorId = `${checkboxId}-error`;
    const descriptionId = `${checkboxId}-description`;

    const internalRef = useRef<HTMLInputElement>(null);
    const [isFocused, setIsFocused] = React.useState(false);
    const [isChecked, setIsChecked] = React.useState(defaultChecked || false);

    const displayState = errorText ? 'error' : state;
    const controlledChecked = checked !== undefined ? checked : isChecked;

    // Combine the forwarded ref with the internal ref
    useEffect(() => {
      if (internalRef.current) {
        internalRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    // Handle ref forwarding
    useEffect(() => {
      if (typeof ref === 'function') {
        ref(internalRef.current);
      } else if (ref) {
        ref.current = internalRef.current;
      }
    }, [ref]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (checked === undefined) {
        setIsChecked(e.target.checked);
      }
      onChange?.(e);
    };

    const describedBy = [
      description ? descriptionId : null,
      errorText ? errorId : null,
      ariaDescribedBy,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <CheckboxWrapper>
        <CheckboxLabel $disabled={disabled}>
          <HiddenInput
            ref={internalRef}
            type="checkbox"
            id={checkboxId}
            checked={controlledChecked}
            disabled={disabled}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            aria-invalid={displayState === 'error'}
            aria-describedby={describedBy}
            {...props}
          />
          <CheckboxBox
            $size={size}
            $state={displayState}
            $checked={controlledChecked && !indeterminate}
            $indeterminate={indeterminate}
            $disabled={disabled}
            $focused={isFocused}
            aria-hidden="true"
          >
            {indeterminate ? (
              <IndeterminateIcon size={sizeStyles[size].iconSize} />
            ) : (
              <CheckIcon size={sizeStyles[size].iconSize} />
            )}
          </CheckboxBox>
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
        </CheckboxLabel>
        {errorText && <ErrorText id={errorId}>{errorText}</ErrorText>}
      </CheckboxWrapper>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
