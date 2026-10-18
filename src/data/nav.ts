// Restaurant, Wochenmenü und Lokal mieten sind Abschnitte der Startseite.
// `match`: Pfad, auf dem der Eintrag zusätzlich hervorgehoben wird (Anker-Links sind sonst nie aktiv).
export const nav: { label: string; href: string; match?: string }[] = [
  { label: 'START', href: '/#' },
  // { label: 'RESTAURANT', href: '/#bereiche' },
  { label: 'WOCHENMENU', href: '/#wochenmenu' },
  // { label: 'LOKAL MIETEN', href: '/#lokal-mieten' },
  { label: 'VERANSTALTUNGEN', href: '/#veranstaltungen', match: '/veranstaltungen' },
];

export const contact = {
  phone: '043 244 40 40',
  phoneHref: 'tel:+41432444040',
  email: 'reservation@dukes.ch',
  company: 'dukes GmbH',
  street: 'Sihlbrugg 3',
  city: '8816 Hirzel-Sihlbrugg',
  maps: 'https://maps.google.com/?q=dukes+Sihlbrugg+3+8816+Hirzel',
  facebook: 'https://www.facebook.com/dukesrestaurant',
  instagram: 'https://www.instagram.com/dukes_sihlbrugg',
};

// myLocalina / local.ch Reservations-Widget.
// ID = letzter Teil der local.ch-Eintrags-URL (".../dukes-restaurant-nywC96knpXITaCh_OROwUA").
// Leer lassen ('') → "Tisch reservieren" führt stattdessen zum Kontaktbereich der Startseite.
export const bookingWidgetId = 'nywC96knpXITaCh_OROwUA';
export const bookingUrl = bookingWidgetId
  ? `https://bookingwidget.local.ch/${bookingWidgetId}?lang=de&themeVariant=lagertha`
  : '/#lokal-mieten';
