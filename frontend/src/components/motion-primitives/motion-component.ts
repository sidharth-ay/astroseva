'use client';

import { motion } from 'motion/react';

/**
 * A stable motion wrapper for a host element (`'div'`, `'p'`, `'span'`, ...).
 *
 * Calling `motion.create` inside a component body builds a new component type
 * on every render, which unmounts and remounts the whole subtree -- animations
 * restart and any state inside is lost. A module-level cache keyed by element
 * name gives a stable identity for the application's lifetime, which is also
 * what the `react/no-unstable-nested-components` rule requires: no component
 * creation during render at all. Every caller in this codebase passes a host
 * string (no caller overrides `as` at all), so the cache holds a handful of
 * entries.
 *
 * The trade-off is stated plainly: a value-keyed cache cannot preserve the
 * per-element prop types an inline `motion.create('div')` carries, so the
 * cached component is typed as accepting `Record<string, unknown>` props. A
 * typo in a motion prop will not fail the build here -- but previously these
 * call sites were annotated `any`, which checked nothing at all, so this is
 * strictly more honest about what is and is not verified.
 */
const cache = new Map<string, React.ComponentType<Record<string, unknown>>>();

export function motionFor(as: string) {
  let component = cache.get(as);
  if (!component) {
    component = motion.create(as as keyof React.JSX.IntrinsicElements);
    cache.set(as, component);
  }
  return component;
}
