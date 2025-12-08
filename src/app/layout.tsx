import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Awan POS",
  description: "Modern Cloud-Based POS System",
  manifest: "/manifest.json",
  themeColor: "#ffffff",
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
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
        <Toaster position="top-center" richColors />

        {/* Service Worker Registration */}
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                  .then((registration) => {
                    console.log('SW registered:', registration);
                  })
                  .catch((error) => {
                    console.log('SW registration failed:', error);
                  });
              });
            }
          `
        }} />
      </body>
    </html>
  );
}
