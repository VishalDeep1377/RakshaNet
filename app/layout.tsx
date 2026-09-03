import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/app/context/ThemeContext";
import { LanguageProvider } from "@/app/context/LanguageContext";
import InstallPWA from "@/app/components/InstallPWA";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#FF0033",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
};

export const metadata: Metadata = {
  title: "RakshaNet SilentShield — Privacy-First AI Safety Network",
  description:
    "A privacy-first AI safety network that detects silent distress, coordinates the right responder, preserves trustworthy evidence, and prevents the next incident. India's intelligent layer above 112 ERSS.",
  keywords: [
    "women safety",
    "AI safety",
    "SilentShield",
    "RakshaNet",
    "emergency response",
    "India 112",
    "silent SOS",
  ],
  openGraph: {
    title: "RakshaNet SilentShield",
    description:
      "From Panic Button to Intelligent Response Network. Privacy-first AI safety for every woman.",
    type: "website",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RakshaNet",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} ${jetbrainsMono.variable}`}
      data-scroll-behavior="smooth"
      // suppressHydrationWarning is needed because data-theme is set
      // by ThemeScript before React hydrates (prevents mismatch warning)
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="RakshaNet" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        {/* Inline script runs synchronously before first paint — prevents theme flash. */}
        <Script
          id="theme-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('rakshanet_theme')||'dark';var r=s==='system'?(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):s;document.documentElement.setAttribute('data-theme',r);document.documentElement.style.colorScheme=r;}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`,
          }}
        />
        {/* Capture beforeinstallprompt BEFORE React loads so the event is never missed */}
        <Script
          id="pwa-capture"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.__pwaPrompt = null;
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                window.__pwaPrompt = e;
                // Notify any already-mounted React listeners
                window.dispatchEvent(new Event('pwa-prompt-ready'));
              });
              // Register service worker
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(){});
                });
              }
            `,
          }}
        />
        <ThemeProvider>
          <LanguageProvider>
            {children}
            <InstallPWA />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
