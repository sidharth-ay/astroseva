import type { Metadata } from "next";
import type { ReactNode } from "react";

// Server-rendered metadata for this route. The page itself is a client
// component (it needs interactivity), so it cannot export metadata directly;
// this layout carries the title and description instead, so crawlers and link
// previews see them without running JavaScript.
export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of service for using AstroSeva.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
