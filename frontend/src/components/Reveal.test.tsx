import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

import Reveal from "./Reveal";

type Callback = (entries: { isIntersecting: boolean }[]) => void;

let observerCallback: Callback | null = null;
const observe = vi.fn();
const disconnect = vi.fn();

function installObserver() {
  observerCallback = null;
  // A `function` expression, not an arrow: the component constructs it with
  // `new`, and arrow functions are not constructible.
  (window as unknown as Record<string, unknown>).IntersectionObserver = vi.fn(function (
    this: unknown,
    cb: Callback,
  ) {
    observerCallback = cb;
    return { observe, disconnect, unobserve: vi.fn() };
  });
}

function fireIntersecting() {
  act(() => {
    observerCallback?.([{ isIntersecting: true }]);
  });
}

describe("Reveal", () => {
  beforeEach(() => {
    installObserver();
    observe.mockClear();
    disconnect.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts hidden and reveals once the element enters the viewport", () => {
    render(
      <Reveal>
        <p>hello</p>
      </Reveal>,
    );
    const wrapper = screen.getByText("hello").parentElement as HTMLElement;
    expect(wrapper.className).toContain("reveal");
    expect(wrapper.className).not.toContain("is-visible");
    expect(observe).toHaveBeenCalledTimes(1);

    fireIntersecting();
    expect(wrapper.className).toContain("is-visible");
    expect(disconnect).toHaveBeenCalled();
  });

  it("applies the stagger delay as a CSS variable", () => {
    render(
      <Reveal delay={160}>
        <p>delayed</p>
      </Reveal>,
    );
    const wrapper = screen.getByText("delayed").parentElement as HTMLElement;
    expect(wrapper.style.getPropertyValue("--reveal-delay")).toBe("160ms");
  });

  it("renders visible immediately under reduced motion", () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    vi.stubGlobal("matchMedia", matchMedia);
    try {
      render(
        <Reveal>
          <p>calm</p>
        </Reveal>,
      );
      const wrapper = screen.getByText("calm").parentElement as HTMLElement;
      expect(wrapper.className).toContain("is-visible");
      expect(observe).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
