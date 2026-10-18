// Eigene Erweiterungen für Sveltia CMS (wird nach vendor/sveltia-cms.js geladen, vor dem Start des Editors).
// - Feldtyp "swissdate": Datum als TT/MM/JJJJ eingeben (gespeichert wird weiterhin JJJJ-MM-TT)
// - Vorschau fürs Wochenmenü: schlichte Tabelle + Knopf "Drucken"
(() => {
  const { CMS, h } = window;
  const React = CMS.React ?? globalThis.__SVELTIA_CMS_REACT__;
  const { useState, useEffect, useRef } = React;

  const pad = (n) => String(n).padStart(2, '0');

  /** "2026-10-12" -> "12/10/2026" */
  const toSwiss = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
  };

  /** "12/10/2026" (auch 12.10.2026 oder 1/2/2026) -> "2026-10-12"; ungültig -> '' */
  const toIso = (text) => {
    const m = /^\s*(\d{1,2})[/.](\d{1,2})[/.](\d{4})\s*$/.exec(text ?? '');
    if (!m) return '';
    const [d, mo, y] = [+m[1], +m[2], +m[3]];
    const date = new Date(Date.UTC(y, mo - 1, d));
    if (date.getUTCDate() !== d || date.getUTCMonth() !== mo - 1) return ''; // z.B. 31/02
    return `${y}-${pad(mo)}-${pad(d)}`;
  };

  const addDays = (iso, i) => {
    if (!iso) return '';
    const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return toSwiss(d.toISOString());
  };

  // ---------- Feldtyp "swissdate" ----------

  function SwissDateControl({ value, onChange, forID, classNameWrapper }) {
    const [text, setText] = useState(toSwiss(value));
    const picker = useRef(null);

    // Wert von aussen geändert (z.B. Duplizieren) -> Textfeld nachführen
    useEffect(() => {
      if (toIso(text) !== (value ?? '')) setText(toSwiss(value));
    }, [value]);

    const invalid = text.trim() !== '' && !toIso(text);

    return h('div', null,
      h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' } },
        h('input', {
          id: forID,
          className: classNameWrapper,
          type: 'text',
          inputMode: 'numeric',
          placeholder: 'TT/MM/JJJJ',
          autoComplete: 'off',
          value: text,
          style: { maxWidth: '12em' },
          onChange: (e) => {
            setText(e.target.value);
            onChange(toIso(e.target.value)); // ungültig -> leer, damit nicht gespeichert werden kann
          },
          onBlur: () => { if (toIso(text)) setText(toSwiss(toIso(text))); }, // 1/2/2026 -> 01/02/2026
        }),
        h('button', {
          type: 'button',
          title: 'Kalender öffnen',
          style: { padding: '4px 10px', cursor: 'pointer' },
          onClick: () => { try { picker.current.showPicker(); } catch { picker.current.focus(); } },
        }, 'Kalender'),
        // Unsichtbares natives Datumsfeld, nur für den Kalender-Popup
        h('input', {
          ref: picker,
          type: 'date',
          tabIndex: -1,
          'aria-hidden': 'true',
          value: value ?? '',
          style: { position: 'absolute', left: 0, bottom: 0, width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' },
          onChange: (e) => {
            setText(toSwiss(e.target.value));
            onChange(e.target.value);
          },
        }),
      ),
      invalid && h('p', { style: { color: '#c00', margin: '4px 0 0', fontSize: '0.9em' } }, 'Bitte im Format TT/MM/JJJJ eingeben, z.B. 24/10/2026'),
    );
  }

  const SwissDatePreview = ({ value }) => h('p', null, toSwiss(value));

  CMS.registerWidget('swissdate', SwissDateControl, SwissDatePreview);

  // ---------- Wochenmenü: Vorschau + Drucken ----------

  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  const toData = (entry) => {
    const raw = entry?.getIn ? entry.getIn(['data']) : entry?.data;
    return (raw?.toJS ? raw.toJS() : raw) ?? {};
  };

  /** Gemeinsame Tabellendaten für Vorschau und Druck */
  const rows = (d) => ({
    title: `Wochenmenü ${d.week ?? ''}`,
    range: `${toSwiss(d.from)} – ${toSwiss(d.to)}${d.note ? ` · ${d.note}` : ''}`,
    daily: (d.daily ?? []).map((x, i) => [x.day, addDays(d.from, i), x.soup ?? '', x.dish ?? '', x.price || d.menu1Price || '']),
    week: [...(d.menus ?? []), ...(d.specials ?? [])].map((m) => [
      `${m.name ?? ''}${m.tag ? ` (${m.tag})` : ''}`,
      `${m.dish ?? ''}${m.description ? ` – ${m.description}` : ''}`,
      m.price ?? '',
    ]),
  });

  const DAILY_HEAD = ['Tag', 'Datum', 'Suppe', 'Hauptgang', 'Preis'];
  const WEEK_HEAD = ['Menü', 'Gericht', 'Preis'];

  const printMenu = (r) => {
    const table = (head, body) => `<table><thead><tr>${head.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>`
      + `<tbody>${body.map((row) => `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(r.title)}</title><style>
      body { font-family: Arial, Helvetica, sans-serif; color: #000; margin: 1.5cm; }
      h1 { font-size: 1.5rem; margin: 0 0 0.25rem; }
      h2 { font-size: 1.1rem; margin: 1.5rem 0 0.5rem; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #000; padding: 0.4rem 0.5rem; text-align: left; vertical-align: top; }
      th { background: #eee; }
      @page { margin: 0; }
    </style></head><body>
      <h1>${esc(r.title)}</h1><p>${esc(r.range)}</p>
      <h2>Menü 1</h2>${table(DAILY_HEAD, r.daily)}
      ${r.week.length ? `<h2>Ganze Woche</h2>${table(WEEK_HEAD, r.week)}` : ''}
    </body></html>`;
    const w = window.open('', '_blank');
    if (!w) { alert('Bitte Pop-ups für diese Seite erlauben, um zu drucken.'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const cell = { border: '1px solid #999', padding: '4px 6px', textAlign: 'left', verticalAlign: 'top' };
  const previewTable = (head, body) => h('table', { style: { width: '100%', borderCollapse: 'collapse', marginBottom: '1em' } },
    h('thead', null, h('tr', null, head.map((c) => h('th', { key: c, style: { ...cell, background: '#eee' } }, c)))),
    h('tbody', null, body.map((row, i) => h('tr', { key: i }, row.map((c, j) => h('td', { key: j, style: cell }, c))))),
  );

  function WochenmenuPreview({ entry }) {
    const r = rows(toData(entry));
    return h('div', { style: { fontFamily: 'Arial, Helvetica, sans-serif', color: '#000' } },
      h('button', { type: 'button', onClick: () => printMenu(r), style: { padding: '6px 16px', marginBottom: '1em', cursor: 'pointer' } }, 'Drucken'),
      h('h1', { style: { fontSize: '1.4em', margin: 0 } }, r.title),
      h('p', null, r.range),
      h('h2', { style: { fontSize: '1.1em' } }, 'Menü 1'),
      previewTable(DAILY_HEAD, r.daily),
      r.week.length > 0 && h('h2', { style: { fontSize: '1.1em' } }, 'Ganze Woche'),
      r.week.length > 0 && previewTable(WEEK_HEAD, r.week),
    );
  }

  CMS.registerPreviewTemplate('wochenmenu', WochenmenuPreview);
})();
