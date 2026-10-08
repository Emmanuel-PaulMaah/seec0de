import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

// Shared buttons. Styling lives in global.css (.ui-btn*) and uses only design
// tokens, so every button in the app shares one set of heights, radii, type
// sizes and hover/focus states.
//
//   variant: primary | secondary | ghost | danger
//   size:    sm (28px) | md (32px) | lg (36px)

export const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', type = 'button', className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn('ui-btn', `ui-btn--${variant}`, `ui-btn--${size}`, className)}
      {...rest}
    >
      {children}
    </button>
  );
});

// Icon-only button. `label` is required: it becomes the accessible name and
// the hover tooltip, so icon buttons can't ship unlabeled.
export const IconButton = forwardRef(function IconButton(
  { label, variant = 'ghost', size = 'md', type = 'button', className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn('ui-btn', 'ui-btn--icon', `ui-btn--${variant}`, `ui-btn--${size}`, className)}
      {...rest}
    >
      {children}
    </button>
  );
});
