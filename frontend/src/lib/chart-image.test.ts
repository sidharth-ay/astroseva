import { describe, expect, it } from "vitest";

import { prepareChartSvg } from "./chart-image";

function makeSvg(attrs: Record<string, string>, inner = `<rect width="10" height="10"/>`): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [k, v] of Object.entries(attrs)) svg.setAttribute(k, v);
  svg.innerHTML = inner;
  return svg;
}

describe("prepareChartSvg", () => {
  it("keeps dimensions the markup already declares", () => {
    const { xml, width, height } = prepareChartSvg(
      makeSvg({ viewBox: "0 0 400 400", width: "400", height: "400" })
    );
    expect(width).toBe(400);
    expect(height).toBe(400);
    expect(xml).toContain('width="400"');
  });

  it("derives dimensions from the viewBox when attributes are missing", () => {
    // This is the reported defect: viewBox-only SVGs rasterize at the browser
    // default through <img>, producing a blank or stretched PNG.
    const { xml, width, height } = prepareChartSvg(
      makeSvg({ viewBox: "0 0 440 440" })
    );
    expect(width).toBe(440);
    expect(height).toBe(440);
    expect(xml).toContain('width="440"');
    expect(xml).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it("falls back to a square canvas with no geometry at all", () => {
    const { width, height } = prepareChartSvg(makeSvg({}));
    expect(width).toBe(800);
    expect(height).toBe(800);
  });

  it("does not mutate the on-screen chart", () => {
    const svg = makeSvg({ viewBox: "0 0 400 400" });
    prepareChartSvg(svg);
    expect(svg.getAttribute("width")).toBeNull();
  });
});
