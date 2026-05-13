import React, { useState } from 'react';

import { cn } from './_utils';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizes: Record<Size, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-lg',
};

function getInitials(name?: string): string {
  if (!name) {return '?';}
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({
  src,
  alt,
  name,
  size = 'md',
  className,
}: {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: Size;
  className?: string;
}): React.ReactElement {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;
  return (
    <span
      className={cn(
        'relative inline-flex select-none items-center justify-center overflow-hidden rounded-full font-semibold text-white',
        'bg-gradient-to-br from-indigo-400 to-fuchsia-500',
        sizes[size],
        className,
      )}
      role="img"
      aria-label={alt ?? name ?? 'avatar'}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={alt ?? ''}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}
