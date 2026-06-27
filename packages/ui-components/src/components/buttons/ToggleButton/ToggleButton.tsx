/**
 * ToggleButton Component
 * Toggle button for binary states or option groups
 */

import React, {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
  createContext,
  useContext,
} from 'react';
import styled, { css } from 'styled-components';

export type ToggleButtonSize = 'sm' | 'md' | 'lg';

export interface ToggleButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  value: string;
  selected?: boolean;
  size?: ToggleButtonSize;
  icon?: ReactNode;
  children?: ReactNode;
  fullWidth?: boolean;
}

export interface ToggleButtonGroupProps {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  exclusive?: boolean;
  size?: ToggleButtonSize;
  orientation?: 'horizontal' | 'vertical';
  fullWidth?: boolean;
  disabled?: boolean;
  children: ReactNode;
}

interface ToggleButtonContextValue {
  value: string | string[];
  onChange: (buttonValue: string) => void;
  size: ToggleButtonSize;
  exclusive: boolean;
  disabled: boolean;
}

const ToggleButtonContext = createContext<ToggleButtonContextValue | null>(null);

const sizeStyles = {
  sm: css`
    padding: 4px 10px;
    font-size: 12px;
    min-height: 28px;
  `,
  md: css`
    padding: 6px 14px;
    font-size: 14px;
    min-height: 36px;
  `,
  lg: css`
    padding: 10px 20px;
    font-size: 16px;
    min-height: 44px;
  `,
};

const StyledToggleButton = styled.button<{
  $size: ToggleButtonSize;
  $selected: boolean;
  $fullWidth: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 2px solid var(--color-gray-300, #d1d5db);
  background: ${({ $selected }) =>
    $selected ? 'var(--color-primary, #2563eb)' : 'var(--color-white, #ffffff)'};
  color: ${({ $selected }) => ($selected ? 'white' : 'var(--color-gray-700, #374151)')};
  font-family: var(--font-family-sans, system-ui, sans-serif);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  ${({ $size }) => sizeStyles[$size]}
  ${({ $fullWidth }) =>
    $fullWidth &&
    css`
      flex: 1;
    `}

  &:hover:not(:disabled) {
    background: ${({ $selected }) =>
      $selected ? 'var(--color-primary-dark, #1d4ed8)' : 'var(--color-gray-100, #f3f4f6)'};
    border-color: ${({ $selected }) =>
      $selected ? 'var(--color-primary-dark, #1d4ed8)' : 'var(--color-gray-400, #9ca3af)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary, #2563eb);
    outline-offset: 2px;
    z-index: 1;
  }

  /* Border radius handling in group */
  border-radius: 0;

  &:first-child {
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
  }

  &:last-child {
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
  }

  &:not(:first-child) {
    margin-left: -2px;
  }

  /* When selected, bring to front */
  ${({ $selected }) =>
    $selected &&
    css`
      z-index: 1;
      border-color: var(--color-primary, #2563eb);
    `}
`;

const StandaloneToggleButton = styled(StyledToggleButton)`
  border-radius: 8px;

  &:not(:first-child) {
    margin-left: 0;
  }
`;

const GroupWrapper = styled.div<{
  $orientation: 'horizontal' | 'vertical';
  $fullWidth: boolean;
}>`
  display: inline-flex;
  flex-direction: ${({ $orientation }) => ($orientation === 'vertical' ? 'column' : 'row')};
  ${({ $fullWidth }) =>
    $fullWidth &&
    css`
      width: 100%;
    `}

  ${({ $orientation }) =>
    $orientation === 'vertical' &&
    css`
      ${StyledToggleButton} {
        border-radius: 0;

        &:first-child {
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
          border-bottom-left-radius: 0;
        }

        &:last-child {
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
          border-top-right-radius: 0;
        }

        &:not(:first-child) {
          margin-left: 0;
          margin-top: -2px;
        }
      }
    `}
`;

export const ToggleButton = forwardRef<HTMLButtonElement, ToggleButtonProps>(
  (
    { value, selected, size = 'md', icon, children, fullWidth = false, disabled, ...props },
    ref
  ) => {
    const context = useContext(ToggleButtonContext);

    const isSelected = context
      ? Array.isArray(context.value)
        ? context.value.includes(value)
        : context.value === value
      : selected;

    const buttonSize = context?.size || size;
    const isDisabled = context?.disabled || disabled;

    const handleClick = () => {
      if (context) {
        context.onChange(value);
      }
    };

    const ButtonComponent = context ? StyledToggleButton : StandaloneToggleButton;

    return (
      <ButtonComponent
        ref={ref}
        type="button"
        role="radio"
        aria-checked={isSelected}
        $size={buttonSize}
        $selected={!!isSelected}
        $fullWidth={fullWidth}
        disabled={isDisabled}
        onClick={handleClick}
        {...props}
      >
        {icon}
        {children}
      </ButtonComponent>
    );
  }
);

ToggleButton.displayName = 'ToggleButton';

export const ToggleButtonGroup: React.FC<ToggleButtonGroupProps> = ({
  value,
  onChange,
  exclusive = true,
  size = 'md',
  orientation = 'horizontal',
  fullWidth = false,
  disabled = false,
  children,
}) => {
  const handleChange = (buttonValue: string) => {
    if (exclusive) {
      onChange(buttonValue);
    } else {
      const currentValues = Array.isArray(value) ? value : [value];
      if (currentValues.includes(buttonValue)) {
        onChange(currentValues.filter((v) => v !== buttonValue));
      } else {
        onChange([...currentValues, buttonValue]);
      }
    }
  };

  return (
    <ToggleButtonContext.Provider
      value={{ value, onChange: handleChange, size, exclusive, disabled }}
    >
      <GroupWrapper role="radiogroup" $orientation={orientation} $fullWidth={fullWidth}>
        {children}
      </GroupWrapper>
    </ToggleButtonContext.Provider>
  );
};

ToggleButtonGroup.displayName = 'ToggleButtonGroup';

export default ToggleButton;
