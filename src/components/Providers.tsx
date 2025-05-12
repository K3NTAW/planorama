'use client';

import { ThemeProvider } from "next-themes";
import { Navbar } from "@/components/ui/navbar-menu";
import { SwipeableMain } from "@/components/SwipeableMain";
import { usePathname } from 'next/navigation';

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNavbar = pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up');

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {!hideNavbar && <Navbar />}
      <SwipeableMain>
        {children}
      </SwipeableMain>
    </ThemeProvider>
  );
} 