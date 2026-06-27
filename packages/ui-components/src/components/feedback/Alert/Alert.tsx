/**
 * Alert Component
 * Alert banner with info/success/warning/error variants, closable
 */

import React, { forwardRef, useState, useEffect, type HTMLAttributes, type ReactNode } from 'react';
import styled, { css, keyframes } from 'styled-components';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  closable?: boolean;
  onClose?: () => void;
  icon?: ReactNode;
  action?: ReactNode;
  autoClose?: number;
}

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const fadeOut = keyframes`
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-8px);
  }
`;

const variantStyles = {
  info: css`
    background: var(--color-info-light, #eff6ff);
    border-color: var(--color-info, #3b82f6);
    color: var(--color-info-dark, #1e40af);

    .alert-icon {
      color: var(--color-info, #3b82f6);
    }
  `,
  success: css`
    background: var(--color-success-light, #f0fdf4);
    border-color: var(--color-success, #16a34a);
    color: var(--color-success-dark, #166534);

    .alert-icon {
      color: var(--color-success, #16a34a);
    }
  `,
  warning: css`
    background: var(--color-warning-light, #fffbeb);
    border-color: var(--color-warning, #d97706);
    color: var(--color-warning-dark, #92400e);

    .alert-icon {
      color: var(--color-warning, #d97706);
    }
  `,
  error: css`
    background: var(--color-error-light, #fef2f2);
    border-color: var(--color-error, #dc2626);
    color: var(--color-error-dark, #991b1b);

    .alert-icon {
      color: var(--color-error, #dc2626);
    }
  `,
};

const StyledAlert = styled.div<{
  $variant: AlertVariant;
  $isClosing: boolean;
}>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  border-left: 4px solid;
  font-family: var(--font-family-sans, system-ui, sans-serif);
  animation: ${({ $isClosing }) => ($isClosing ? fadeOut : fadeIn)} 0.2s ease-out forwards;

  ${({ $variant }) => variantStyles[$variant]}
`;

const IconWrapper = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  margin-top: 2px;
`;

const ContentWrapper = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.div`
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
`;

const Message = styled.div`
  font-size: 14px;
  line-height: 1.5;
`;

const ActionsWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 4px;
  margin: -4px -4px -4px 0;
  cursor: pointer;
  border-radius: 4px;
  color: currentColor;
  opacity: 0.7;
  transition:
    opacity 0.2s ease,
    background-color 0.2s ease;

  &:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.05);
  }

  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

// Default icons for each variant
const DefaultIcons: Record<AlertVariant, ReactNode> = {
  info: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  ),
  success: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

const CloseIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
      clipRule="evenodd"
    />
  </svg>
);

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      variant = 'info',
      title,
      children,
      closable = false,
      onClose,
      icon,
      action,
      autoClose,
      role = 'alert',
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = useState(true);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
      if (autoClose && autoClose > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, autoClose);
        return () => clearTimeout(timer);
      }
      return undefined;
    }, [autoClose]);

    const handleClose = () => {
      setIsClosing(true);
      setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, 200);
    };

    if (!isVisible) {
      return null;
    }

    const displayIcon = icon !== undefined ? icon : DefaultIcons[variant];

    return (
      <StyledAlert ref={ref} role={role} $variant={variant} $isClosing={isClosing} {...props}>
        {displayIcon && <IconWrapper className="alert-icon">{displayIcon}</IconWrapper>}
        <ContentWrapper>
          {title && <Title>{title}</Title>}
          <Message>{children}</Message>
          {action && <ActionsWrapper>{action}</ActionsWrapper>}
        </ContentWrapper>
        {closable && (
          <CloseButton type="button" onClick={handleClose} aria-label="Close alert">
            {CloseIcon}
          </CloseButton>
        )}
      </StyledAlert>
    );
  }
);

Alert.displayName = 'Alert';

export default Alert;
