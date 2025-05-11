'use client';
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Navbar } from "@/components/ui/navbar-menu";
import { ThemeProvider } from "next-themes";
import { SwipeableMain } from "@/components/SwipeableMain";
import { usePathname } from 'next/navigation';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const hideNavbar = pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up');

  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body className={`${inter.variable} antialiased bg-brand-50 dark:bg-brand-900 min-h-screen`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ClerkProvider>
            {!hideNavbar && <Navbar />}
            <SwipeableMain>
              {children}
            </SwipeableMain>
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
