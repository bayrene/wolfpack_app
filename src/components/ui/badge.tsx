import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[#E07A3A] text-white',
        secondary: 'border-transparent bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100',
        success: 'border-transparent bg-[#3A8A5C] text-white',
        warning: 'border-transparent bg-amber-500 text-white',
        destructive: 'border-transparent bg-red-500 text-white',
        outline: 'border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300',
        breakfast: 'border-transparent bg-[#E07A3A]/15 text-[#E07A3A]',
        lunch: 'border-transparent bg-[#2A9D8F]/15 text-[#2A9D8F]',
        dinner: 'border-transparent bg-[#7C3AED]/15 text-[#7C3AED]',
        snack: 'border-transparent bg-neutral-500/15 text-neutral-600 dark:text-neutral-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
