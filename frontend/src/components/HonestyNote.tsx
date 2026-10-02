"use client";

import type { ReactNode } from "react";

/**
 * A one-line honesty note for pages that look more functional than they are.
 *
 * Several pages present content that has no backend behind it yet (sample
 * discussions, a product catalog without checkout, device-local records). The
 * alternative to stating that plainly is letting a user believe the feature
 * works -- discovering otherwise is worse than reading one sentence up front.
 */
export default function HonestyNote({ children }: { children: ReactNode }) {
  return (
    <p
      className="max-w-lg mx-auto text-xs mt-2"
      style={{ color: "var(--text-tertiary)", lineHeight: 1.6 }}
    >
      {children}
    </p>
  );
}
