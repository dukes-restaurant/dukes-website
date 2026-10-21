import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const dish = z.object({
  name: z.string(),                    // z.B. "Menü 2", "Monats-Special"
  tag: z.string().optional(),          // z.B. "Vegetarisch"
  dish: z.string(),
  description: z.string().optional(),
  price: z.string(),                   // z.B. "CHF 19.00"
});

// Eine Datei pro Woche in src/content/wochenmenu/, z.B. 2026-kw42.md
const wochenmenu = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/wochenmenu' }),
  schema: z.object({
    week: z.string(),                  // Anzeigetitel, z.B. "KW 42"
    from: z.coerce.date(),             // Montag der Woche
    to: z.coerce.date(),               // Freitag der Woche
    note: z.string().default('Vorspeise inklusive Salat oder Suppe'),
    menu1Price: z.string().optional(), // Standardpreis Menü 1 (für Tage ohne eigenen Preis)
    daily: z.array(z.object({          // Menü 1 – wechselt täglich
      day: z.string(),                 // z.B. "Montag"
      soup: z.string().optional(),
      dish: z.string(),
      price: z.string().optional(),    // Preis nur für diesen Tag, z.B. "CHF 23.00"
    })),
    specials: z.array(dish).default([]), // z.B. Monats-Special, Dukes Bowle
    menus: z.array(dish).default([]),    // Menü 2 / Menü 3 – ganze Woche gleich
  }),
});

// Kurze Texte; Längenlimits verhindern versehentlich riesige Einträge.
const text = (max: number) => z.string().trim().min(1).max(max);
// Nur lokale Bilder aus public/events/ (keine externen URLs, kein javascript: usw.)
const localImage = z.string().regex(/^\/events\/[a-z0-9][a-z0-9._-]*\.(jpe?g|png|webp)$/i, 'Bild muss unter /events/ liegen, z.B. /events/plakat.jpg');

// Das CMS speichert leere optionale Felder als '' – das gilt hier als "nicht gesetzt".
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), schema.optional());

// Eine Datei pro Veranstaltung in src/content/events/
const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: z.object({
    title: text(120),
    date: z.coerce.date(),
    time: optional(z.string().regex(/^\d{1,2}[:.]\d{2}$/, 'Zeit im Format 20:00')),
    area: z.enum(['Eventsaal', 'Dukes Club', 'Saloon', 'Restaurant', 'Terrasse', 'Fonduestübli']).default('Dukes Club'),
    image: optional(localImage),    // z.B. /events/plakat.jpg (Datei in public/events/)
    price: optional(text(60)),
    draft: z.boolean().default(false), // true = nur lokal (npm run dev) sichtbar
  }),
});

export const collections = { wochenmenu, events };
