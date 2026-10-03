import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The Phase 1 redesign made theming a property of the token layer: every
 * semantic surface/text/border token is defined once for light and once for
 * dark, and the 52 pages follow automatically through `var(--...)`. Two things
 * would silently re-darken or re-lighten the app, and both are asserted here:
 *
 * 1. A token defined for only one theme. The page renders in one theme and
 *    inherits a stale value in the other -- typically unreadable text -- and
 *    nothing in tsc, lint, or the browser console says so.
 * 2. Raw colours creeping back into page components. The audit found 605 raw
 *    hex/rgba occurrences across the pages; that number may only shrink as
 *    phases migrate pages onto tokens, never grow.
 */

const FRONTEND_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const APP_DIR = join(FRONTEND_ROOT, "src", "app");

function themeBlocks(css: string): { light: string; dark: string } {
  // `:root { ... }` appears twice (tokens + geometry); merge every
  // non-dark :root block as the light/default side.
  const light: string[] = [];
  let dark = "";
  const blockRe = /:root(?:\[data-theme="dark"\])?\s*\{([^}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(css)) !== null) {
    if (match[0].startsWith(":root[")) dark += match[1];
    else light.push(match[1]);
  }
  return { light: light.join("\n"), dark };
}

function definedVars(block: string): Set<string> {
  const names = new Set<string>();
  const varRe = /--([a-z][a-z0-9-]*)\s*:/g;
  let match: RegExpExecArray | null;
  while ((match = varRe.exec(block)) !== null) names.add(match[1]);
  return names;
}

// Every token a page reaches for through var(--...). If a future token joins
// this list it belongs here too, in both themes.
const SEMANTIC_TOKENS = [
  "bg-primary",
  "bg-card",
  "bg-elevated",
  "bg-surface",
  "input-bg",
  "nav-bg",
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
];

describe("design tokens", () => {
  it("defines every semantic token in both themes", () => {
    const css = readFileSync(join(APP_DIR, "globals.css"), "utf-8");
    const { light, dark } = themeBlocks(css);
    expect(dark.length, "no :root[data-theme=dark] block found").toBeGreaterThan(0);
    const lightVars = definedVars(light);
    const darkVars = definedVars(dark);
    for (const token of SEMANTIC_TOKENS) {
      expect(lightVars.has(token), `--${token} missing from the light/default theme`).toBe(true);
      expect(darkVars.has(token), `--${token} missing from the dark theme`).toBe(true);
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

    // Audited at the Phase 1 commit: 48 of 52 pages, 605 occurrences, almost
    // all of it the gold accent ramp. Lower this number as phases migrate
    // pages onto tokens; never raise it.
    expect(pages.length).toBeGreaterThan(0);
    expect(total, `raw colours in pages grew (was 605): migrate to tokens instead`).toBeLessThanOrEqual(
      605,
    );
  });
});
