// Baut dist/vorschau.html: die Seitenleiste mit Beispieldaten, ohne Google.
// Aufruf: npm run vorschau  → danach dist/vorschau.html im Browser öffnen.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const src = new URL('../src/', import.meta.url);
const lies = (name) => readFileSync(new URL(name, src), 'utf8');

let html = lies('Sidebar.html').replace(/<\?!=\s*include\('(\w+)'\);?\s*\?>/g, (_, name) => lies(name + '.html'));
// Sprachen.gs und Fragebogen.gs liefern der Attrappe die Standard-Arten aller Sprachen.
const mock = lies('Sprachen.gs') + '\n' + lies('Fragebogen.gs') + '\n' + readFileSync(new URL('./mock.js', import.meta.url), 'utf8');
html = html.replace('<body>', () => '<body style="width:300px;margin:0 auto;border-left:1px solid #ddd;border-right:1px solid #ddd">\n<script>' + mock + '</script>');

// Das große Fenster (Steckbrief einer Karte): dist/fenster.html#id=p1
let fenster = lies('Fenster.html').replace(/<\?!=\s*include\('(\w+)'\);?\s*\?>/g, (_, name) => lies(name + '.html'))
  .replace('<?!= start ?>', () => "{ ansicht: 'steckbrief', start: { id: (location.hash.match(/id=(\\w+)/) || [0, 'p1'])[1] } }");
fenster = fenster.replace('<body class="fenster">', () => '<body class="fenster">\n<script>' + mock + '\ngoogle.script.host = { close: function () { window.close(); } };</script>');

mkdirSync(new URL('../dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('../dist/vorschau.html', import.meta.url), html);
writeFileSync(new URL('../dist/fenster.html', import.meta.url), fenster);
console.log('dist/vorschau.html und dist/fenster.html erstellt');
