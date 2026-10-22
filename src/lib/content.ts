import { getCollection } from 'astro:content';

/** Zeitpunkt (UTC-ms) für Datum + Stunde in Zürcher Ortszeit (berücksichtigt Sommerzeit). */
function zurichTime(y: number, m: number, d: number, hour: number) {
  const guess = Date.UTC(y, m, d, hour);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Zurich', hour: 'numeric', hourCycle: 'h23' }).formatToParts(guess);
  const zurichHour = Number(parts.find((p) => p.type === 'hour')!.value);
  return guess - ((zurichHour - hour + 24) % 24) * 3600_000;
}

/** Ein Wochenmenü gilt ab Sonntag 20:00 (Zürich) vor seinem Montag bis zum Sonntag 20:00 danach. */
export const menuStart = (from: Date) => zurichTime(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() - 1, 20);

/** Aktuell gültiges Wochenmenü; undefined, wenn (noch) kein neueres vorhanden ist. */
export async function getCurrentMenu() {
  const weeks = (await getCollection('wochenmenu')).sort((a, b) => +a.data.from - +b.data.from);
  const now = Date.now();
  const week = [...weeks].reverse().find((w) => menuStart(w.data.from) <= now);
  if (!week) return undefined;
  const end = zurichTime(week.data.from.getUTCFullYear(), week.data.from.getUTCMonth(), week.data.from.getUTCDate() + 6, 20);
  return now < end ? week : undefined;
}

/** Alle Veranstaltungen chronologisch; Entwürfe nur im Dev-Modus. */
export async function getEvents() {
  return (await getCollection('events', (e) => import.meta.env.DEV || !e.data.draft))
    .sort((a, b) => +a.data.date - +b.data.date);
}

export const isoDay = (d: Date) => d.toISOString().slice(0, 10);
export const fmtDay = (d: Date) => d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
