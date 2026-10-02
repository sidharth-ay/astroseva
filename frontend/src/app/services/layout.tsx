import type { Metadata } from "next";
import type { ReactNode } from "react";

// Server-rendered metadata for this route. The page itself is a client
// component (it needs interactivity), so it cannot export metadata directly;
// this layout carries the title and description instead, so crawlers and link
// previews see them without running JavaScript.
export const metadata: Metadata = {
  title: "Services",
  description: "Astrology services: consultations, reports, and guidance.",
  robots: { index: false },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
