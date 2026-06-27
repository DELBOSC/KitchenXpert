/**
 * FormField Component
 * Form field wrapper with label, error, and helper text
 */

import React, { forwardRef, useEffect, useId, type ReactNode, type HTMLAttributes } from 'react';
import styled, { css } from 'styled-components';
import { useOptionalFormContext, type ValidationRule } from '../Form/Form';

export type FormFieldSize = 'sm' | 'md' | 'lg';
export type FormFieldState = 'default' | 'error' | 'success' | 'warning';

export interface FormFieldProps extends HTMLAttributes<HTMLDivElement> {
  name?: string;
  label?: ReactNode;
  helperText?: string;
  errorText?: string;
  required?: boolean;
  size?: FormFieldSize;
  state?: FormFieldState;
  fullWidth?: boolean;
  rules?: ValidationRule[];
  children: ReactNode;
}

const sizeStyles = {
  sm: {
    label: css`
      font-size: 12px;
      margin-bottom: 4px;
    `,
    helper: css`
      font-size: 11px;
      margin-top: 4px;
    `,
    gap: '4px',
  },
  md: {
    label: css`
      font-size: 14px;
      margin-bottom: 6px;
    `,
    helper: css`
      font-size: 12px;
      margin-top: 6px;
    `,
    gap: '6px',
  },
  lg: {
    label: css`
      font-size: 16px;
      margin-bottom: 8px;
    `,
    helper: css`
      font-size: 13px;
      margin-top: 8px;
    `,
    gap: '8px',
  },
};

const stateColors = {
  default: 'var(--color-gray-500, #6b7280)',
  error: 'var(--color-error, #dc2626)',
  success: 'var(--color-success, #16a34a)',
  warning: 'var(--color-warning, #d97706)',
};

const FieldWrapper = styled.div<{ $fullWidth: boolean }>`
  display: flex;
  flex-direction: column;
  ${({ $fullWidth }) =>
    $fullWidth &&
    css`
      width: 100%;
    `}
`;

const LabelWrapper = styled.div<{ $size: FormFieldSize }>`
  display: flex;
  align-items: center;
  gap: 4px;
  ${({ $size }) => sizeStyles[$size].label}
`;

const Label = styled.label`
  font-weight: 500;
  color: var(--color-gray-700, #374151);
  font-family: var(--font-family-sans, system-ui, sans-serif);
`;

const RequiredIndicator = styled.span`
  color: var(--color-error, #dc2626);
  font-weight: 500;
`;

const OptionalText = styled.span`
  color: var(--color-gray-400, #9ca3af);
  font-size: 0.85em;
  font-weight: 400;
`;

const FieldContent = styled.div`
  position: relative;
`;

const HelperTextWrapper = styled.div<{
  $size: FormFieldSize;
  $state: FormFieldState;
}>`
  display: flex;
  align-items: flex-start;
  gap: 4px;
  color: ${({ $state }) => stateColors[$state]};
  font-family: var(--font-family-sans, system-ui, sans-serif);
  ${({ $size }) => sizeStyles[$size].helper}
`;

const HelperIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
`;

const CharacterCount = styled.span<{ $isOver: boolean }>`
  font-size: 11px;
  color: ${({ $isOver }) =>
    $isOver ? 'var(--color-error, #dc2626)' : 'var(--color-gray-400, #9ca3af)'};
  margin-left: auto;
`;

// Icon SVGs
const ErrorIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" />
    <path d="M8 4.5V8.5M8 10.5V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const SuccessIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" />
    <path
      d="M5 8L7 10L11 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const WarningIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M8 1.5L14.5 13.5H1.5L8 1.5Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path d="M8 6V9M8 11V11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const getStateIcon = (state: FormFieldState) => {
  switch (state) {
    case 'error':
      return <ErrorIcon />;
    case 'success':
      return <SuccessIcon />;
    case 'warning':
      return <WarningIcon />;
    default:
      return null;
  }
};

export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  (
    {
      name,
      label,
      helperText,
      errorText: propErrorText,
      required = false,
      size = 'md',
      state: propState = 'default',
      fullWidth = false,
      rules,
      children,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const fieldId = `field-${generatedId}`;
    const labelId = `${fieldId}-label`;
    const helperId = `${fieldId}-helper`;
    const errorId = `${fieldId}-error`;

    const formContext = useOptionalFormContext();

    // Register field with form context if available
    useEffect(() => {
      if (formContext && name && rules) {
        formContext.registerField(name, rules);
        return () => {
          formContext.unregisterField(name);
        };
      }
      return undefined;
    }, [formContext, name, rules]);

    // Get error from form context if available
    const contextError = formContext && name ? formContext.errors[name] : undefined;
    const isTouched = formContext && name ? formContext.touched[name] : false;

    // Display error from props or context (only if touched)
    const errorText = propErrorText || (isTouched ? contextError?.message : undefined);

    // Determine state based on error
    const state = errorText ? 'error' : propState;

    // Get helper text to display
    const displayHelperText = errorText || helperText;

    // Get state icon
    const stateIcon = state !== 'default' ? getStateIcon(state) : null;

    // Clone children to pass necessary props
    const enhancedChildren = React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        const childProps: Record<string, unknown> = {
          'aria-describedby': displayHelperText ? (errorText ? errorId : helperId) : undefined,
          'aria-invalid': state === 'error' ? true : undefined,
          'aria-required': required ? true : undefined,
        };

        // If we have form context and a name, add the getFieldProps
        if (formContext && name) {
          const fieldProps = formContext.getFieldProps(name);
          childProps.value = fieldProps.value;
          childProps.onChange = fieldProps.onChange;
          childProps.onBlur = fieldProps.onBlur;
          childProps.name = fieldProps.name;
        }

        // Pass state to child if it accepts it
        if (
          'state' in (child.props as object) ||
          (child.type && typeof child.type === 'function')
        ) {
          childProps.state = state;
        }

        return React.cloneElement(child, childProps);
      }
      return child;
    });

    return (
      <FieldWrapper ref={ref} $fullWidth={fullWidth} {...props}>
        {label && (
          <LabelWrapper $size={size}>
            <Label id={labelId} htmlFor={name || fieldId}>
              {label}
            </Label>
            {required && <RequiredIndicator aria-hidden="true">*</RequiredIndicator>}
            {!required && <OptionalText>(optional)</OptionalText>}
          </LabelWrapper>
        )}

        <FieldContent>{enhancedChildren}</FieldContent>

        {displayHelperText && (
          <HelperTextWrapper
            $size={size}
            $state={state}
            id={errorText ? errorId : helperId}
            role={errorText ? 'alert' : undefined}
            aria-live={errorText ? 'polite' : undefined}
          >
            {stateIcon && <HelperIcon>{stateIcon}</HelperIcon>}
            <span>{displayHelperText}</span>
          </HelperTextWrapper>
        )}
      </FieldWrapper>
    );
  }
);

FormField.displayName = 'FormField';

// Additional helper component for character count
export interface CharacterCounterProps {
  current: number;
  max: number;
}

export const CharacterCounter: React.FC<CharacterCounterProps> = ({ current, max }) => {
  const isOver = current > max;
  return (
    <CharacterCount $isOver={isOver}>
      {current}/{max}
    </CharacterCount>
  );
};

CharacterCounter.displayName = 'CharacterCounter';

export default FormField;
