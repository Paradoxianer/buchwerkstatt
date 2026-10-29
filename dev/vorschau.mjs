// Baut dist/vorschau.html: die Seitenleiste mit Beispieldaten, ohne Google.
// Aufruf: npm run vorschau  → danach dist/vorschau.html im Browser öffnen.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const src = new URL('../src/', import.meta.url);
const lies = (name) => readFileSync(new URL(name, src), 'utf8');

let html = lies('Sidebar.html').replace(/<\?!=\s*include\('(\w+)'\);?\s*\?>/g, (_, name) => lies(name + '.html'));
const mock = readFileSync(new URL('./mock.js', import.meta.url), 'utf8');
html = html.replace('<body>', () => '<body style="width:300px;margin:0 auto;border-left:1px solid #ddd;border-right:1px solid #ddd">\n<script>' + mock + '</script>');

mkdirSync(new URL('../dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('../dist/vorschau.html', import.meta.url), html);
console.log('dist/vorschau.html erstellt');
