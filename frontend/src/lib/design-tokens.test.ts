import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * AstroSeva has ONE permanent visual theme: warm ivory surfaces with
 * intentional dark-navy bands. There is no dark mode, no toggle, and no
 * `data-theme` override -- the machinery for all three was deleted, and this
 * asserts it stays deleted:
 *
 * 1. No `data-theme` blocks may exist in the stylesheet. A second theme
 *    cannot drift back in one override at a time.
 * 2. Every semantic token the pages reach for must be defined in `:root`.
 * 3. Raw colours in page components may only shrink. The audit found 605 raw
 *    hex/rgba occurrences across the pages; that number goes down as phases
 *    migrate pages onto tokens, never up.
 */

const FRONTEND_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const APP_DIR = join(FRONTEND_ROOT, "src", "app");

function definedVars(css: string): Set<string> {
  const names = new Set<string>();
  const varRe = /--([a-z][a-z0-9-]*)\s*:/g;
  let match: RegExpExecArray | null;
  while ((match = varRe.exec(css)) !== null) names.add(match[1]);
  return names;
}

// Every token a page reaches for through var(--...). If a future token joins
// this list it belongs in `:root` unconditionally -- there is no second theme
// to pair it with.
const REQUIRED_TOKENS = [
  "bg-primary",
  "bg-card",
  "bg-elevated",
  "bg-surface",
  "input-bg",
  "nav-bg",
  "on-dark",
  "on-dark-dim",
  "on-dark-faint",
  "border",
  "border-subtle",
  "border-active",
  "text-primary",
  "text-secondary",
  "text-tertiary",
  "accent",
  "accent-text",
  "accent-deep",
  "danger",
  "success",
  "shimmer-hi",
  "scrollbar",
  "scrollbar-hover",
  "shadow-sm",
  "shadow-md",
  "shadow-lg",
  "gold",
  "gold-bright",
  "gold-dim",
  "gold-glow",
  "champagne",
  "midnight",
  "indigo",
  "plum",
];

describe("design tokens", () => {
  it("has exactly one theme and no theme-switching machinery", () => {
    const css = readFileSync(join(APP_DIR, "globals.css"), "utf-8");
    expect(css, "a data-theme override reappeared in globals.css").not.toMatch(
      /\[data-theme=/,
    );
    expect(css, "a data-theme override reappeared in globals.css").not.toMatch(
      /dataset\.theme/,
    );
    const vars = definedVars(css);
    for (const token of REQUIRED_TOKENS) {
      expect(vars.has(token), `--${token} is not defined in :root`).toBe(true);
    }
  });

  it("lets the raw-colour debt in pages only shrink", () => {
    const pages: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (entry === "page.tsx") pages.push(full);
      }
    };
    walk(APP_DIR);

    let total = 0;
    for (const page of pages) {
      const text = readFileSync(page, "utf-8").toLowerCase();
      const hex = (text.match(/#[0-9a-f]{3,8}\b/g) ?? []).length;
      const func = (text.match(/rgba?\(/g) ?? []).length;
      total += hex + func;
    }

    // Audited at the redesign start: 48 of 52 pages, 605 occurrences, almost
    // all of it the gold accent ramp. Lower this number as phases migrate
    // pages onto tokens; never raise it.
    expect(pages.length).toBeGreaterThan(0);
    expect(total, `raw colours in pages grew (was 605): migrate to tokens instead`).toBeLessThanOrEqual(
      605,
    );
  });
});
