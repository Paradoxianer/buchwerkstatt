// Prüft, dass jede Sprache vollständig ist: gleiche Schlüssel und gleiche Platzhalter wie Deutsch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const src = new URL('../src/', import.meta.url);
const skript = (name) => readFileSync(new URL(name, src), 'utf8').replace(/^\s*<script>/, '').replace(/<\/script>\s*$/, '');

function ladeI18n() {
  let code = skript('I18n.html').replace('var aktuell', 'globalThis.__bwT = T; var aktuell');
  const dateien = readdirSync(src).filter((f) => /^I18n_\w+\.html$/.test(f));
  code += '\n' + dateien.map(skript).join('\n') + '\nreturn BWI18n;';
  const I = new Function('navigator', code)({ language: 'de' });
  return { I, T: globalThis.__bwT, dateien };
}

const platzhalter = (s) => (typeof s === 'string' ? (s.match(/\{\w+\}/g) || []).sort().join(',') : 'liste');

test('Alle Sprachen haben alle Texte und dieselben Platzhalter', () => {
  const { I, T } = ladeI18n();
  const de = T.de;
  assert.ok(I.SPRACHEN.length >= 7, 'mindestens 7 Sprachen');
  for (const s of I.SPRACHEN) {
    const texte = T[s.id];
    assert.ok(texte, 'Wörterbuch fehlt: ' + s.id);
    const fehlt = Object.keys(de).filter((k) => !(k in texte));
    const zuviel = Object.keys(texte).filter((k) => !(k in de));
    assert.deepEqual(fehlt, [], s.id + ': fehlende Texte');
    assert.deepEqual(zuviel, [], s.id + ': unbekannte Texte');
    for (const k of Object.keys(de)) {
      assert.equal(platzhalter(texte[k]), platzhalter(de[k]), s.id + ' ' + k);
    }
  }
});

test('Server kennt dieselben Sprachen mit Texten und Standard-Arten', () => {
  const { I } = ladeI18n();
  const gs = readFileSync(new URL('Sprachen.gs', src), 'utf8') + readFileSync(new URL('Ki.gs', src), 'utf8');
  const S = new Function(gs + '; return { BW_SPRACHEN, BW_TEXTE, BW_STANDARD_ARTEN, BW_KI_SPRACHEN };')();
  assert.deepEqual(S.BW_SPRACHEN.slice().sort(), I.SPRACHEN.map((s) => s.id).sort());
  const textSchluessel = Object.keys(S.BW_TEXTE.de).sort();
  for (const id of S.BW_SPRACHEN) {
    assert.deepEqual(Object.keys(S.BW_TEXTE[id]).sort(), textSchluessel, 'Server-Texte ' + id);
    assert.deepEqual(S.BW_STANDARD_ARTEN[id].map((a) => a.id), ['person', 'ort', 'ding', 'zeit', 'idee'], 'Arten ' + id);
    assert.ok(S.BW_KI_SPRACHEN[id], 'KI-Sprache ' + id);
  }
});

test('Blatt- und Spaltennamen gibt es in jeder Sprache', () => {
  const gs = ['Sprachen.gs', 'Store.gs', 'Statistik.gs'].map((f) => readFileSync(new URL(f, src), 'utf8')).join('\n');
  const S = new Function(gs + '; return { BW_SPRACHEN, BW_EINTRAG, BW_BEZIEHUNG, BW_STATISTIK };')();
  for (const def of [S.BW_EINTRAG, S.BW_BEZIEHUNG, S.BW_STATISTIK]) {
    for (const id of S.BW_SPRACHEN) {
      assert.ok(def.blatt[id], 'Blattname ' + id);
      assert.equal(def.koepfe[id].length, def.felder.length, 'Spalten ' + id + ' ' + def.blatt.de);
    }
  }
});

test('Ausführliche Steckbriefe: in jeder Sprache gleich aufgebaut, mit allen alten Feldern', async () => {
  const gs = ['Sprachen.gs', 'Fragebogen.gs'].map((f) => readFileSync(new URL(f, src), 'utf8')).join('\n');
  const S = new Function(gs + '; return { BW_SPRACHEN, BW_STANDARD_ARTEN, BW_FRAGEBOGEN };')();
  const Core = (await import('./lade-core.mjs')).default;
  const aufbau = (liste) => Core.steckbrief(liste).map((g) => g.felder.length);
  for (const id of ['person', 'ort', 'ding']) {
    const muster = aufbau(S.BW_FRAGEBOGEN.de[id]);
    for (const s of S.BW_SPRACHEN) {
      const liste = S.BW_FRAGEBOGEN[s][id];
      assert.ok(liste, s + ' ' + id);
      assert.deepEqual(aufbau(liste), muster, 'gleiche Bereiche ' + s + ' ' + id);
      const namen = Core.feldNamen(liste);
      assert.equal(namen.length, liste.filter((z) => !z.startsWith('#')).length, 'keine doppelten Felder ' + s + ' ' + id);
      liste.filter((z) => !z.startsWith('#')).forEach((z) => {
        assert.ok(!z.split('|')[0].includes(':'), 'kein Doppelpunkt im Feldnamen: ' + z);
        assert.ok(z.includes(' | '), 'Leitfrage fehlt: ' + z);
      });
      const kurz = S.BW_STANDARD_ARTEN[s].find((a) => a.id === id).felder;
      for (const f of kurz) assert.ok(namen.includes(f), s + ' ' + id + ': altes Feld fehlt im Fragebogen: ' + f);
    }
  }
});
