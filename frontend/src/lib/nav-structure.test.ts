import { describe, expect, it } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { NAV_SECTIONS, NAV_ITEMS, LOGOUT_LABEL } from "../components/NavDrawer";

/**
 * Every drawer link must resolve to a real page. A menu entry that 404s is a
 * promise the product cannot keep, and it fails silently -- the drawer looks
 * complete while the destination does not exist. This walks the route tree
 * the same way Next does and fails the suite if any href stops resolving.
 *
 * Items with no honest destination (notes, birth-time rectification, FAQs)
 * are omitted from NAV_SECTIONS on purpose rather than linked at the nearest
 * page; that decision is documented in the component and must not be
 * "fixed" by pointing them somewhere plausible.
 */

function collectRoutes(dir: string, base: string): string[] {
  const routes: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      routes.push(...collectRoutes(full, `${base}/${entry}`));
    } else if (entry === "page.tsx") {
      routes.push(base === "" ? "/" : base);
    }
  }
  return routes;
}

function matches(route: string, href: string): boolean {
  // Query strings (?tab=, ?category=, ?mode=) select state on the destination
  // page; the route beneath them is what must exist.
  const path = href.split("?")[0];
  if (!path.startsWith("/")) return false;
  // Escape regex syntax first, then turn Next dynamic segments into wildcards.
  const pattern = new RegExp(
    `^${route.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\\\[[^\]]*\\\]/g, "[^/]+")}$`,
  );
  return pattern.test(path);
}

describe("drawer navigation structure", () => {
  it("offers exactly the nine account destinations, each once", () => {
    // The menu is a fixed promise: eight links plus Logout. A duplicate or a
    // quietly re-added subsection means the decision was undone.
    expect(NAV_ITEMS).toEqual([
      "My Kundali",
      "Profile",
      "Horoscope",
      "Dosha Check",
      "Remedies",
      "Notifications",
      "Help & Support",
      "Settings",
    ]);
    expect(LOGOUT_LABEL).toBe("Logout");
    expect(new Set(NAV_ITEMS).size).toBe(NAV_ITEMS.length);
    expect(new Set(NAV_SECTIONS.map((s) => s.id)).size).toBe(NAV_SECTIONS.length);
  });

  it("groups the links under Astrology and Account only", () => {
    expect(NAV_SECTIONS.map((s) => s.title)).toEqual(["Astrology", "Account"]);
  });

  it("lists only non-empty sections with labeled, iconed links", () => {
    expect(NAV_SECTIONS.length).toBeGreaterThan(0);
    for (const section of NAV_SECTIONS) {
      expect(section.title.trim().length).toBeGreaterThan(0);
      expect(section.links.length).toBeGreaterThan(0);
      for (const link of section.links) {
        expect(link.label.trim().length).toBeGreaterThan(0);
        expect(link.Icon).toBeTruthy();
      }
    }
  });

  it("resolves every href to a real page", () => {
    const appDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "app");
    const routes = collectRoutes(appDir, "");
    expect(routes.length).toBeGreaterThan(0);
    const dead: string[] = [];
    for (const section of NAV_SECTIONS) {
      for (const link of section.links) {
        if (!routes.some((route) => matches(route, link.href))) {
          dead.push(`${section.title} / ${link.label} -> ${link.href}`);
        }
      }
    }
    expect(dead, `drawer links with no destination page: ${dead.join("; ")}`).toEqual([]);
  });
});
