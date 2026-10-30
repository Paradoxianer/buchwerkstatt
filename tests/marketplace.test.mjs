// Voraussetzungen für den Google Workspace Marketplace: keine eingeschränkten Berechtigungen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const src = new URL('../src/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('appsscript.json', src), 'utf8'));

// Eingeschränkte Bereiche verlangen eine kostenpflichtige Sicherheitsprüfung.
const EINGESCHRAENKT = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://mail.google.com/'
];

test('Manifest fordert keine eingeschränkten Berechtigungen an', () => {
  for (const scope of manifest.oauthScopes) {
    assert.ok(!EINGESCHRAENKT.includes(scope), 'eingeschränkt: ' + scope);
  }
  assert.ok(manifest.oauthScopes.includes('https://www.googleapis.com/auth/drive.file'));
});

test('Kein DriveApp (braucht vollen Drive-Zugriff)', () => {
  for (const f of readdirSync(src).filter((x) => x.endsWith('.gs'))) {
    const code = readFileSync(new URL(f, src), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    assert.ok(!/\bDriveApp\b/.test(code), f + ' benutzt DriveApp');
  }
  const dienste = (manifest.dependencies.enabledAdvancedServices || []).map((d) => d.userSymbol);
  assert.ok(dienste.includes('Drive'), 'erweiterter Dienst Drive fehlt');
});

test('Jede Berechtigung ist in der Veröffentlichungsanleitung begründet', () => {
  const anleitung = readFileSync(new URL('../docs/VEROEFFENTLICHEN.md', import.meta.url), 'utf8');
  for (const scope of manifest.oauthScopes) {
    assert.ok(anleitung.includes(scope), 'nicht begründet: ' + scope);
  }
});
