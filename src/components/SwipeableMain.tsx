"use client";
import { useSwipeable } from "react-swipeable";
import { useRouter, usePathname } from "next/navigation";
import React from "react";

export function SwipeableMain({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const pages = ["/dashboard", "/profile"];
  const currentIndex = pages.indexOf(pathname);

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (currentIndex < pages.length - 1) {
        router.push(pages[currentIndex + 1]);
      }
    },
    onSwipedRight: () => {
      if (currentIndex > 0) {
        router.push(pages[currentIndex - 1]);
      }
    },
    trackTouch: true,
    trackMouse: false,
  });

  return (
    <main
      {...handlers}
      className="pt-32 pb-20 min-h-screen bg-brand-50 dark:bg-brand-900 text-brand-900 dark:text-brand-100"
    >
      {children}
    </main>
  );
} 