// Kopiert Sveltia CMS aus node_modules nach public/admin/vendor/,
// damit /admin ohne externes CDN läuft (Version fix über package-lock.json).
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const src = 'node_modules/@sveltia/cms/dist';
const dest = 'public/admin/vendor';

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(`${src}/sveltia-cms.js`, `${dest}/sveltia-cms.js`);
// Nachgeladene Teile (z.B. react-dom für eigene Feldtypen/Vorschauen); sonst würde unpkg versucht, was die CSP blockiert
cpSync(`${src}/chunks`, `${dest}/chunks`, { recursive: true, filter: (f) => !f.endsWith('.map') });

// Eigene Feldtypen/Vorschauen (admin/dukes-cms.js) brauchen "immutable", das Sveltia fest von unpkg lädt.
// Eine Import-Map leitet diese URL auf die lokale Kopie um; URL und CSP-Hash in admin/index.html werden hier nachgeführt.
const bundle = readFileSync(`${dest}/sveltia-cms.js`, 'utf8');
const immutableVersion = /immutable:`\D?([\d.]+)`/.exec(bundle)?.[1];
if (!immutableVersion) throw new Error('copy-cms: immutable-Version im Sveltia-Bundle nicht gefunden');
cpSync('node_modules/immutable/dist/immutable.es.js', `${dest}/immutable.es.js`);

const indexPath = 'public/admin/index.html';
const importMap = JSON.stringify({ imports: { [`https://unpkg.com/immutable@${immutableVersion}/dist/immutable.es.js`]: '/admin/vendor/immutable.es.js' } });
const hash = `'sha256-${createHash('sha256').update(importMap).digest('base64')}'`;
const html = readFileSync(indexPath, 'utf8')
  .replace(/<script type="importmap">.*?<\/script>/, `<script type="importmap">${importMap}</script>`)
  .replace(/script-src 'self'( 'sha256-[^']+')?;/, `script-src 'self' ${hash};`);
writeFileSync(indexPath, html);

console.log('Sveltia CMS -> public/admin/vendor/');
