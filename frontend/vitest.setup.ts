// Adds the jest-dom matchers (`toBeInTheDocument`, `toHaveTextContent`) to
// Vitest's `expect`. Vitest does not read jest-dom's own setup file the way Jest
// does, so without this every DOM assertion would have to be written by hand.
import "@testing-library/jest-dom/vitest";