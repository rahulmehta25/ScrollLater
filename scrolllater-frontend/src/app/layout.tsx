import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ScrollLater - Save Content for Later",
    template: "%s | ScrollLater"
  },
  description: "Capture, organize, and schedule your ideas with AI-powered insights. A smart productivity platform for content management.",
  keywords: ["productivity", "content management", "scheduling", "AI", "bookmarks", "read later", "task management"],
  authors: [{ name: "ScrollLater Team" }],
  creator: "ScrollLater Team",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://scrolllater.app",
    title: "ScrollLater - Save Content for Later",
    description: "Capture, organize, and schedule your ideas with AI-powered insights.",
    siteName: "ScrollLater",
  },
  twitter: {
    card: "summary_large_image",
    title: "ScrollLater - Save Content for Later",
    description: "Capture, organize, and schedule your ideas with AI-powered insights.",
    creator: "@scrolllater",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ScrollLater",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0ea5e9" },
    { media: "(prefers-color-scheme: dark)", color: "#0369a1" }
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ScrollLater" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className="font-sans antialiased transition-theme">
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
