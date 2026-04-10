'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { indicatorClassName?: string; indicatorStyle?: React.CSSProperties }
>(({ className, value, indicatorClassName, indicatorStyle, ...props }, ref) => {
  const clampedValue = Math.min(100, Math.max(0, value ?? 0));
  return (
    <ProgressPrimitive.Root
      ref={ref}
      value={clampedValue}
      className={cn('relative h-2.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn('h-full w-full rounded-full transition-all duration-300 ease-out', indicatorClassName || (!indicatorStyle && 'bg-[#E07A3A]'))}
        style={{ transform: `translateX(-${100 - clampedValue}%)`, ...indicatorStyle }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = 'Progress';

export { Progress };
