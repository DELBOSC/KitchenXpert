/**
 * Avatar Component
 * User avatar with image, initials, various sizes, and status indicator
 */

import React, { forwardRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import styled, { css } from 'styled-components';

// Types
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type AvatarShape = 'circle' | 'square';
export type AvatarStatus = 'online' | 'offline' | 'away' | 'busy' | 'none';

export interface AvatarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  src?: string;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  shape?: AvatarShape;
  status?: AvatarStatus;
  showBorder?: boolean;
  fallback?: ReactNode;
  loading?: 'eager' | 'lazy';
}

// Size configuration
const sizeConfig = {
  xs: { dimension: 24, fontSize: 10, statusSize: 6, borderWidth: 2 },
  sm: { dimension: 32, fontSize: 12, statusSize: 8, borderWidth: 2 },
  md: { dimension: 40, fontSize: 14, statusSize: 10, borderWidth: 2 },
  lg: { dimension: 48, fontSize: 16, statusSize: 12, borderWidth: 3 },
  xl: { dimension: 64, fontSize: 20, statusSize: 14, borderWidth: 3 },
  '2xl': { dimension: 96, fontSize: 28, statusSize: 18, borderWidth: 4 },
};

// Status colors
const statusColors = {
  online: 'var(--color-success, #16a34a)',
  offline: 'var(--color-gray-400, #9ca3af)',
  away: 'var(--color-warning, #f59e0b)',
  busy: 'var(--color-error, #dc2626)',
  none: 'transparent',
};

