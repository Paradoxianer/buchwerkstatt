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
  const cacheDaten = {};
  const cache = { get: (k) => (k in cacheDaten ? cacheDaten[k] : null), put: (k, v) => { cacheDaten[k] = v; } };

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
      // Wie in Apps Script: setText gibt nichts zurück (nicht verkettbar).
      setText(t) { a.text = t; }, setHeading(h) { a.heading = h; return p; },
      editAsText() { return textObj(a); },
      appendInlineImage(blob) {
        a.bild = blob;
        const g = { b: 256, h: 256, getWidth: () => g.b, getHeight: () => g.h, setWidth(x) { g.b = x; return g; }, setHeight(x) { g.h = x; return g; } };
        return g;
      }
    };
    return p;
  }
  function body(liste) {
    return {
      clear() { liste.length = 0; liste.push({ text: '', heading: 'NORMAL', links: [] }); },
      getParagraphs() {
        return liste.map((a) => {
          const p = { setText(t) { a.text = t; }, setHeading(h) { a.heading = h; return p; }, editAsText() { return textObj(a); } };
          return p;
        });
      },
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
    openById(id) {
      if (!docs[id]) throw new Error('nicht gefunden');
      return { getBody: () => body(docs[id]), saveAndClose() {}, getName: () => dateien[id].name, setName(n) { dateien[id].name = n; } };
    }
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
    Utilities: {
      newBlob: (bytes, mime, name) => ({ bytes, mime, getName: () => name }),
      base64Decode: (x) => Buffer.from(x, 'base64'),
      formatDate: (d) => d.toISOString().slice(0, 16).replace('T', ' '), getUuid: () => 'uuid-' + (++zaehler) + '-xxxxxxxx'
    },
    LockService: { getDocumentLock: () => ({ waitLock() {}, releaseLock() {} }) },
    UrlFetchApp: {}, HtmlService: {},
    CacheService: { getDocumentCache: () => cache }
  };
  const namen = Object.keys(globals);
  const fns = new Function(...namen, code + '; return { bwSpeichern, bwBlaetterSync, bwLoeschen, bwLaden, datenbank_, bwFelderSetzen, bwEintraegeLesen, bwEinstellungenSpeichern, bwObenSetzen, bwTabelleNeuAnlegen, bwBildSetzen, bwBildEntfernen, einstellungen_, fragebogen_, kurzeFelder_, namensmuster_, fundstellen_, neueAusfuehrung: function () { bwCacheDb_ = null; bwCacheSprache_ = null; } };')(...namen.map((n) => globals[n]));
  return { fns, dateien, docs, dokProps, zugriff, tabellen };
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

test('Großes Fenster: einzelne Felder setzen, ohne den Rest zu überschreiben, und der Seitenleiste melden', () => {
  const { fns } = welt();
  const lena = fns.bwSpeichern({ art: 'person', name: 'Lena', text: 'Hebamme', felder: { Alter: '34', Beruf: 'Hebamme' } }, {});
  const vorher = fns.bwLaden().fensterStand;
  const neu = fns.bwFelderSetzen(lena.id, { Eltern: 'Vater verschwunden', Alter: '35' });
  assert.deepEqual(neu.felder, { Alter: '35', Beruf: 'Hebamme', Eltern: 'Vater verschwunden' });
  assert.equal(neu.text, 'Hebamme', 'Rest der Karte bleibt');
  const stand = fns.bwLaden().fensterStand;
  assert.ok(stand && stand !== vorher && stand.ids[0] === lena.id, 'Änderung gemeldet');
  assert.deepEqual(fns.bwEintraegeLesen([lena.id])[0].felder, neu.felder);
  fns.bwFelderSetzen(lena.id, { Kindheit: 'Wuchs am Hafen auf.\n\nDer Vater verschwand: 1987.' });
  assert.equal(fns.bwEintraegeLesen([lena.id])[0].felder.Kindheit, 'Wuchs am Hafen auf.\n\nDer Vater verschwand: 1987.', 'Zeilenumbrüche bleiben erhalten');
  fns.bwFelderSetzen(lena.id, { Eltern: '', Kindheit: '' });
  assert.deepEqual(fns.bwEintraegeLesen([lena.id])[0].felder, { Alter: '35', Beruf: 'Hebamme' }, 'leeres Feld verschwindet');
});

test('Steckbrief-Vorlagen: neu ausführlich, Auswahl bleibt, Speicher klein', () => {
  const { fns, dokProps } = welt();
  const person = () => fns.einstellungen_().arten.find((a) => a.id === 'person');
  assert.deepEqual(person().felder, fns.fragebogen_('de', 'person'), 'neues Buch: ausführlich');

  // Bewusst die kurze Liste gewählt → bleibt kurz
  const e = fns.einstellungen_();
  e.arten.find((a) => a.id === 'person').felder = fns.kurzeFelder_('de', 'person');
  fns.bwEinstellungenSpeichern(e);
  fns.neueAusfuehrung();
  assert.deepEqual(person().felder, fns.kurzeFelder_('de', 'person'));

  // Eigene Liste bleibt, wie sie ist
  e.arten.find((a) => a.id === 'person').felder = ['# Eigenes', 'Lieblingsessen | Was isst sie gern?'];
  fns.bwEinstellungenSpeichern(e);
  fns.neueAusfuehrung();
  assert.deepEqual(person().felder, ['# Eigenes', 'Lieblingsessen | Was isst sie gern?']);

  // Mit allen Fragebögen bleiben die Einstellungen weit unter 9 KB
  e.arten.forEach((a) => { const f = fns.fragebogen_('de', a.id); if (f && a.karte) a.felder = f; });
  fns.bwEinstellungenSpeichern(e);
  assert.ok(dokProps.getProperty('BW_EINSTELLUNGEN').length < 3000, 'Verweis statt Liste gespeichert');
  fns.neueAusfuehrung();
  assert.deepEqual(person().felder, fns.fragebogen_('de', 'person'));
});

test('Stern-Felder aus dem großen Fenster: nur die Art ändern und der Seitenleiste melden', () => {
  const { fns } = welt();
  const e = fns.einstellungen_();
  e.tagesziel = 777;
  fns.bwEinstellungenSpeichern(e);
  fns.bwObenSetzen('person', ['Alter', 'Eltern']);
  fns.neueAusfuehrung();
  const nachher = fns.einstellungen_();
  assert.deepEqual(nachher.arten.find((a) => a.id === 'person').oben, ['Alter', 'Eltern']);
  assert.equal(nachher.tagesziel, 777, 'übrige Einstellungen bleiben');
  assert.deepEqual(nachher.arten.find((a) => a.id === 'person').felder, fns.fragebogen_('de', 'person'), 'Fragebogen bleibt');
  assert.deepEqual(fns.bwLaden().fensterStand.oben, { person: ['Alter', 'Eltern'] });
});

test('Kein Zugriff auf die Tabelle (fremdes Buch): klare Meldung statt still neuer Tabelle', () => {
  const { fns, dokProps, zugriff, tabellen } = welt();
  fns.bwSpeichern({ art: 'notiz', text: 'Notiz der Besitzerin' }, {});
  const id = dokProps.getProperty('BW_DATENBANK');
  // Mitschreibende Person: Drive sieht die Tabelle nicht, öffnen darf sie sie auch nicht
  zugriff.delete(id);
  const tabelle = tabellen[id];
  delete tabellen[id];
  fns.neueAusfuehrung();
  assert.throws(() => fns.bwLaden(), /\[BW-ZUGRIFF\].*Roman – Buchwerkstatt/);
  assert.equal(dokProps.getProperty('BW_DATENBANK'), id, 'Verweis auf die richtige Tabelle bleibt');
  // Nach der Freigabe geht es weiter wie gehabt
  tabellen[id] = tabelle;
  fns.neueAusfuehrung();
  assert.equal(fns.bwLaden().eintraege.length, 1);
  // Notausgang: bewusst neu anfangen
  delete tabellen[id];
  fns.neueAusfuehrung();
  fns.bwTabelleNeuAnlegen();
  assert.notEqual(dokProps.getProperty('BW_DATENBANK'), id);
  assert.equal(fns.bwLaden().eintraege.length, 0);
});

test('Personenblätter beim gemeinsamen Schreiben: fremdes Blatt weiterverwenden statt doppelt anlegen', () => {
  const { fns, dateien, zugriff } = welt();
  const lena = fns.bwSpeichern({ art: 'person', name: 'Lena', text: '', felder: {} }, {});
  const blatt = (name) => ({ id: lena.id, titel: name, abschnitte: [] });
  const id = fns.bwBlaetterSync([blatt('Lena')])[lena.id];
  zugriff.delete(id); // jemand anderes legte das Blatt an: Drive sieht es nicht
  fns.neueAusfuehrung();
  const anzahl = Object.keys(dateien).length;
  assert.equal(fns.bwBlaetterSync([blatt('Lena Berger')])[lena.id], id, 'dasselbe Blatt');
  assert.equal(Object.keys(dateien).length, anzahl, 'kein neues Dokument');
  assert.equal(dateien[id].name, 'Lena Berger', 'umbenannt');
});

test('Bilder: speichern, ersetzen, im Personenblatt, beim Löschen weg', () => {
  const { fns, dateien, docs } = welt();
  const lena = fns.bwSpeichern({ art: 'person', name: 'Lena', text: '', felder: {} }, {});
  const klein = 'data:image/jpeg;base64,' + Buffer.from('klein').toString('base64');
  const r1 = fns.bwBildSetzen(lena.id, { klein, gross: Buffer.from('gross').toString('base64'), name: 'Lena' });
  assert.equal(dateien[r1.datei].name, 'Lena.jpg');
  assert.deepEqual(fns.bwLaden().bilder, { [lena.id]: klein });
  // Normales Speichern der Karte lässt das Bild in Ruhe
  fns.bwSpeichern(Object.assign({}, lena, { text: 'Hebamme' }), {});
  assert.deepEqual(fns.bwLaden().bilder, { [lena.id]: klein });
  // Ersetzen: altes Original in den Papierkorb
  const r2 = fns.bwBildSetzen(lena.id, { klein, gross: Buffer.from('neu').toString('base64'), name: 'Lena' });
  assert.equal(dateien[r1.datei].trashed, true);
  // Im Personenblatt steht das Bild unter dem Titel
  const blatt = fns.bwBlaetterSync([{ id: lena.id, titel: 'Lena', abschnitte: [] }])[lena.id];
  assert.ok(docs[blatt].some((a) => a.bild), 'Bild im Blatt');
  assert.throws(() => fns.bwBildSetzen(lena.id, { klein: 'data:image/jpeg;base64,' + 'A'.repeat(60000) }), /zu groß/);
  fns.bwLoeschen(lena.id);
  assert.equal(dateien[r2.datei].trashed, true, 'Bild beim Löschen der Karte im Papierkorb');
  assert.deepEqual(fns.bwLaden().bilder, {});
});

test('Fundstellen: ganze Wörter mit Genitiv, Nummer im Absatz und Text drumherum', () => {
  const { fns } = welt();
  const muster = fns.namensmuster_(['Lena', 'Lena Hartmann', 'x']);
  const text = 'Helena kam. Lena Hartmann lachte. Später sah Lena den Fluss, und Lenas Uhr tickte leise in der Tasche ihres alten grünen Mantels.';
  const funde = fns.fundstellen_(text, muster);
  assert.deepEqual(funde.map((f) => f.wort), ['Lena Hartmann', 'Lena', 'Lena'], 'nicht in „Helena“, längerer Name zuerst');
  // nr zählt, wie oft genau dieses Wort davor im Absatz steht – so findet findText dieselbe Stelle.
  assert.deepEqual(funde.map((f) => f.nr), [0, 1, 2]);
  assert.equal(funde[1].vor, 'Helena kam. Lena Hartmann lachte. Später sah ');
  assert.equal(funde[2].vor, '…lachte. Später sah Lena den Fluss, und ', 'vorne an Wortgrenze gekürzt');
  assert.ok(funde[2].nach.endsWith('…') && !funde[2].nach.includes('Mantels'), 'an Wortgrenze gekürzt');
  assert.equal(fns.namensmuster_(['x', '']), null);
});
