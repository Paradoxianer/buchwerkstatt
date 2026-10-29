import { test } from 'node:test';
import assert from 'node:assert/strict';
import Core from './lade-core.mjs';

const arten = [
  { id: 'person', woerter: ['Person', 'Figur'], karte: true, farbe: '#33f' },
  { id: 'ort', woerter: ['Ort'], karte: true, farbe: '#3a3' },
  { id: 'ding', woerter: ['Ding', 'Gegenstand'], karte: true, farbe: '#a73' },
  { id: 'zeit', woerter: ['Zeit', 'Wann'], karte: false },
  { id: 'idee', woerter: ['Idee'], karte: false }
];

test('Schlüsselwort mit Name und Doppelpunkt', () => {
  assert.deepEqual(Core.parseNotiz('Person Lena: 34, Hebamme', arten),
    { art: 'person', name: 'Lena', text: '34, Hebamme', wort: 'Person', erkannt: true });
  assert.equal(Core.parseNotiz('figur Heinrich Berger: der Vater', arten).name, 'Heinrich Berger');
  assert.equal(Core.parseNotiz('#ort Hafen: riecht nach Diesel', arten).art, 'ort');
  assert.equal(Core.parseNotiz('Ding Taschenuhr: gehörte dem Vater', arten).text, 'gehörte dem Vater');
});

test('Schlüsselwort ohne Doppelpunkt nur bei Namen', () => {
  assert.equal(Core.parseNotiz('Ort Leuchtturm', arten).name, 'Leuchtturm');
  assert.equal(Core.parseNotiz('Ort und Zeit sind unklar', arten).art, 'notiz');
  assert.equal(Core.parseNotiz('Person', arten).art, 'notiz');
});

test('Zeitstrahl und Ideen', () => {
  const z = Core.parseNotiz('Zeit 12. März 14:30: Lena trifft Jonas', arten);
  assert.equal(z.art, 'zeit');
  assert.equal(z.name, '12. März 14:30');
  assert.equal(z.text, 'Lena trifft Jonas');
  assert.equal(Core.parseNotiz('Idee: Jonas ist der Bruder', arten).text, 'Jonas ist der Bruder');
  assert.equal(Core.parseNotiz('Idee was wäre wenn', arten).text, 'was wäre wenn');
  assert.equal(Core.parseNotiz('Zeit vergeht', arten).art, 'notiz');
});

test('Normale Notiz bleibt Notiz', () => {
  assert.equal(Core.parseNotiz('Hier fehlt noch Spannung', arten).art, 'notiz');
  assert.equal(Core.parseNotiz('Personen sind wichtig', arten).art, 'notiz');
});

const eintraege = [
  { id: 'l', art: 'person', name: 'Lena', aliase: ['Lenchen'] },
  { id: 'h', art: 'person', name: 'Heinrich Berger', aliase: ['Vater', 'der Alte'] },
  { id: 'j', art: 'person', name: 'Jonas' },
  { id: 'u', art: 'ding', name: 'Taschenuhr', aliase: [], text: 'gehörte dem Vater' },
  { id: 'n', art: 'notiz', name: '', text: '@Lena findet die Taschenuhr' }
];

test('Namen, Aliase, Vor- und Nachnamen, Genitiv', () => {
  const idx = Core.baueIndex(eintraege, arten);
  const v = Core.findeVerweise('Lenas Vater Heinrich traf Berger und Jonas.', idx);
  assert.deepEqual(v.map(x => x.text), ['Lena', 'Vater', 'Heinrich', 'Berger', 'Jonas']);
  assert.deepEqual(v.map(x => x.ids[0]), ['l', 'h', 'h', 'h', 'j']);
  assert.equal(Core.findeVerweise('Lenaria ist kein Name', idx).length, 0);
});

test('@-Erwähnungen, auch unbekannte', () => {
  const idx = Core.baueIndex(eintraege, arten);
  const v = Core.findeVerweise('@Heinrich Berger trifft @Herr Kowalski, mail@test.de', idx);
  assert.equal(v[0].text, 'Heinrich Berger');
  assert.equal(v[0].at, true);
  assert.equal(v[1].neu, true);
  assert.equal(v[1].text, 'Herr Kowalski');
  assert.equal(v.length, 2);
});

test('Verbindungen in beide Richtungen', () => {
  const idx = Core.baueIndex(eintraege, arten);
  const g = Core.verbindungen(eintraege, idx, [{ von: 'l', nach: 'h', art: 'Tochter von' }]);
  assert.deepEqual(g.raus.u, ['h']);
  assert.deepEqual(g.rein.h.sort(), ['l', 'u']);
  assert.deepEqual(g.raus.n.sort(), ['l', 'u']);
});

test('Datum im Buch sortierbar', () => {
  const reihe = ['3. Februar', '12. März', '12.03.1987', 'März 1987', 'Tag 2', '1990', '1.4. 9 Uhr', '1.4. 14:00'];
  const werte = Object.fromEntries(reihe.map(r => [r, Core.parseDatum(r)]));
  assert.ok(werte['3. Februar'] < werte['12. März']);
  assert.ok(werte['März 1987'] < werte['12.03.1987']);
  assert.ok(werte['12.03.1987'] < werte['1990']);
  assert.ok(werte['1.4. 9 Uhr'] < werte['1.4. 14:00']);
  assert.equal(werte['Tag 2'], 2);
  assert.equal(Core.parseDatum('irgendwann'), null);
  // Ohne Jahr gilt das häufigste Jahr im Zeitstrahl
  const jahr = Core.haeufigstesJahr(['3. Februar 1987', '1.1.1987', '5. Mai 1990', '12. März']);
  assert.equal(jahr, 1987);
  assert.ok(Core.parseDatum('3. Februar 1987', jahr) < Core.parseDatum('12. März', jahr));
});

test('Englisch: Schlüsselwörter, Daten, Titel', () => {
  const en = [
    { id: 'person', woerter: ['Character', 'Person'], karte: true },
    { id: 'zeit', woerter: ['Time', 'When'], karte: false },
    { id: 'idee', woerter: ['Idea'], karte: false }
  ];
  assert.equal(Core.parseNotiz('Character Lena: 34, midwife', en).name, 'Lena');
  assert.equal(Core.parseNotiz('When March 12: Lena meets Jonas', en).name, 'March 12');
  assert.equal(Core.parseNotiz('Time flies', en).art, 'notiz');
  const j = 1987;
  const w = (s) => Core.parseDatum(s, j);
  assert.equal(w('March 12, 1987'), w('12.3.1987'));
  assert.equal(w('12th of March'), w('12. März'));
  assert.ok(w('February 3rd') < w('March 12'));
  assert.ok(w('March 12 9am') < w('March 12 2:30 pm'));
  assert.equal(w('Day 4'), 4);
  const idx = Core.baueIndex([{ id: 'k', art: 'person', name: 'Mr. Kowalski' }, { id: 'l', art: 'person', name: 'Lena Berger' }], en);
  assert.deepEqual(Core.findeVerweise("Lena's father met Kowalski", idx).map(v => v.text), ['Lena', 'Kowalski']);
  assert.equal(idx.namen['Mr.'], undefined);
});

test('HTML wird sicher erzeugt', () => {
  const idx = Core.baueIndex(eintraege, arten);
  const html = Core.textMitVerweisen('<b>Lena</b>', idx, { l: eintraege[0] }, { person: arten[0] });
  assert.ok(html.startsWith('&lt;b&gt;<button'));
  assert.ok(html.includes('data-id="l"'));
});
