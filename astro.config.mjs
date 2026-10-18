import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Der Dev-Server liefert für Ordner in public/ kein index.html aus (Apache schon).
// Damit /admin auch bei `npm run dev` funktioniert:
const adminDevIndex = {
  name: 'admin-dev-index',
  hooks: {
    'astro:server:setup': ({ server }) => {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/admin' || req.url === '/admin/') req.url = '/admin/index.html';
        next();
      });
    },
  },
};

export default defineConfig({
  site: 'https://dukes.ch',
  integrations: [adminDevIndex],
  // Alte Unterseiten zeigen auf die Abschnitte der Startseite
  // (zusätzlich als echte 301-Weiterleitung in public/.htaccess)
  redirects: {
    '/restaurant': '/#bereiche',
    '/wochenmenu': '/#wochenmenu',
    '/wochenmenue': '/#wochenmenu',
    '/lokal-mieten': '/#lokal-mieten',
    '/kontakt': '/#lokal-mieten',
    '/ueber-uns': '/',
  },
  // Kein Code-Highlighting nötig (Shiki nutzt Inline-Styles, die die CSP blockieren würde)
  markdown: { syntaxHighlight: false },
  security: {
    // Content-Security-Policy als <meta> in jeder Seite. Astro ergänzt script-src/style-src
    // mit Hashes der eigenen Skripte – eingeschleuste Skripte werden vom Browser blockiert.
    // Header, die per <meta> nicht gehen (frame-ancestors, HSTS …), stehen in public/.htaccess.
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self'",
        "font-src 'self'",
        "connect-src 'self'",
        "frame-src https://bookingwidget.local.ch",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
    // Keine data:-URIs für Assets, damit img-src/font-src 'self' reicht
    build: { assetsInlineLimit: 0 },
  },
});
