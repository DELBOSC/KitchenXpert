/**
 * Toast Component
 * Toast notification with auto-dismiss and stacking
 */

import React, {
  forwardRef,
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import styled, { css, keyframes } from 'styled-components';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';
export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  variant?: ToastVariant;
  title?: string;
  message: ReactNode;
  duration?: number;
  closable?: boolean;
  onClose?: () => void;
  icon?: ReactNode;
  action?: ReactNode;
}

export interface ToastItem extends Omit<ToastProps, 'onClose'> {
  id: string;
}

export interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

// Animations
const slideInRight = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideInLeft = keyframes`
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideInTop = keyframes`
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const slideInBottom = keyframes`
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const slideOutRight = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
`;

const slideOutLeft = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(-100%);
    opacity: 0;
  }
`;

const variantStyles = {
  info: css`
    background: var(--color-info, #3b82f6);
    color: white;

    .toast-icon {
      color: white;
    }
  `,
  success: css`
    background: var(--color-success, #16a34a);
    color: white;

    .toast-icon {
      color: white;
    }
  `,
  warning: css`
    background: var(--color-warning, #d97706);
    color: white;

    .toast-icon {
      color: white;
    }
  `,
  error: css`
    background: var(--color-error, #dc2626);
    color: white;

    .toast-icon {
      color: white;
    }
  `,
};

const getSlideAnimation = (position: ToastPosition, isClosing: boolean) => {
  if (position.includes('right')) {
    return isClosing ? slideOutRight : slideInRight;
  }
  if (position.includes('left')) {
    return isClosing ? slideOutLeft : slideInLeft;
  }
  if (position.includes('top')) {
    return isClosing ? slideOutRight : slideInTop;
  }
  return isClosing ? slideOutRight : slideInBottom;
};

const StyledToast = styled.div<{
  $variant: ToastVariant;
  $isClosing: boolean;
  $position: ToastPosition;
}>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  font-family: var(--font-family-sans, system-ui, sans-serif);
  min-width: 300px;
  max-width: 400px;
  animation: ${({ $position, $isClosing }) => getSlideAnimation($position, $isClosing)} 0.3s
    ease-out forwards;
  pointer-events: auto;

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
  margin-bottom: 2px;
`;

const Message = styled.div`
  font-size: 14px;
  line-height: 1.4;
  opacity: 0.9;
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
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 1;
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

const ProgressBar = styled.div<{ $duration: number }>`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 0 0 8px 8px;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    background: rgba(255, 255, 255, 0.7);
    animation: shrink ${({ $duration }) => $duration}ms linear forwards;
  }

  @keyframes shrink {
    from {
      width: 100%;
    }
    to {
      width: 0%;
    }
  }
`;

// Default icons for each variant
const DefaultIcons: Record<ToastVariant, ReactNode> = {
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

// Single Toast Component
export const Toast = forwardRef<HTMLDivElement, ToastProps & { position?: ToastPosition }>(
  (
    {
      variant = 'info',
      title,
      message,
      duration = 5000,
      closable = true,
      onClose,
      icon,
      action,
      position = 'top-right',
      ...props
    },
    ref
  ) => {
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);
        return () => clearTimeout(timer);
      }
      return undefined;
    }, [duration]);

    const handleClose = useCallback(() => {
      setIsClosing(true);
      setTimeout(() => {
        onClose?.();
      }, 300);
    }, [onClose]);

    const displayIcon = icon !== undefined ? icon : DefaultIcons[variant];

    return (
      <StyledToast
        ref={ref}
        role="alert"
        aria-live="polite"
        $variant={variant}
        $isClosing={isClosing}
        $position={position}
        {...props}
      >
        {displayIcon && <IconWrapper className="toast-icon">{displayIcon}</IconWrapper>}
        <ContentWrapper>
          {title && <Title>{title}</Title>}
          <Message>{message}</Message>
          {action && <ActionsWrapper>{action}</ActionsWrapper>}
        </ContentWrapper>
        {closable && (
          <CloseButton type="button" onClick={handleClose} aria-label="Close notification">
            {CloseIcon}
          </CloseButton>
        )}
        {duration > 0 && <ProgressBar $duration={duration} />}
      </StyledToast>
    );
  }
);

Toast.displayName = 'Toast';

// Toast Container for stacking
const positionStyles = {
  'top-left': css`
    top: 16px;
    left: 16px;
  `,
  'top-center': css`
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
  `,
  'top-right': css`
    top: 16px;
    right: 16px;
  `,
  'bottom-left': css`
    bottom: 16px;
    left: 16px;
  `,
  'bottom-center': css`
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
  `,
  'bottom-right': css`
    bottom: 16px;
    right: 16px;
  `,
};

const ToastContainerStyled = styled.div<{ $position: ToastPosition }>`
  position: fixed;
  z-index: var(--z-index-toast, 1100);
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;

  ${({ $position }) => positionStyles[$position]}

  ${({ $position }) =>
    $position.includes('bottom') &&
    css`
      flex-direction: column-reverse;
    `}
`;

export interface ToastContainerProps {
  position?: ToastPosition;
  children?: ReactNode;
}

export const ToastContainer = forwardRef<HTMLDivElement, ToastContainerProps>(
  ({ position = 'top-right', children }, ref) => {
    return (
      <ToastContainerStyled ref={ref} $position={position} role="region" aria-label="Notifications">
        {children}
      </ToastContainerStyled>
    );
  }
);

ToastContainer.displayName = 'ToastContainer';

// Toast Context and Provider
const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export interface ToastProviderProps {
  children: ReactNode;
  position?: ToastPosition;
  maxToasts?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  position = 'top-right',
  maxToasts = 5,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = crypto.randomUUID();
      setToasts((prev) => {
        const newToasts = [...prev, { ...toast, id }];
        if (newToasts.length > maxToasts) {
          return newToasts.slice(-maxToasts);
        }
        return newToasts;
      });
      return id;
    },
    [maxToasts]
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      <ToastContainer position={position}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            position={position}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
};

// Hook to use toast
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  const toast = useCallback((props: Omit<ToastItem, 'id'>) => context.addToast(props), [context]);

  const toastInfo = useCallback(
    (message: ReactNode, options?: Partial<Omit<ToastItem, 'id' | 'message' | 'variant'>>) =>
      context.addToast({ message, variant: 'info', ...options }),
    [context]
  );

  const toastSuccess = useCallback(
    (message: ReactNode, options?: Partial<Omit<ToastItem, 'id' | 'message' | 'variant'>>) =>
      context.addToast({ message, variant: 'success', ...options }),
    [context]
  );

  const toastWarning = useCallback(
    (message: ReactNode, options?: Partial<Omit<ToastItem, 'id' | 'message' | 'variant'>>) =>
      context.addToast({ message, variant: 'warning', ...options }),
    [context]
  );

  const toastError = useCallback(
    (message: ReactNode, options?: Partial<Omit<ToastItem, 'id' | 'message' | 'variant'>>) =>
      context.addToast({ message, variant: 'error', ...options }),
    [context]
  );

  return {
    toast,
    toastInfo,
    toastSuccess,
    toastWarning,
    toastError,
    removeToast: context.removeToast,
    clearToasts: context.clearToasts,
    toasts: context.toasts,
  };
};

export default Toast;
