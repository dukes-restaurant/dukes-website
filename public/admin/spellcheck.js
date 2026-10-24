// Rechtschreibprüfung beim Speichern (Sveltia CMS, "preSave"-Hook).
// - Prüft beim Klick auf «Speichern» alle Textfelder des Eintrags mit EINER Anfrage an LanguageTool (de-CH).
// - Gefundene Tippfehler werden gesammelt in einem Dialog gelistet: «Zurück zum Korrigieren» bricht das Speichern ab,
//   «Trotzdem speichern» speichert wie gewohnt (Fehlalarme bei Namen sind möglich und blockieren nie).
// - Ist die Prüfung nicht erreichbar (offline, Limit erreicht), wird einfach gespeichert.
// - Wörter, die nie bemängelt werden sollen (DJ-Namen, Bands, Gerichte), stehen in /admin/spellcheck-words.txt.
(() => {
  const { CMS } = window;
  const API = 'https://api.languagetool.org/v2/check';
  const LANGUAGE = 'de-CH';
  const MAX_CHARS = 15000; // öffentliche API: max. 20'000 Zeichen pro Anfrage

  // Felder, die keinen Fliesstext enthalten (Datum, Preis, Auswahllisten, Bildpfad …)
  const SKIP_KEYS = new Set(['date', 'time', 'from', 'to', 'price', 'menu1Price', 'image', 'area', 'day', 'draft', 'week']);

  let ignoreWords = null;
  const loadIgnoreWords = async () => {
    if (ignoreWords) return ignoreWords;
    ignoreWords = new Set();
    try {
      const res = await fetch('/admin/spellcheck-words.txt', { cache: 'no-cache' });
      if (res.ok) {
        (await res.text()).split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).forEach((w) => ignoreWords.add(w.toLowerCase()));
      }
    } catch { /* ohne Liste weiter */ }
    return ignoreWords;
  };

  /** Alle zu prüfenden Texte eines Eintrags: [{ path: 'daily.1.dish', text }] */
  const collectTexts = (value, path = '', out = []) => {
    if (typeof value === 'string') {
      if (value.trim() && /\p{L}{3}/u.test(value)) out.push({ path, text: value });
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => collectTexts(v, `${path}.${i}`, out));
    } else if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) if (!SKIP_KEYS.has(k)) collectTexts(v, path ? `${path}.${k}` : k, out);
    }
    return out;
  };

  const batches = (segments) => {
    const result = [];
    let current = [];
    let size = 0;
    for (const s of segments) {
      if (size + s.text.length + 1 > MAX_CHARS && current.length) { result.push(current); current = []; size = 0; }
      current.push(s);
      size += s.text.length + 1;
    }
    if (current.length) result.push(current);
    return result;
  };

  /** Prüft einen Stapel Texte (eine Anfrage) -> [{ word, suggestions, context }] */
  const checkBatch = async (segments, ignore) => {
    const text = segments.map((s) => s.text).join('\n');
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ text, language: LANGUAGE }),
    });
    if (!res.ok) throw new Error(`LanguageTool: HTTP ${res.status}`);
    const { matches = [] } = await res.json();
    return matches
      .filter((m) => m.rule?.issueType === 'misspelling')
      .map((m) => ({ word: text.substr(m.offset, m.length), suggestions: (m.replacements ?? []).slice(0, 3).map((r) => r.value), context: m.sentence?.trim() || m.context?.text }))
      .filter((m) => m.word && !/\d/.test(m.word) && !ignore.has(m.word.toLowerCase()));
  };

  /** Dialog mit allen Funden; löst mit true auf, wenn trotzdem gespeichert werden soll */
  const askUser = (issues) => new Promise((resolve) => {
    const el = (tag, style, text) => {
      const node = document.createElement(tag);
      if (style) node.style.cssText = style;
      if (text !== undefined) node.textContent = text;
      return node;
    };
    const overlay = el('div', 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    const box = el('div', 'background:#fff;color:#111;max-width:560px;width:100%;max-height:85vh;overflow:auto;border-radius:8px;padding:20px;font-family:system-ui,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.4)');
    box.append(el('h2', 'margin:0 0 4px;font-size:1.2em', `Mögliche Tippfehler (${issues.length})`));
    box.append(el('p', 'margin:0 0 12px;color:#555;font-size:.9em', 'Bitte prüfen. Namen und Mundart-Wörter können fälschlich markiert sein.'));
    const list = el('ul', 'margin:0 0 16px;padding-left:20px');
    for (const issue of issues) {
      const li = el('li', 'margin-bottom:8px');
      li.append(el('strong', 'color:#b00020', issue.word));
      if (issue.suggestions.length) li.append(el('span', '', `  →  ${issue.suggestions.join(', ')}`));
      if (issue.context) li.append(el('div', 'color:#666;font-size:.85em', issue.context));
      list.append(li);
    }
    box.append(list);
    const buttons = el('div', 'display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap');
    const back = el('button', 'padding:8px 16px;cursor:pointer;font-weight:600', 'Zurück zum Korrigieren');
    const save = el('button', 'padding:8px 16px;cursor:pointer', 'Trotzdem speichern');
    back.type = save.type = 'button';
    const done = (result) => { document.removeEventListener('keydown', onKey, true); overlay.remove(); resolve(result); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } };
    back.onclick = () => done(false);
    save.onclick = () => done(true);
    document.addEventListener('keydown', onKey, true);
    buttons.append(save, back);
    box.append(buttons);
    overlay.append(box);
    document.body.append(overlay);
    back.focus();
  });

  CMS.registerEventListener({
    name: 'preSave',
    handler: async ({ entry }) => {
      let issues = [];
      try {
        const raw = entry.get('data');
        const data = raw?.toJS ? raw.toJS() : raw;
        const segments = collectTexts(data);
        if (!segments.length) return;
        const ignore = await loadIgnoreWords();
        for (const batch of batches(segments)) issues.push(...await checkBatch(batch, ignore));
      } catch (error) {
        console.warn('Rechtschreibprüfung übersprungen:', error);
        return; // Prüfung nicht erreichbar -> nie am Speichern hindern
      }
      // gleiche Fehler nur einmal listen
      const seen = new Set();
      issues = issues.filter((i) => !seen.has(i.word.toLowerCase()) && seen.add(i.word.toLowerCase()));
      if (!issues.length) return;
      if (!(await askUser(issues))) throw new Error('Speichern abgebrochen: bitte die markierten Tippfehler korrigieren.');
    },
  });
})();
