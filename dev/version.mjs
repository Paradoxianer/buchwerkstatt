// Schreibt src/Version.gs vor dem Hochladen: Versionsnummer, Zeitpunkt und Git-Stand.
// So zeigt die Seitenleiste (Mehr → ganz unten), welcher Stand gerade läuft.
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const paket = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const git = (befehl) => { try { return execSync(befehl, { encoding: 'utf8' }).trim(); } catch (err) { return ''; } };
const commit = git('git rev-parse --short HEAD');
const geaendert = git('git status --porcelain -- src') !== '';
const stand = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Berlin' }).slice(0, 16);

const version = { nummer: paket.version, stand, commit: commit + (geaendert ? '+' : '') };
writeFileSync(new URL('../src/Version.gs', import.meta.url),
  '// Wird von dev/version.mjs beim Hochladen erzeugt – nicht von Hand ändern.\n' +
  'var BW_VERSION = ' + JSON.stringify(version) + ';\n');
console.log('Buchwerkstatt ' + version.nummer + ' · ' + version.stand + ' · ' + version.commit);
