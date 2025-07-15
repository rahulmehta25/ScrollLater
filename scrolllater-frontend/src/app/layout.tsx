import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import SessionRestorer from "@/components/auth/SessionRestorer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ScrollLater - Capture and Schedule Your Ideas",
  description: "A mobile-first platform to capture links, ideas, and tasks from various sources and intelligently schedule time to revisit them.",
  keywords: "productivity, content management, scheduling, AI, bookmarks",
  authors: [{ name: "ScrollLater Team" }],
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <SessionRestorer />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
