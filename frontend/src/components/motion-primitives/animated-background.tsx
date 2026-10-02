'use client';
import { cn } from '@/lib/utils';
import { AnimatePresence, Transition, motion } from 'motion/react';
import {
  Children,
  cloneElement,
  isValidElement,
  ReactElement,
  type ReactNode,
  useState,
  useId,
} from 'react';

export type AnimatedBackgroundProps = {
  children:
    | ReactElement<{ 'data-id': string }>[]
    | ReactElement<{ 'data-id': string }>;
  defaultValue?: string;
  onValueChange?: (newActiveId: string | null) => void;
  className?: string;
  transition?: Transition;
  enableHover?: boolean;
};

export function AnimatedBackground({
  children,
  defaultValue,
  onValueChange,
  className,
  transition,
  enableHover = false,
}: AnimatedBackgroundProps) {
  const [activeId, setActiveId] = useState<string | null>(defaultValue ?? null);
  const uniqueId = useId();

  const handleSetActiveId = (id: string | null) => {
    setActiveId(id);

    if (onValueChange) {
      onValueChange(id);
    }
  };

  // Syncs the controlled value into state during render rather than in an
  // effect: the previous version called setState unconditionally inside
  // useEffect, which the linter flags and which costs an extra render.
  const [prevDefault, setPrevDefault] = useState(defaultValue);
  if (prevDefault !== defaultValue) {
    setPrevDefault(defaultValue);
    if (defaultValue !== undefined) setActiveId(defaultValue);
  }

  // Every prop this component reads from or writes onto a child, in one
  // place. The public `children` type stays narrow (callers only promise
  // `data-id`); internally the element is viewed through this wider lens
  // because the component also reads `className`/`children` and writes
  // `data-checked` plus the interaction handlers.
  type ChildProps = {
    "data-id"?: string;
    className?: string;
    children?: ReactNode;
    "data-checked"?: string;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onClick?: () => void;
  };

  return Children.map(children, (child, index) => {
    if (!isValidElement(child)) return child;
    const element = child as ReactElement<ChildProps>;
    const id = element.props["data-id"] ?? null;

    const interactionProps = enableHover
      ? {
          onMouseEnter: () => handleSetActiveId(id),
          onMouseLeave: () => handleSetActiveId(null),
        }
      : {
          onClick: () => handleSetActiveId(id),
        };

  return cloneElement(
    element,
    {
      key: index,
      className: cn('relative inline-flex', element.props.className),
      'data-checked': activeId === id ? 'true' : 'false',
      ...interactionProps,
    },
    <>
      <AnimatePresence initial={false}>
        {activeId === id && (
          <motion.div
            layoutId={`background-${uniqueId}`}
            className={cn('absolute inset-0', className)}
            transition={transition}
            initial={{ opacity: defaultValue ? 1 : 0 }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
          />
        )}
      </AnimatePresence>
      <div className='z-10'>{element.props.children}</div>
    </>
  );
});
}
