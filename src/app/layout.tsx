import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/components/Providers";
import dynamic from "next/dynamic";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: 'Planorama',
  icons: {
    icon: '/planorama-logo.png',
  },
};

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
        <meta name="theme-color" content="#f9fafb" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#18181B" media="(prefers-color-scheme: dark)" />
        <link rel="apple-touch-icon" sizes="180x180" href="/planorama-logo.png" />
      </head>
      <body className={`${inter.variable} antialiased bg-background dark:bg-background min-h-screen`}>
        <ClerkProvider>
          <Providers>
            <div className="px-4 sm:px-6 md:px-8 w-full">
              {children}
            </div>
          </Providers>
        </ClerkProvider>
        {/* Mobile bottom nav */}
        <AppMobileNav />
      </body>
    </html>
  );
}
