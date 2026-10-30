// Führt den Server-Code (src/*.gs) mit nachgebauten Google-Diensten aus.
// Prüft vor allem Ablage über die Drive-API (drive.file): Tabelle, Ordner, Personenblätter.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const src = new URL('../src/', import.meta.url);
const code = readdirSync(src).filter((f) => f.endsWith('.gs')).map((f) => readFileSync(new URL(f, src), 'utf8')).join('\n');

function welt() {
  let zaehler = 0;
  const neueId = (p) => p + (++zaehler);
  const dateien = {};          // Drive: id → { id, name, trashed, parents, mimeType }
  const zugriff = new Set();   // was das Add-on mit drive.file sehen darf (selbst angelegt)
  const docs = {};             // Google Docs: id → Absätze

  function props() {
    const p = {};
    return { getProperty: (k) => (k in p ? p[k] : null), setProperty: (k, v) => { p[k] = String(v); }, deleteProperty: (k) => { delete p[k]; } };
  }
  const dokProps = props(), nutzerProps = props();

  function datei(name, mimeType, parents) {
    const id = neueId('f');
    dateien[id] = { id, name, trashed: false, parents: parents || ['root'], mimeType };
    zugriff.add(id);
    return id;
  }

  const Drive = {
    Files: {
      get(id) {
        if (!zugriff.has(id)) throw new Error('File not found: ' + id);
        return JSON.parse(JSON.stringify(dateien[id]));
      },
      update(res, id, _media, opt = {}) {
        if (!zugriff.has(id)) throw new Error('File not found: ' + id);
        const d = dateien[id];
        Object.assign(d, res);
        if (opt.addParents) {
          if (!zugriff.has(opt.addParents)) throw new Error('Parent not accessible');
          d.parents = d.parents.filter((p) => !String(opt.removeParents || '').split(',').includes(p)).concat([opt.addParents]);
        }
        return d;
      },
      create(res) {
        for (const p of res.parents || []) if (!zugriff.has(p)) throw new Error('Parent not accessible');
        return { id: datei(res.name, res.mimeType, res.parents) };
      }
    }
  };

  function textObj(absatz) {
    return {
      appendText(t) { absatz.text += t; },
      setBold() {}, setLinkUrl(a, b, url) { absatz.links.push(url); }, setItalic() { return this; },
      setFontSize() { return this; }, setForegroundColor() { return this; }
    };
  }
  function absatz(liste, text) {
    const a = { text, heading: 'NORMAL', links: [] };
    liste.push(a);
    const p = {
      setText(t) { a.text = t; return p; }, setHeading(h) { a.heading = h; return p; },
      editAsText() { return textObj(a); }
    };
    return p;
  }
  function body(liste) {
    return {
      clear() { liste.length = 0; liste.push({ text: '', heading: 'NORMAL', links: [] }); },
      getChild(i) { const a = liste[i]; return { asParagraph: () => ({ setText(t) { a.text = t; return this; }, setHeading(h) { a.heading = h; return this; } }) }; },
      appendParagraph(t) { return absatz(liste, t); }
    };
  }

  const manuskriptId = 'manuskript';
  dateien[manuskriptId] = { id: manuskriptId, name: 'Roman', trashed: false, parents: ['fremderOrdner'], mimeType: 'doc' };

  const DocumentApp = {
    ParagraphHeading: { TITLE: 'TITLE', SUBTITLE: 'SUBTITLE', HEADING1: 'H1', HEADING2: 'H2', HEADING3: 'H3', NORMAL: 'NORMAL' },
    ElementType: { BODY_SECTION: 'BODY', PARAGRAPH: 'P', TEXT: 'T' },
    getActiveDocument: () => ({ getId: () => manuskriptId, getName: () => 'Roman' }),
    create(titel) { const id = datei(titel, 'doc'); docs[id] = [{ text: '', heading: 'NORMAL', links: [] }]; return { getId: () => id }; },
    openById(id) { return { getBody: () => body(docs[id]), saveAndClose() {} }; }
  };

  const tabellen = {};
  function blattObjekt(name) {
    const zeilen = [];
    const zelle = (r, c) => ((zeilen[r - 1] || [])[c - 1] ?? '');
    const s = {
      name,
      setName(n) { s.name = n; },
      getLastRow: () => zeilen.length,
      getLastColumn: () => Math.max(0, ...zeilen.map((z) => z.length)),
      getMaxRows: () => 1000,
      setFrozenRows() {}, setColumnWidth() {},
      deleteRow(r) { zeilen.splice(r - 1, 1); },
      getRange(r, c, nr = 1, nc = 1) {
        const bereich = {
          setValues(werte) { werte.forEach((w, i) => { zeilen[r - 1 + i] = zeilen[r - 1 + i] || []; w.forEach((x, j) => { zeilen[r - 1 + i][c - 1 + j] = x; }); }); return bereich; },
          setValue(x) { zeilen[r - 1] = zeilen[r - 1] || []; zeilen[r - 1][c - 1] = x; return bereich; },
          getValues() { const out = []; for (let i = 0; i < nr; i++) { const z = []; for (let j = 0; j < nc; j++) z.push(zelle(r + i, c + j)); out.push(z); } return out; },
          setFontWeight() { return bereich; }, setBackground() { return bereich; }, setNumberFormat() { return bereich; },
          createTextFinder(text) {
            return { matchEntireCell() { return this; }, findNext() {
              for (let i = 0; i < nr; i++) if (String(zelle(r + i, c)) === text) return { getRow: () => r + i };
              return null;
            } };
          }
        };
        return bereich;
      }
    };
    return s;
  }
  const SpreadsheetApp = {
    create(name) {
      const id = datei(name, 'sheet');
      const blaetter = [blattObjekt('Tabelle1')];
      tabellen[id] = {
        getId: () => id, getUrl: () => 'https://sheet/' + id, getSheets: () => blaetter,
        getSheetByName: (n) => blaetter.find((b) => b.name === n) || null,
        insertSheet: (n) => { const b = blattObjekt(n); blaetter.push(b); return b; }
      };
      return tabellen[id];
    },
    openById(id) { if (!tabellen[id]) throw new Error('nicht gefunden'); return tabellen[id]; }
  };

  const globals = {
    Drive, DocumentApp, SpreadsheetApp,
    PropertiesService: { getDocumentProperties: () => dokProps, getUserProperties: () => nutzerProps },
    Session: { getActiveUserLocale: () => 'de', getScriptTimeZone: () => 'Europe/Berlin' },
    Utilities: { formatDate: (d) => d.toISOString().slice(0, 16).replace('T', ' '), getUuid: () => 'uuid-' + (++zaehler) + '-xxxxxxxx' },
    LockService: { getDocumentLock: () => ({ waitLock() {}, releaseLock() {} }) },
    UrlFetchApp: {}, HtmlService: {}
  };
  const namen = Object.keys(globals);
  const fns = new Function(...namen, code + '; return { bwSpeichern, bwBlaetterSync, bwLoeschen, bwLaden, datenbank_, neueAusfuehrung: function () { bwCacheDb_ = null; bwCacheSprache_ = null; } };')(...namen.map((n) => globals[n]));
  return { fns, dateien, docs, dokProps, zugriff };
}

