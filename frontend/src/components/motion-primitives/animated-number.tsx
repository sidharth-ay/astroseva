'use client';
/* eslint-disable react-hooks/static-components -- motionFor() returns a cached, stable component (see motion-component.ts), so nothing here is actually recreated per render; the rule cannot see through the cache lookup. */
import { cn } from '@/lib/utils';
import { SpringOptions, useSpring, useTransform } from 'motion/react';
import { useEffect } from 'react';
import { motionFor } from './motion-component';

export type AnimatedNumberProps = {
  value: number;
  className?: string;
  springOptions?: SpringOptions;
  as?: keyof React.JSX.IntrinsicElements;
};

export function AnimatedNumber({
  value,
  className,
  springOptions,
  as = 'span',
}: AnimatedNumberProps) {
  // See motion-component.ts: cached and stable, so not recreated per render.
  const MotionComponent = motionFor(as);

  const spring = useSpring(value, springOptions);
  const display = useTransform(spring, (current) =>
    Math.round(current).toLocaleString()
  );

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return (
    <MotionComponent className={cn('tabular-nums', className)}>
      {display}
    </MotionComponent>
  );
}
