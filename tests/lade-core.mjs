// Lädt den <script>-Inhalt aus src/Core.html, damit Node ihn testen kann.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const html = readFileSync(new URL('../src/Core.html', import.meta.url), 'utf8');
const code = html.replace(/^\s*<script>/, '').replace(/<\/script>\s*$/, '');
const module = { exports: {} };
new Function('module', code)(module);
export default module.exports;