test('Tabelle und Ordner werden angelegt, auch ohne Zugriff auf den Ordner des Manuskripts', () => {
  const { fns, dateien, dokProps } = welt();
  const e = fns.bwSpeichern({ art: 'person', name: 'Lena', text: 'Hebamme', aliase: ['Lenchen'], felder: { Alter: '34' } }, {});
  assert.ok(e.id);
  const ordnerId = dokProps.getProperty('BW_BUCHORDNER');
  assert.equal(dateien[ordnerId].name, 'Roman – Buchwerkstatt');
  assert.deepEqual(dateien[ordnerId].parents, ['root'], 'fremder Ordner nicht erreichbar → Meine Ablage');
  const tabelle = dokProps.getProperty('BW_DATENBANK');
  assert.deepEqual(dateien[tabelle].parents, [ordnerId], 'Tabelle liegt im Buch-Ordner');
  const geladen = fns.bwLaden();
  assert.equal(geladen.eintraege.length, 1);
  assert.deepEqual(geladen.eintraege[0].felder, { Alter: '34' });
  assert.deepEqual(geladen.eintraege[0].aliase, ['Lenchen']);
});

test('Personenblätter: anlegen, verlinken, umbenennen, löschen', () => {
  const { fns, dateien, docs, dokProps } = welt();
  const lena = fns.bwSpeichern({ art: 'person', name: 'Lena', text: '' }, {});
  const uhr = fns.bwSpeichern({ art: 'ding', name: 'Taschenuhr', text: '' }, {});
  const blatt = (e, titel) => ({ id: e.id, titel, untertitel: 'Person', fusszeile: 'auto', abschnitte: [{ titel: 'Notizen', zeilen: [[{ t: 'besitzt ' }, { t: 'Taschenuhr', z: uhr.id }]] }] });

  const erg = fns.bwBlaetterSync([blatt(lena, 'Lena'), blatt(uhr, 'Taschenuhr')]);
  const lenaDoc = erg[lena.id];
  const welt_ = dokProps.getProperty('BW_ORDNER');
  assert.equal(dateien[lenaDoc].name, 'Lena');
  assert.deepEqual(dateien[lenaDoc].parents, [welt_], 'Blatt liegt im Welt-Ordner');
  assert.deepEqual(dateien[welt_].parents, [dokProps.getProperty('BW_BUCHORDNER')], 'Welt-Ordner im Buch-Ordner');
  assert.ok(docs[lenaDoc].some((a) => a.links.includes('https://docs.google.com/document/d/' + erg[uhr.id] + '/edit')), 'Link aufs andere Blatt');
  assert.equal(fns.bwLaden().eintraege.find((x) => x.id === lena.id).blatt, lenaDoc, 'Blatt-ID gemerkt');

  fns.bwBlaetterSync([blatt(lena, 'Lena Berger')]);
  assert.equal(dateien[lenaDoc].name, 'Lena Berger', 'umbenannt statt neu angelegt');

  fns.bwLoeschen(lena.id);
  assert.equal(dateien[lenaDoc].trashed, true, 'Blatt im Papierkorb');
  assert.equal(fns.bwLaden().eintraege.length, 1);
});

test('Tabelle bleibt erhalten, auch wenn Drive sie nicht (mehr) sieht', () => {
  const { fns, dokProps, zugriff } = welt();
  fns.bwSpeichern({ art: 'notiz', text: 'erste Notiz' }, {});
  const id = dokProps.getProperty('BW_DATENBANK');
  // Tabelle z. B. von einer älteren Version (voller Drive-Zugriff) angelegt: Drive sieht sie nicht
  zugriff.delete(id);
  fns.neueAusfuehrung();
  assert.equal(fns.datenbank_().getId(), id, 'keine neue, leere Tabelle');
  assert.equal(fns.bwLaden().eintraege.length, 1);
});

test('Tabelle im Papierkorb → neue Tabelle', () => {
  const { fns, dokProps, dateien } = welt();
  fns.bwSpeichern({ art: 'notiz', text: 'erste Notiz' }, {});
  const alt = dokProps.getProperty('BW_DATENBANK');
  dateien[alt].trashed = true;
  fns.neueAusfuehrung();
  assert.notEqual(fns.datenbank_().getId(), alt);
});
