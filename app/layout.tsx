import type { Metadata } from "next";
import { Inter, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/app/context/ThemeContext";
import { LanguageProvider } from "@/app/context/LanguageContext";

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
        {/* Inline script runs synchronously before first paint — prevents theme flash.
            Must be a raw <script> tag in a Server Component, not next/script.
            suppressHydrationWarning prevents React mismatch on data-theme attribute. */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('rakshanet_theme')||'dark';var r=s==='system'?(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):s;document.documentElement.setAttribute('data-theme',r);document.documentElement.style.colorScheme=r;}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
