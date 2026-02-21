/**
 * Form Component
 * Form wrapper with validation context and submit handling
 */

import React, {
  forwardRef,
  createContext,
  useContext,
  useState,
  useCallback,
  useId,
  type FormHTMLAttributes,
  type ReactNode,
} from 'react';
import styled from 'styled-components';

// Validation types
export type ValidationRule<T = unknown> = {
  validate: (value: T) => boolean;
  message: string;
};

export type FieldError = {
  message: string;
  type?: string;
};

export type FormErrors = Record<string, FieldError | undefined>;
export type FormValues = Record<string, unknown>;
export type FormTouched = Record<string, boolean>;

// Form Context
export interface FormContextValue {
  values: FormValues;
  errors: FormErrors;
  touched: FormTouched;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  setValue: (name: string, value: unknown) => void;
  setError: (name: string, error: FieldError | undefined) => void;
  setTouched: (name: string, touched: boolean) => void;
  clearError: (name: string) => void;
  clearAllErrors: () => void;
  registerField: (name: string, rules?: ValidationRule[]) => void;
  unregisterField: (name: string) => void;
  validateField: (name: string) => boolean;
  validateForm: () => boolean;
  resetForm: () => void;
  getFieldProps: (name: string) => {
    value: unknown;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    onBlur: () => void;
    name: string;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
  };
}

const FormContext = createContext<FormContextValue | null>(null);

// Hook to use form context
export const useFormContext = (): FormContextValue => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a Form component');
  }
  return context;
};

// Hook to check if we're inside a form
export const useOptionalFormContext = (): FormContextValue | null => {
  return useContext(FormContext);
};

// Form Props
export interface FormProps extends Omit<FormHTMLAttributes<HTMLFormElement>, 'onSubmit' | 'onError'> {
  children: ReactNode;
  onSubmit?: (values: FormValues) => void | Promise<void>;
  onError?: (errors: FormErrors) => void;
  initialValues?: FormValues;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  resetOnSubmit?: boolean;
}

// Styled components
const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

// Field rules storage
type FieldRules = Record<string, ValidationRule[]>;

export const Form = forwardRef<HTMLFormElement, FormProps>(
  (
    {
      children,
      onSubmit,
      onError,
      initialValues = {},
      validateOnChange = true,
      validateOnBlur = true,
      resetOnSubmit = false,
      ...props
    },
    ref
  ) => {
    const formId = useId();

    const [values, setValues] = useState<FormValues>(initialValues);
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<FormTouched>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fieldRules, setFieldRules] = useState<FieldRules>({});
    const [initialValuesState] = useState<FormValues>(initialValues);

    // Check if form is dirty (values changed from initial)
    const isDirty = JSON.stringify(values) !== JSON.stringify(initialValuesState);

    // Check if form is valid (no errors)
    const isValid = Object.values(errors).every((error) => !error);

    // Set a single field value
    const setValue = useCallback(
      (name: string, value: unknown) => {
        setValues((prev) => ({ ...prev, [name]: value }));

        if (validateOnChange && fieldRules[name]) {
          // Validate after setting value
          setTimeout(() => {
            const rules = fieldRules[name];
            if (!rules) return;
            for (const rule of rules) {
              if (!rule.validate(value)) {
                setErrors((prev) => ({
                  ...prev,
                  [name]: { message: rule.message },
                }));
                return;
              }
            }
            setErrors((prev) => ({ ...prev, [name]: undefined }));
          }, 0);
        }
      },
      [validateOnChange, fieldRules]
    );

    // Set a field error
    const setError = useCallback((name: string, error: FieldError | undefined) => {
      setErrors((prev) => ({ ...prev, [name]: error }));
    }, []);

    // Set field touched state
    const setTouchedField = useCallback((name: string, isTouched: boolean) => {
      setTouched((prev) => ({ ...prev, [name]: isTouched }));
    }, []);

    // Clear a field error
    const clearError = useCallback((name: string) => {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }, []);

    // Clear all errors
    const clearAllErrors = useCallback(() => {
      setErrors({});
    }, []);

    // Register a field with validation rules
    const registerField = useCallback((name: string, rules: ValidationRule[] = []) => {
      setFieldRules((prev) => ({ ...prev, [name]: rules }));
    }, []);

    // Unregister a field
    const unregisterField = useCallback((name: string) => {
      setFieldRules((prev) => {
        const { [name]: _, ...rest } = prev;
        return rest;
      });
      setErrors((prev) => {
        const { [name]: _, ...rest } = prev;
        return rest;
      });
      setTouched((prev) => {
        const { [name]: _, ...rest } = prev;
        return rest;
      });
    }, []);

    // Validate a single field
    const validateField = useCallback(
      (name: string): boolean => {
        const rules = fieldRules[name] || [];
        const value = values[name];

        for (const rule of rules) {
          if (!rule.validate(value)) {
            setErrors((prev) => ({
              ...prev,
              [name]: { message: rule.message },
            }));
            return false;
          }
        }

        setErrors((prev) => ({ ...prev, [name]: undefined }));
        return true;
      },
      [fieldRules, values]
    );

    // Validate entire form
    const validateForm = useCallback((): boolean => {
      let isFormValid = true;
      const newErrors: FormErrors = {};

      for (const [name, rules] of Object.entries(fieldRules)) {
        const value = values[name];

        for (const rule of rules) {
          if (!rule.validate(value)) {
            newErrors[name] = { message: rule.message };
            isFormValid = false;
            break;
          }
        }
      }

      setErrors(newErrors);
      return isFormValid;
    }, [fieldRules, values]);

    // Reset form to initial values
    const resetForm = useCallback(() => {
      setValues(initialValuesState);
      setErrors({});
      setTouched({});
    }, [initialValuesState]);

    // Get props for a field
    const getFieldProps = useCallback(
      (name: string) => {
        const error = errors[name];
        const errorId = error ? `${formId}-${name}-error` : undefined;

        return {
          value: values[name] ?? '',
          onChange: (
            e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
          ) => {
            const newValue = e.target.type === 'checkbox'
              ? (e.target as HTMLInputElement).checked
              : e.target.value;
            setValue(name, newValue);
          },
          onBlur: () => {
            setTouchedField(name, true);
            if (validateOnBlur) {
              validateField(name);
            }
          },
          name,
          'aria-invalid': error ? true : undefined,
          'aria-describedby': errorId,
        };
      },
      [formId, values, errors, setValue, setTouchedField, validateOnBlur, validateField]
    );

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Mark all fields as touched
      const allTouched: FormTouched = {};
      Object.keys(fieldRules).forEach((name) => {
        allTouched[name] = true;
      });
      setTouched(allTouched);

      // Validate all fields
      const isFormValid = validateForm();

      if (!isFormValid) {
        onError?.(errors);
        return;
      }

      setIsSubmitting(true);

      try {
        await onSubmit?.(values);
        if (resetOnSubmit) {
          resetForm();
        }
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    };

    const contextValue: FormContextValue = {
      values,
      errors,
      touched,
      isSubmitting,
      isValid,
      isDirty,
      setValue,
      setError,
      setTouched: setTouchedField,
      clearError,
      clearAllErrors,
      registerField,
      unregisterField,
      validateField,
      validateForm,
      resetForm,
      getFieldProps,
    };

    return (
      <FormContext.Provider value={contextValue}>
        <StyledForm ref={ref} onSubmit={handleSubmit} noValidate {...props}>
          {children}
        </StyledForm>
      </FormContext.Provider>
    );
  }
);

Form.displayName = 'Form';

export default Form;
