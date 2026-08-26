import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)] focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[var(--accent)] text-[var(--text-on-accent)]',
        secondary: 'border-transparent bg-[var(--bg-elevated)] text-[var(--text-secondary)]',
        destructive: 'border-transparent bg-[var(--danger)] text-white',
        outline: 'border-[var(--border)] text-[var(--text-secondary)]',
        algorithm: 'border-transparent bg-[var(--algorithm-soft)] text-[var(--algorithm)]',
        success: 'border-transparent bg-[var(--success-soft)] text-[var(--success)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
