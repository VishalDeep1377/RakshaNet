/**
 * Inline script that runs BEFORE React hydrates.
 * Prevents flash of wrong theme on first paint.
 * Place this in the <head> of your root layout.
 */
import Script from "next/script";

export const ThemeScript = () => (
  <Script
    id="rakshanet-theme-script"
    strategy="beforeInteractive"
    dangerouslySetInnerHTML={{
      __html: `
(function() {
  try {
    var stored = localStorage.getItem('rakshanet_theme') || 'dark';
    var resolved = stored;
    if (stored === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.style.colorScheme = resolved;
  } catch(e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
      `.trim(),
    }}
  />
);