// Background colors for initials (based on name hash)
const avatarColors = [
  '#2563eb', // blue
  '#16a34a', // green
  '#dc2626', // red
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

// Helper to get initials from name
function getInitials(name: string, maxLength = 2): string {
  if (!name) return '';

  const words = name.trim().split(/\s+/);
  const firstWord = words[0];
  if (words.length === 1 && firstWord) {
    return firstWord.substring(0, maxLength).toUpperCase();
  }

  return words
    .slice(0, maxLength)
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase();
}

// Helper to get consistent color for a name
function getColorFromName(name: string): string {
  const defaultColor = avatarColors[0] ?? '#2563eb';
  if (!name) return defaultColor;

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return avatarColors[Math.abs(hash) % avatarColors.length] ?? defaultColor;
}

// Styled Components
const AvatarWrapper = styled.div<{
  $size: AvatarSize;
  $shape: AvatarShape;
  $showBorder: boolean;
}>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: ${({ $size }) => sizeConfig[$size].dimension}px;
  height: ${({ $size }) => sizeConfig[$size].dimension}px;
  border-radius: ${({ $shape }) => ($shape === 'circle' ? '50%' : '8px')};
  overflow: hidden;
  background: var(--color-gray-200, #e5e7eb);
  font-family: var(--font-family-sans, system-ui, sans-serif);

  ${({ $showBorder, $size }) =>
    $showBorder &&
    css`
      border: ${sizeConfig[$size].borderWidth}px solid var(--color-background, white);
      box-shadow: 0 0 0 1px var(--color-gray-200, #e5e7eb);
    `}
`;

const AvatarImage = styled.img<{ $loaded: boolean }>`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.2s ease;
  opacity: ${({ $loaded }) => ($loaded ? 1 : 0)};
`;

const AvatarFallback = styled.div<{
  $size: AvatarSize;
  $bgColor: string;
}>`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: ${({ $bgColor }) => $bgColor};
  color: white;
  font-size: ${({ $size }) => sizeConfig[$size].fontSize}px;
  font-weight: 600;
  text-transform: uppercase;
  user-select: none;
`;

const DefaultIcon = styled.svg<{ $size: AvatarSize }>`
  width: ${({ $size }) => sizeConfig[$size].fontSize * 1.5}px;
  height: ${({ $size }) => sizeConfig[$size].fontSize * 1.5}px;
  color: var(--color-gray-400, #9ca3af);
`;

const StatusIndicator = styled.span<{
  $size: AvatarSize;
  $status: AvatarStatus;
  $shape: AvatarShape;
}>`
  position: absolute;
  bottom: ${({ $shape }) => ($shape === 'circle' ? '0' : '-2px')};
  right: ${({ $shape }) => ($shape === 'circle' ? '0' : '-2px')};
  width: ${({ $size }) => sizeConfig[$size].statusSize}px;
  height: ${({ $size }) => sizeConfig[$size].statusSize}px;
  border-radius: 50%;
  background: ${({ $status }) => statusColors[$status]};
  border: 2px solid var(--color-background, white);
  box-sizing: content-box;

  ${({ $status }) =>
    $status === 'none' &&
    css`
      display: none;
    `}
`;

// Default user icon component
const UserIcon: React.FC<{ size: AvatarSize }> = ({ size }) => (
  <DefaultIcon $size={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </DefaultIcon>
);

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      src,
      alt,
      name,
      size = 'md',
      shape = 'circle',
      status = 'none',
      showBorder = false,
      fallback,
      loading = 'lazy',
      ...props
    },
    ref
  ) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    const initials = name ? getInitials(name) : '';
    const bgColor = name ? getColorFromName(name) : 'var(--color-gray-200, #e5e7eb)';
    const showImage = src && !imageError;
    const showFallback = !showImage || !imageLoaded;

    const handleImageLoad = () => {
      setImageLoaded(true);
    };

    const handleImageError = () => {
      setImageError(true);
      setImageLoaded(false);
    };

    return (
      <AvatarWrapper
        ref={ref}
        $size={size}
        $shape={shape}
        $showBorder={showBorder}
        role="img"
        aria-label={alt || name || 'Avatar'}
        {...props}
      >
        {showFallback && (
          <AvatarFallback $size={size} $bgColor={bgColor}>
            {fallback || initials || <UserIcon size={size} />}
          </AvatarFallback>
        )}
        {showImage && (
          <AvatarImage
            src={src}
            alt={alt || name || 'Avatar'}
            $loaded={imageLoaded}
            loading={loading}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
        {status !== 'none' && (
          <StatusIndicator
            $size={size}
            $status={status}
            $shape={shape}
            aria-label={`Status: ${status}`}
          />
        )}
      </AvatarWrapper>
    );
  }
);

Avatar.displayName = 'Avatar';

// Avatar Group Component
export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  max?: number;
  size?: AvatarSize;
  shape?: AvatarShape;
  children: ReactNode;
}

const AvatarGroupWrapper = styled.div<{ $size: AvatarSize }>`
  display: inline-flex;
  flex-direction: row-reverse;
  justify-content: flex-end;

  > * {
    margin-left: -${({ $size }) => sizeConfig[$size].dimension * 0.25}px;
    box-shadow: 0 0 0 2px var(--color-background, white);
  }

  > *:last-child {
    margin-left: 0;
  }
`;

const MoreAvatar = styled.div<{
  $size: AvatarSize;
  $shape: AvatarShape;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => sizeConfig[$size].dimension}px;
  height: ${({ $size }) => sizeConfig[$size].dimension}px;
  border-radius: ${({ $shape }) => ($shape === 'circle' ? '50%' : '8px')};
  background: var(--color-gray-200, #e5e7eb);
  color: var(--color-gray-600, #4b5563);
  font-family: var(--font-family-sans, system-ui, sans-serif);
  font-size: ${({ $size }) => sizeConfig[$size].fontSize}px;
  font-weight: 600;
  box-shadow: 0 0 0 2px var(--color-background, white);
`;

export const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ max = 5, size = 'md', shape = 'circle', children, ...props }, ref) => {
    const childArray = React.Children.toArray(children);
    const visibleCount = Math.min(childArray.length, max);
    const extraCount = childArray.length - visibleCount;

    const visibleChildren = childArray.slice(0, visibleCount).map((child, index) => {
      if (React.isValidElement<AvatarProps>(child)) {
        return React.cloneElement(child, {
          key: index,
          size,
          shape,
          showBorder: true,
        });
      }
      return child;
    });

    return (
      <AvatarGroupWrapper ref={ref} $size={size} role="group" {...props}>
        {extraCount > 0 && (
          <MoreAvatar $size={size} $shape={shape} aria-label={`+${extraCount} more`}>
            +{extraCount}
          </MoreAvatar>
        )}
        {visibleChildren.reverse()}
      </AvatarGroupWrapper>
    );
  }
);

AvatarGroup.displayName = 'AvatarGroup';

export default Avatar;
