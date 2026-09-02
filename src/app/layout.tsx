import type { Metadata, Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";
import { OfflineIndicator } from "@/components/ui/OfflineIndicator";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { PostHogProvider } from "@/components/analytics/PostHogProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "ScrollLater | Save it. Schedule it. Actually read it.",
  description: "A quiet reading room for the internet. Save articles, videos, and ideas, then schedule time to actually finish them.",
  keywords: "productivity, content curation, bookmarks, read later, scheduling, reading list",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ScrollLater",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "ScrollLater",
    title: "ScrollLater | Save it. Schedule it. Actually read it.",
    description: "A quiet reading room for the internet. Save articles, videos, and ideas, then schedule time to actually finish them.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ScrollLater",
    description: "Save it. Schedule it. Actually read it.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#F7F4EF",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.variable} ${newsreader.variable} font-sans antialiased bg-paper text-ink`}>
        <AuthProvider>
          <ToastProvider>
            {children}
            <OfflineIndicator />
          </ToastProvider>
        </AuthProvider>
        <ServiceWorkerRegistration />
        <InstallPrompt />
        <Analytics />
        <SpeedInsights />
        <PostHogProvider />
      </body>
    </html>
  );
}
