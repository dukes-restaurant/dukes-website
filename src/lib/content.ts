import { getCollection } from 'astro:content';

/** Zeitpunkt (UTC-ms) für Datum + Stunde in Zürcher Ortszeit (berücksichtigt Sommerzeit). */
function zurichTime(y: number, m: number, d: number, hour: number) {
  const guess = Date.UTC(y, m, d, hour);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Zurich', hour: 'numeric', hourCycle: 'h23' }).formatToParts(guess);
  const zurichHour = Number(parts.find((p) => p.type === 'hour')!.value);
  return guess - ((zurichHour - hour + 24) % 24) * 3600_000;
}

/** Ein Wochenmenü gilt ab Samstag 23:00 (Zürich) vor seinem Montag bis zum Samstag 23:00 danach. */
export const menuStart = (from: Date) => zurichTime(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() - 2, 23);

/** Ende der Menü-Woche: Samstag 23:00 (Zürich) nach dem Montag. */
export const menuEnd = (from: Date) => zurichTime(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + 5, 23);

/** Die neuesten Wochenmenüs (neueste zuerst). Welches davon sichtbar ist, entscheidet der Browser anhand der aktuellen Zeit
 *  (siehe WeeklyMenu.astro) – so wirkt ein früh hochgeladenes Menü erst ab Samstag 23:00, ohne dass ein Rebuild nötig ist. */
export async function getRecentMenus(count = 2) {
  const weeks = (await getCollection('wochenmenu')).sort((a, b) => +b.data.from - +a.data.from);
  return weeks.slice(0, count);
}

/** Wochenbezeichnung immer als "KW 46": der Redakteur schreibt mal "46", mal "KW 46" oder "kw46". */
export const weekLabel = (week: string) => `KW ${String(week).replace(/^\s*(kw|woche)\.?\s*/i, '').trim()}`;

/** Welches Menü gilt zum Zeitpunkt `now`? Aktuelles Zeitfenster, sonst das neueste bereits begonnene, sonst das früheste. */
export function pickMenuIndex(windows: { start: number; end: number }[], now: number) {
  const current = windows.findIndex((w) => w.start <= now && now < w.end);
  if (current >= 0) return current;
  const started = windows.findIndex((w) => w.start <= now); // Liste ist neueste-zuerst
  return started >= 0 ? started : windows.length - 1;
}

/** Alle Veranstaltungen chronologisch; Entwürfe nur im Dev-Modus. */
export async function getEvents() {
  return (await getCollection('events', (e) => import.meta.env.DEV || !e.data.draft))
    .sort((a, b) => +a.data.date - +b.data.date);
}

export const isoDay = (d: Date) => d.toISOString().slice(0, 10);
export const fmtDay = (d: Date) => d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
