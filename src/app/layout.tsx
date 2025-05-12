import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/components/Providers";
import dynamic from "next/dynamic";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const AppMobileNav = dynamic(() => import("@/components/ui/AppMobileNav").then(mod => mod.AppMobileNav), { ssr: false });

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body className={`${inter.variable} antialiased bg-brand-50 dark:bg-brand-900 min-h-screen`}>
        <ClerkProvider>
          <Providers>
            {children}
          </Providers>
        </ClerkProvider>
        {/* Mobile bottom nav */}
        <AppMobileNav />
      </body>
    </html>
  );
}
