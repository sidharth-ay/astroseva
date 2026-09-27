"use client";

import { ScrollProgress } from "@/components/motion-primitives/scroll-progress";

export default function ScrollProgressBar() {
  return (
    <ScrollProgress className="fixed top-0 left-0 right-0 z-[100] h-[3px] origin-left bg-gradient-to-r from-[#C8956D] via-[#E8B88A] to-[#D4A574]" />
  );
}
