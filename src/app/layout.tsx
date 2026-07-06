import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { getUserTheme } from "@/lib/userTheme";

export const metadata: Metadata = {
  title: "Chapterhouse",
  description: "A self-hosted reading club for you and your friends.",
  manifest: "/manifest.webmanifest",
  // iOS ignores the manifest for home-screen launch behavior; these opt it into
  // a standalone, full-screen app shell. The icon comes from app/apple-icon.png.
  appleWebApp: {
    capable: true,
    title: "Chapterhouse",
    statusBarStyle: "default",
  },
  // Next emits the modern `mobile-web-app-capable`, but iOS Safari still keys
  // standalone home-screen launch off the apple-prefixed meta. Add it directly.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#6b4423", // accent-dark — colors the status bar / toolbar
  // Standalone reading app: lock the viewport so pages don't pinch-zoom.
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const theme = await getUserTheme();
  return (
    <html lang="en" data-theme={theme}>
      <body className="min-h-screen font-serif">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
