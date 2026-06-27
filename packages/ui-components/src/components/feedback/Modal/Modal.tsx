/**
 * Modal Component
 * Modal dialog with overlay, header, body, footer, and sizes
 */

import React, {
  forwardRef,
  useEffect,
  useCallback,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import styled, { css, keyframes } from 'styled-components';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  isOpen: boolean;
  onClose: () => void;
  size?: ModalSize;
  title?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  centered?: boolean;
  preventScroll?: boolean;
}

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const fadeOut = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
`;

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

const slideOut = keyframes`
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
`;

const sizeStyles = {
  sm: css`
    max-width: 400px;
  `,
  md: css`
    max-width: 500px;
  `,
  lg: css`
    max-width: 700px;
  `,
  xl: css`
    max-width: 900px;
  `,
  full: css`
    max-width: calc(100vw - 32px);
    max-height: calc(100vh - 32px);
    width: 100%;
    height: 100%;
  `,
};

const Overlay = styled.div<{ $isClosing: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 48px 16px;
  overflow-y: auto;
  z-index: var(--z-index-modal, 1000);
  animation: ${({ $isClosing }) => ($isClosing ? fadeOut : fadeIn)} 0.2s ease-out forwards;
`;

const OverlayCentered = styled(Overlay)`
  align-items: center;
  padding: 16px;
`;

const ModalContainer = styled.div<{
  $size: ModalSize;
  $isClosing: boolean;
}>`
  background: var(--color-white, #ffffff);
  border-radius: 12px;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  width: 100%;
  display: flex;
  flex-direction: column;
  font-family: var(--font-family-sans, system-ui, sans-serif);
  animation: ${({ $isClosing }) => ($isClosing ? slideOut : slideIn)} 0.2s ease-out forwards;

  ${({ $size }) => sizeStyles[$size]}

  &:focus {
    outline: none;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-gray-200, #e5e7eb);
`;

const Title = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: var(--color-gray-900, #111827);
  margin: 0;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-gray-500, #6b7280);
  transition:
    background-color 0.2s ease,
    color 0.2s ease;

  &:hover {
    background: var(--color-gray-100, #f3f4f6);
    color: var(--color-gray-700, #374151);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary, #2563eb);
    outline-offset: 2px;
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const Body = styled.div`
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  color: var(--color-gray-700, #374151);
  font-size: 14px;
  line-height: 1.6;
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--color-gray-200, #e5e7eb);
`;

const CloseIcon = (
  <svg viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
      clipRule="evenodd"
    />
  </svg>
);

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      size = 'md',
      title,
      footer,
      children,
      closeOnOverlayClick = true,
      closeOnEscape = true,
      showCloseButton = true,
      centered = false,
      preventScroll = true,
      ...props
    },
    ref
  ) => {
    const [isClosing, setIsClosing] = React.useState(false);
    const [shouldRender, setShouldRender] = React.useState(isOpen);
    const modalRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);

    const handleClose = useCallback(() => {
      setIsClosing(true);
      setTimeout(() => {
        setIsClosing(false);
        onClose();
      }, 200);
    }, [onClose]);

    // Handle escape key
    const handleEscape = useCallback(
      (event: KeyboardEvent) => {
        if (event.key === 'Escape' && closeOnEscape) {
          handleClose();
        }
      },
      [closeOnEscape, handleClose]
    );

    // Handle overlay click
    const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget && closeOnOverlayClick) {
        handleClose();
      }
    };

    // Lock body scroll when modal is open
    useEffect(() => {
      if (isOpen && preventScroll) {
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
          document.body.style.overflow = originalOverflow;
        };
      }
      return undefined;
    }, [isOpen, preventScroll]);

    // Add/remove escape listener
    useEffect(() => {
      if (isOpen) {
        document.addEventListener('keydown', handleEscape);
        return () => {
          document.removeEventListener('keydown', handleEscape);
        };
      }
      return undefined;
    }, [isOpen, handleEscape]);

    // Handle opening/closing animation
    useEffect(() => {
      if (isOpen) {
        previousActiveElement.current = document.activeElement as HTMLElement;
        setShouldRender(true);
        // Focus the modal after it opens
        setTimeout(() => {
          modalRef.current?.focus();
        }, 0);
      } else {
        // Restore focus when closing
        previousActiveElement.current?.focus();
      }
    }, [isOpen]);

    // Handle close animation end
    useEffect(() => {
      if (!isOpen && !isClosing) {
        setShouldRender(false);
      }
    }, [isOpen, isClosing]);

    if (!shouldRender) {
      return null;
    }

    const OverlayComponent = centered ? OverlayCentered : Overlay;

    return (
      <OverlayComponent $isClosing={isClosing} onClick={handleOverlayClick} role="presentation">
        <ModalContainer
          ref={(node) => {
            (modalRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          $size={size}
          $isClosing={isClosing}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          tabIndex={-1}
          {...props}
        >
          {(title || showCloseButton) && (
            <Header>
              {title && <Title id="modal-title">{title}</Title>}
              {showCloseButton && (
                <CloseButton type="button" onClick={handleClose} aria-label="Close modal">
                  {CloseIcon}
                </CloseButton>
              )}
            </Header>
          )}
          <Body>{children}</Body>
          {footer && <Footer>{footer}</Footer>}
        </ModalContainer>
      </OverlayComponent>
    );
  }
);

Modal.displayName = 'Modal';

export default Modal;
