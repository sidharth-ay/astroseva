/**
 * Prepare a rendered chart SVG for rasterization.
 *
 * `shareImage` serializes the on-screen chart, loads it through `<img>`, and
 * draws it to canvas. That pipeline only works if the serialized SVG carries
 * intrinsic dimensions: without `width`/`height` an `<img>`-loaded SVG
 * rasterizes at the browser default (300x150) or fails outright, and the canvas
 * ends up stretched or blank -- which is exactly the reported "share image
 * not working" defect. The tags now carry dimensions, but this clones and
 * re-asserts them so the export never depends on markup staying in sync.
 */
export function prepareChartSvg(svg: SVGSVGElement): {
  xml: string;
  width: number;
  height: number;
} {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const parts = (clone.getAttribute("viewBox") || "").trim().split(/\s+/);
  const viewWidth = Number(parts[2]);
  const viewHeight = Number(parts[3]);
  const width =
    Number(clone.getAttribute("width")) ||
    (Number.isFinite(viewWidth) && viewWidth > 0 ? viewWidth : 800);
  const height =
    Number(clone.getAttribute("height")) ||
    (Number.isFinite(viewHeight) && viewHeight > 0 ? viewHeight : 800);
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return {
    xml: new XMLSerializer().serializeToString(clone),
    width,
    height,
  };
}
