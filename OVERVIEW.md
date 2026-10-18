# dukes.ch – Overview

Static website built with **Astro** + **Tailwind**. Content (events, weekly menu) is edited in **Sveltia CMS** at `dukes.ch/admin`. No database, no server code: the server only serves plain files.

```
Editor (Sveltia /admin) ──commit──▶ GitHub (main) ──Actions: npm run build──▶ dist/ ──rsync──▶ Apache (dukes.ch)
```

## Codebase

| Path | What |
|---|---|
| `src/pages/` | Pages: `index.astro` (home: areas, Wochenmenü, events, Lokal mieten), `veranstaltungen.astro` (all events) |
| `src/components/` | Building blocks: `Navbar`, `Footer`, `EventCard`, `WeeklyMenu`, `FlyerDialog` (flyer viewer), `ReservationDialog` (myLocalina, currently off) |
| `src/layouts/Layout.astro` | Page frame (head, nav, footer) |
| `src/content/` | **The content** – one Markdown file per event / per week. Written by the CMS. |
| `src/content.config.ts` | Schema for that content (fields, types, limits). Bad data fails the build instead of going live. |
| `src/lib/content.ts` | Helpers: current week's menu, sorted events, date formatting |
| `src/data/nav.ts` | Menu entries, phone/e-mail/address |
| `public/` | Copied 1:1 to the site: images, `events/` (flyers), `admin/`, `.htaccess` |
| `scripts/copy-cms.mjs` | Copies Sveltia from `node_modules` into `public/admin/vendor/` (runs before dev/build) |
| `.github/workflows/deploy.yml` | Build + upload on every push to `main` and daily 04:00 UTC (so past events disappear, new menu shows) |
| `astro.config.mjs` | Site config, redirects for old URLs, Content-Security-Policy |
| `security_info.md` | Security notes (CMS login, tokens) |

Dev: `npm run dev` → http://localhost:4321 (CMS at `/admin`). Build: `npm run build` → `dist/`.

## Sveltia CMS – how it works

- `/admin` is a single static page that loads Sveltia (a JS app) in the browser.
- You log in with GitHub. Sveltia reads and writes the Markdown files in `src/content/` **directly in the GitHub repo** – every "Save" is a commit.
- That commit triggers the GitHub Action → site is rebuilt and uploaded (≈1–2 min).
- Nothing runs on our server; the server never sees a login.

### Files in `public/admin/`

| File | Why |
|---|---|
| `index.html` | Loads Sveltia. Has its own strict CSP (scripts only from dukes.ch). Contains an import map (see below). |
| `config.yml` | Tells Sveltia which collections exist (Veranstaltungen, Wochenmenü), their fields, and where files go. |
| `dukes-cms.js` | Our extensions: **`swissdate`** field (enter dates as DD/MM/YYYY, stored as YYYY-MM-DD) and the **Wochenmenü preview** with the "Drucken" button. |
| `vendor/` | *Generated, not in git.* Sveltia + its lazy-loaded parts (react-dom, immutable), self-hosted so no code is loaded from external CDNs. |

**Why the import map:** Sveltia fetches the `immutable` library from unpkg.com, which the CSP blocks. The import map redirects that URL to `/admin/vendor/immutable.es.js`. `copy-cms.mjs` keeps the map's URL and its CSP hash in sync automatically. After upgrading `@sveltia/cms`, open `/admin` once and check the date fields + Drucken still work.

## `.htaccess` (Apache)

| Block | Why |
|---|---|
| `Options -Indexes` | No folder listings |
| Deny `.php/.py/.sh/…` + PHP off | Nothing is ever executed on the server, even if a file slips in |
| Deny hidden files (`.git`, `.env`, …) | No leaks of config/secrets |
| HTTPS rewrite | Force HTTPS |
| `RedirectMatch 301 …` | Old WordPress URLs (`/kontakt`, `/ueber-uns`, …) → matching section on home |
| `RedirectMatch 410 wp-…` | Tells bots the old WordPress admin is gone for good |
| Security headers | HSTS (HTTPS only, **incl. subdomains**), no MIME sniffing, no framing of the site (clickjacking), minimal referrer, camera/mic/location off |
| Cache headers | Hashed CSS/JS/fonts cached 1 year; HTML always fresh |

The page-level CSP (which scripts/images may load) is set by Astro as a `<meta>` tag – see `astro.config.mjs`.
