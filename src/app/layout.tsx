import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "Awan POS",
  description: "Modern Cloud-Based POS System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Awan POS",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* apple-touch-icon not injected by Next.js metadata API */}
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
        <Toaster position="top-center" richColors />

        {/* Service Worker registration */}
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                  .then(function(r) { console.log('SW registered:', r.scope); })
                  .catch(function(e) { console.log('SW registration failed:', e); });
              });
            }
          `
        }} />
      </body>
    </html>
  );
}
