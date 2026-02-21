/**
 * Select Component
 * Dropdown select with options, search, and multi-select support
 */

import React, {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import styled, { css } from 'styled-components';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
}

export type SelectSize = 'sm' | 'md' | 'lg';
export type SelectState = 'default' | 'error' | 'success' | 'warning';

export interface SelectProps {
  options: SelectOption[];
  value?: string | string[];
  defaultValue?: string | string[];
  onChange?: (value: string | string[]) => void;
  placeholder?: string;
  label?: string;
  helperText?: string;
  errorText?: string;
  size?: SelectSize;
  state?: SelectState;
  disabled?: boolean;
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  fullWidth?: boolean;
  name?: string;
  id?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

const sizeStyles = {
  sm: css`
    min-height: 32px;
    padding: 4px 32px 4px 10px;
    font-size: 13px;
  `,
  md: css`
    min-height: 40px;
    padding: 8px 36px 8px 12px;
    font-size: 14px;
  `,
  lg: css`
    min-height: 48px;
    padding: 12px 40px 12px 16px;
    font-size: 16px;
  `,
};

const stateStyles = {
  default: css`
    border-color: var(--color-gray-300, #d1d5db);

    &:focus-within {
      border-color: var(--color-primary, #2563eb);
      box-shadow: 0 0 0 3px var(--color-primary-light, rgba(37, 99, 235, 0.1));
    }
  `,
  error: css`
    border-color: var(--color-error, #dc2626);

    &:focus-within {
      border-color: var(--color-error, #dc2626);
      box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
    }
  `,
  success: css`
    border-color: var(--color-success, #16a34a);

    &:focus-within {
      border-color: var(--color-success, #16a34a);
      box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
    }
  `,
  warning: css`
    border-color: var(--color-warning, #d97706);

    &:focus-within {
      border-color: var(--color-warning, #d97706);
      box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.1);
    }
  `,
};

const SelectWrapper = styled.div<{ $fullWidth: boolean }>`
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
  ${({ $fullWidth }) => $fullWidth && css`width: 100%;`}
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: var(--color-gray-700, #374151);
`;

const SelectContainer = styled.div<{
  $size: SelectSize;
  $state: SelectState;
  $disabled: boolean;
  $isOpen: boolean;
}>`
  position: relative;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  border: 2px solid;
  border-radius: 8px;
  background: var(--color-white, #ffffff);
  color: var(--color-gray-900, #111827);
  font-family: var(--font-family-sans, system-ui, sans-serif);
  transition: all 0.2s ease;
  cursor: pointer;

  ${({ $size }) => sizeStyles[$size]}
  ${({ $state }) => stateStyles[$state]}

  ${({ $disabled }) =>
    $disabled &&
    css`
      background: var(--color-gray-100, #f3f4f6);
      cursor: not-allowed;
      opacity: 0.6;
    `}

  ${({ $isOpen }) =>
    $isOpen &&
    css`
      border-color: var(--color-primary, #2563eb);
      box-shadow: 0 0 0 3px var(--color-primary-light, rgba(37, 99, 235, 0.1));
    `}
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 60px;
  border: none;
  background: transparent;
  outline: none;
  font-size: inherit;
  font-family: inherit;
  color: inherit;

  &::placeholder {
    color: var(--color-gray-400, #9ca3af);
  }

  &:disabled {
    cursor: not-allowed;
  }
`;

const Placeholder = styled.span`
  color: var(--color-gray-400, #9ca3af);
`;

const SelectedValue = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Tag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: var(--color-gray-100, #f3f4f6);
  border-radius: 4px;
  font-size: 12px;
`;

const TagRemove = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-gray-500, #6b7280);
  border-radius: 2px;

  &:hover {
    background: var(--color-gray-200, #e5e7eb);
    color: var(--color-gray-700, #374151);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary, #2563eb);
  }
`;

const IconsContainer = styled.div`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
`;

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-gray-500, #6b7280);
  border-radius: 4px;

  &:hover {
    background: var(--color-gray-100, #f3f4f6);
    color: var(--color-gray-700, #374151);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary, #2563eb);
  }
`;

const ChevronIcon = styled.span<{ $isOpen: boolean }>`
  display: inline-flex;
  color: var(--color-gray-500, #6b7280);
  transition: transform 0.2s ease;
  ${({ $isOpen }) => $isOpen && css`transform: rotate(180deg);`}
`;

const Dropdown = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  padding: 4px;
  background: var(--color-white, #ffffff);
  border: 1px solid var(--color-gray-200, #e5e7eb);
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  z-index: 50;
  max-height: 240px;
  overflow-y: auto;

  display: ${({ $isOpen }) => ($isOpen ? 'block' : 'none')};
`;

const Option = styled.div<{
  $isSelected: boolean;
  $isHighlighted: boolean;
  $isDisabled: boolean;
}>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;

  ${({ $isSelected }) =>
    $isSelected &&
    css`
      background: var(--color-primary-light, #eff6ff);
      color: var(--color-primary, #2563eb);
    `}

  ${({ $isHighlighted, $isSelected }) =>
    $isHighlighted &&
    !$isSelected &&
    css`
      background: var(--color-gray-100, #f3f4f6);
    `}

  ${({ $isDisabled }) =>
    $isDisabled &&
    css`
      opacity: 0.5;
      cursor: not-allowed;
    `}

  &:hover:not([data-disabled='true']) {
    background: ${({ $isSelected }) =>
      $isSelected
        ? 'var(--color-primary-light, #eff6ff)'
        : 'var(--color-gray-100, #f3f4f6)'};
  }
`;

const OptionIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const NoOptions = styled.div`
  padding: 12px;
  text-align: center;
  color: var(--color-gray-500, #6b7280);
  font-size: 14px;
`;

const HelperText = styled.span<{ $state: SelectState }>`
  font-size: 12px;
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

// Chevron SVG icon
const ChevronSvg = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M4 6L8 10L12 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Close/X SVG icon
const CloseSvg = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M4 4L12 12M12 4L4 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Checkmark SVG icon
const CheckSvg = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M3 8L6.5 11.5L13 4.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Select = forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      options,
      value: controlledValue,
      defaultValue,
      onChange,
      placeholder = 'Select an option',
      label,
      helperText,
      errorText,
      size = 'md',
      state = 'default',
      disabled = false,
      multiple = false,
      searchable = false,
      clearable = false,
      fullWidth = false,
      name,
      id,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || `select-${generatedId}`;
    const listboxId = `${selectId}-listbox`;
    const helperId = `${selectId}-helper`;

    const isControlled = controlledValue !== undefined;
    const [internalValue, setInternalValue] = useState<string | string[]>(
      defaultValue || (multiple ? [] : '')
    );
    const value = isControlled ? controlledValue : internalValue;

    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const displayState = errorText ? 'error' : state;
    const displayHelperText = errorText || helperText;

    const filteredOptions = options.filter((option) =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedOptions = options.filter((option) =>
      multiple
        ? (value as string[]).includes(option.value)
        : value === option.value
    );

    const handleValueChange = useCallback(
      (newValue: string | string[]) => {
        if (!isControlled) {
          setInternalValue(newValue);
        }
        onChange?.(newValue);
      },
      [isControlled, onChange]
    );

    const handleSelect = useCallback(
      (optionValue: string) => {
        const option = options.find((o) => o.value === optionValue);
        if (option?.disabled) return;

        if (multiple) {
          const currentValues = value as string[];
          const newValues = currentValues.includes(optionValue)
            ? currentValues.filter((v) => v !== optionValue)
            : [...currentValues, optionValue];
          handleValueChange(newValues);
        } else {
          handleValueChange(optionValue);
          setIsOpen(false);
        }

        setSearchQuery('');
      },
      [multiple, value, handleValueChange, options]
    );

    const handleClear = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        handleValueChange(multiple ? [] : '');
        setSearchQuery('');
      },
      [multiple, handleValueChange]
    );

    const handleTagRemove = useCallback(
      (optionValue: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const currentValues = value as string[];
        handleValueChange(currentValues.filter((v) => v !== optionValue));
      },
      [value, handleValueChange]
    );

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLDivElement>) => {
        if (disabled) return;

        switch (e.key) {
          case 'Enter':
          case ' ':
            e.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
            } else if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
              handleSelect(filteredOptions[highlightedIndex].value);
            }
            break;
          case 'ArrowDown':
            e.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
            } else {
              setHighlightedIndex((prev) =>
                prev < filteredOptions.length - 1 ? prev + 1 : 0
              );
            }
            break;
          case 'ArrowUp':
            e.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
            } else {
              setHighlightedIndex((prev) =>
                prev > 0 ? prev - 1 : filteredOptions.length - 1
              );
            }
            break;
          case 'Escape':
            e.preventDefault();
            setIsOpen(false);
            setHighlightedIndex(-1);
            break;
          case 'Tab':
            setIsOpen(false);
            break;
          case 'Home':
            if (isOpen) {
              e.preventDefault();
              setHighlightedIndex(0);
            }
            break;
          case 'End':
            if (isOpen) {
              e.preventDefault();
              setHighlightedIndex(filteredOptions.length - 1);
            }
            break;
        }
      },
      [disabled, isOpen, highlightedIndex, filteredOptions, handleSelect]
    );

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false);
          setHighlightedIndex(-1);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when dropdown opens
    useEffect(() => {
      if (isOpen && searchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [isOpen, searchable]);

    // Reset highlighted index when filtered options change
    useEffect(() => {
      setHighlightedIndex(-1);
    }, [searchQuery]);

    const hasValue = multiple
      ? (value as string[]).length > 0
      : Boolean(value);

    return (
      <SelectWrapper $fullWidth={fullWidth} ref={ref}>
        {label && <Label htmlFor={selectId}>{label}</Label>}
        <div ref={containerRef} style={{ position: 'relative' }}>
          <SelectContainer
            $size={size}
            $state={displayState}
            $disabled={disabled}
            $isOpen={isOpen}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            onKeyDown={handleKeyDown}
            tabIndex={disabled ? -1 : 0}
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls={listboxId}
            aria-label={ariaLabel || label}
            aria-describedby={
              ariaDescribedBy || (displayHelperText ? helperId : undefined)
            }
            aria-disabled={disabled}
            id={selectId}
          >
            {/* Hidden input for form submission */}
            {name && (
              <input
                type="hidden"
                name={name}
                value={multiple ? (value as string[]).join(',') : (value as string)}
              />
            )}

            {searchable && isOpen ? (
              <SearchInput
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder={hasValue ? '' : placeholder}
                disabled={disabled}
                aria-autocomplete="list"
              />
            ) : multiple && selectedOptions.length > 0 ? (
              selectedOptions.map((option) => (
                <Tag key={option.value}>
                  {option.icon && <OptionIcon>{option.icon}</OptionIcon>}
                  {option.label}
                  <TagRemove
                    type="button"
                    onClick={(e) => handleTagRemove(option.value, e)}
                    aria-label={`Remove ${option.label}`}
                  >
                    <CloseSvg size={10} />
                  </TagRemove>
                </Tag>
              ))
            ) : selectedOptions.length > 0 && selectedOptions[0] ? (
              <SelectedValue>
                {selectedOptions[0].icon && (
                  <OptionIcon>{selectedOptions[0].icon}</OptionIcon>
                )}
                {selectedOptions[0].label}
              </SelectedValue>
            ) : (
              <Placeholder>{placeholder}</Placeholder>
            )}

            <IconsContainer>
              {clearable && hasValue && !disabled && (
                <IconButton
                  type="button"
                  onClick={handleClear}
                  aria-label="Clear selection"
                >
                  <CloseSvg />
                </IconButton>
              )}
              <ChevronIcon $isOpen={isOpen}>
                <ChevronSvg />
              </ChevronIcon>
            </IconsContainer>
          </SelectContainer>

          <Dropdown $isOpen={isOpen} role="listbox" id={listboxId} aria-label={label || ariaLabel}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => {
                const isSelected = multiple
                  ? (value as string[]).includes(option.value)
                  : value === option.value;

                return (
                  <Option
                    key={option.value}
                    $isSelected={isSelected}
                    $isHighlighted={index === highlightedIndex}
                    $isDisabled={option.disabled || false}
                    onClick={() => handleSelect(option.value)}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled}
                    data-disabled={option.disabled}
                  >
                    {multiple && (
                      <span style={{ width: 14, height: 14 }}>
                        {isSelected && <CheckSvg />}
                      </span>
                    )}
                    {option.icon && <OptionIcon>{option.icon}</OptionIcon>}
                    {option.label}
                  </Option>
                );
              })
            ) : (
              <NoOptions>No options found</NoOptions>
            )}
          </Dropdown>
        </div>

        {displayHelperText && (
          <HelperText $state={displayState} id={helperId}>
            {displayHelperText}
          </HelperText>
        )}
      </SelectWrapper>
    );
  }
);

Select.displayName = 'Select';

export default Select;
