import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/components/Providers";
import dynamic from "next/dynamic";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial'],
});

export const metadata = {
  title: 'Planorama',
  icons: {
    icon: '/planorama-logo.png',
  },
  manifest: '/manifest.json',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9fafb' },
    { media: '(prefers-color-scheme: dark)', color: '#18181B' },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Planorama',
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased bg-background min-h-screen`}>
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
