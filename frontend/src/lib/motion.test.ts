import { describe, expect, it } from "vitest";

import type { Variants } from "motion/react";

import {
  MAX_STAGGER_DELAY,
  duration,
  stagger,
  staggerContainer,
  staggerContainerCustom,
} from "./motion";

function transitionOf(variants: Variants) {
  const visible = variants.visible as { transition?: Record<string, number> };
  return visible.transition ?? {};
}

function delayOf(variants: Variants): number {
  return transitionOf(variants).delayChildren ?? 0;
}

function stepOf(variants: Variants): number {
  return transitionOf(variants).staggerChildren ?? 0;
}

/**
 * These numbers are a perceived-latency budget, not decoration.
 *
 * A page became interactive roughly 150 ms after the URL changed, but the
 * stagger (0.08-0.12 per child) combined with a 0.3s fade meant a ten-card grid
 * was still fading in about a second later. That gap is why the app felt slow
 * to use even though nothing was being waited on: the page looked like it was
 * still loading long after it was ready.
 *
 * The budgets below are what "long enough to read as motion, short enough not
 * to look like waiting" means for this design. They are asserted rather than
 * documented because a later "let's make it feel more premium" tweak is exactly
 * how this regressed in the first place -- nothing broke, it just got slow.
 */

/** Longest a single staggered child may add before the previous one starts. */
const MAX_STAGGER_STEP = 0.05;
/**
 * Enter animations come in two tiers. `normal` covers almost everything a user
 * sees on a page -- headings, cards, list rows -- and is held tight. `slow` and
 * `cinematic` are reserved for a one-off hero reveal, where a longer curve is
 * the point, but they still get a ceiling so they cannot quietly become the
 * default.
 */
const MAX_STANDARD_DURATION = 0.25;
const MAX_EXPRESSIVE_DURATION = 0.8;
/**
 * A grid of `MAX_GRID_ITEMS` cards is the worst case on the feature pages. Its
 * last card must land within this, or the page reads as still loading: before
 * this budget the same grid took about 1.2s, plus up to 0.3s of delay before it
 * started.
 */
const MAX_GRID_ITEMS = 12;
const MAX_GRID_TOTAL_S = 0.7;

describe("motion timing budget", () => {
  it("keeps per-child stagger under the perceptual threshold", () => {
    for (const [name, value] of Object.entries(stagger)) {
      expect(value, `stagger.${name} is ${value}s`).toBeLessThanOrEqual(MAX_STAGGER_STEP);
    }
  });

  it("keeps enter animations short", () => {
    for (const name of ["instant", "fast", "normal"] as const) {
      expect(duration[name], `duration.${name} is ${duration[name]}s`).toBeLessThanOrEqual(
        MAX_STANDARD_DURATION,
      );
    }
    // `slow` is used by the larger side/reveal transitions and `cinematic` by
    // hero-scale ones, so both are allowed to breathe -- within a ceiling.
    for (const name of ["slow", "cinematic"] as const) {
      expect(duration[name], `duration.${name} is ${duration[name]}s`).toBeLessThanOrEqual(
        MAX_EXPRESSIVE_DURATION,
      );
    }
  });

  it("finishes a full grid inside the budget", () => {
    const total = stepOf(staggerContainer) * (MAX_GRID_ITEMS - 1) + duration.normal;
    expect(total, `a ${MAX_GRID_ITEMS}-card grid takes ${total.toFixed(2)}s`).toBeLessThanOrEqual(
      MAX_GRID_TOTAL_S,
    );
  });

  it("clamps the pre-roll delay a page asks for", () => {
    // The home services grid asked for 0.3s and several pages for 0.1s. Before
    // the clamp that value was passed straight through, so the container sat
    // empty for a third of a second after the route had already changed.
    expect(delayOf(staggerContainerCustom(0.04, 0.3))).toBeLessThanOrEqual(MAX_STAGGER_DELAY);
    expect(delayOf(staggerContainerCustom(0.04, 0.1))).toBeLessThanOrEqual(MAX_STAGGER_DELAY);
    // A negative delay is nonsense, and Framer Motion treats it as an error
    // rather than as zero, so it is clamped up rather than passed through.
    expect(delayOf(staggerContainerCustom(0.04, -1))).toBe(0);
    // The default and a deliberate small delay are both honoured as given.
    expect(delayOf(staggerContainerCustom(0.04))).toBe(0);
    expect(delayOf(staggerContainerCustom(0.04, 0.02))).toBe(0.02);
    // The stagger step itself is the caller's business and is not clamped.
    expect(stepOf(staggerContainerCustom(0.07))).toBe(0.07);
  });
});