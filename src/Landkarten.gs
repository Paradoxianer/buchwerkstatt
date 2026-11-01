/**
 * Landkarten: eigene Karten (gezeichnet, gescannt …) als Hintergrund, darauf die Orte als Fähnchen.
 *
 * Blatt „Landkarten“ – je Karte eine Zeile: Name, Bildgröße und die Fähnchen
 *                      als JSON { Karten-ID: [x, y] } (Anteile 0…1 der Bildbreite/-höhe).
 * Blatt „Kartenbilder“ – das Bild als data:-URL, in Stücke zu je einer Zelle geteilt.
 *
 * Das Bild liegt bewusst in der Tabelle und nicht als Datei in Drive: Mit drive.file
 * sähe eine Mitschreibende eine Datei nicht, die das Add-on für jemand anderen angelegt hat.
 * Die Tabelle dagegen teilen ohnehin alle, die am Buch schreiben.
 */

var BW_LANDKARTE = {
  blatt: { de: 'Landkarten', en: 'Maps', fr: 'Cartes', es: 'Mapas', it: 'Mappe', pt: 'Mapas', nl: 'Kaarten' },
  felder: ['id', 'name', 'orte', 'breite', 'hoehe'],
  koepfe: {
    de: ['ID', 'Name', 'Fähnchen', 'Breite', 'Höhe'],
    en: ['ID', 'Name', 'Pins', 'Width', 'Height'],
    fr: ['ID', 'Nom', 'Repères', 'Largeur', 'Hauteur'],
    es: ['ID', 'Nombre', 'Marcadores', 'Ancho', 'Alto'],
    it: ['ID', 'Nome', 'Segnaposto', 'Larghezza', 'Altezza'],
    pt: ['ID', 'Nome', 'Marcadores', 'Largura', 'Altura'],
    nl: ['ID', 'Naam', 'Vlaggetjes', 'Breedte', 'Hoogte']
  },
  breiten: [90, 200, 400, 70, 70]
};

var BW_KARTENBILD = {
  blatt: { de: 'Kartenbilder', en: 'Map images', fr: 'Images des cartes', es: 'Imágenes de mapas', it: 'Immagini mappe', pt: 'Imagens dos mapas', nl: 'Kaartafbeeldingen' },
  felder: ['id', 'karte', 'daten'],
  koepfe: {
    de: ['ID', 'Landkarte', 'Daten'],
    en: ['ID', 'Map', 'Data'],
    fr: ['ID', 'Carte', 'Données'],
    es: ['ID', 'Mapa', 'Datos'],
    it: ['ID', 'Mappa', 'Dati'],
    pt: ['ID', 'Mapa', 'Dados'],
    nl: ['ID', 'Kaart', 'Gegevens']
  },
  breiten: [90, 90, 300]
};

// Höchstens 40 Zellen – so bleibt Laden und Speichern schnell (≈ 2 MB).
var BW_KARTENBILD_MAX = 40 * BW_BILD_MAX;

/** Alle Landkarten ohne Bilder: [{ id, name, orte: { id: [x, y] }, breite, hoehe, bild: true|false }] */
function bwLandkartenLaden() {
  var ss = datenbank_();
  var sheet = vorhandenesBlatt_(ss, BW_LANDKARTE);
  if (!sheet) return [];
  var bilder = {};
  var teile = vorhandenesBlatt_(ss, BW_KARTENBILD);
  if (teile) liesTabelle_(teile, BW_KARTENBILD).forEach(function (z) { bilder[z.karte] = true; });
  return liesTabelle_(sheet, BW_LANDKARTE).map(function (z) { return landkarteAusZeile_(z, !!bilder[z.id]); });
}

function landkarteAusZeile_(z, bild) {
  var orte = {};
  try { orte = JSON.parse(z.orte || '{}') || {}; } catch (err) { orte = {}; }
  return { id: z.id, name: z.name, orte: orte, breite: Number(z.breite) || 0, hoehe: Number(z.hoehe) || 0, bild: !!bild };
}

/** Das Bild einer Landkarte als data:-URL – oder '' ohne Bild. */
function bwLandkarteBild(id) {
  var teile = vorhandenesBlatt_(datenbank_(), BW_KARTENBILD);
  if (!teile) return '';
  return liesTabelle_(teile, BW_KARTENBILD)
    .filter(function (z) { return z.karte === id; })
    .sort(function (a, b) { return teilNr_(a.id) - teilNr_(b.id); })
    .map(function (z) { return z.daten; }).join('');
}

function teilNr_(id) { return Number(String(id).split('#')[1]) || 0; }

/** Neue Landkarte oder neuer Name. karte = { id?, name } */
function bwLandkarteSpeichern(karte) {
  return mitLandkarte_(karte.id, function (k) {
    k.name = String(karte.name || '').trim() || k.name;
  });
}

/** Setzt (pos = [x, y]) oder entfernt (pos = null) ein Fähnchen. Nur dieses eine – andere bleiben. */
function bwLandkartePunkt(kartenId, eintragId, pos) {
  return mitLandkarte_(kartenId, function (k) {
    if (pos) k.orte[eintragId] = [anteil_(pos[0]), anteil_(pos[1])];
    else delete k.orte[eintragId];
  });
}

function anteil_(x) {
  return Math.round(Math.min(1, Math.max(0, Number(x) || 0)) * 10000) / 10000;
}

/** bild = 'data:image/jpeg;base64,…', breite/hoehe in Pixeln. Ersetzt ein vorhandenes Bild. */
function bwLandkarteBildSetzen(kartenId, bild, breite, hoehe) {
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(bild || '')) throw new Error('Bild fehlt');
  if (bild.length > BW_KARTENBILD_MAX) throw new Error(tx_('bildZuGross'));
  var lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    var ss = datenbank_();
    var karte = landkarteLesen_(ss, kartenId);
    if (!karte) throw new Error('Landkarte fehlt');
    kartenbildLoeschen_(ss, kartenId);
    var teile = blatt_(ss, BW_KARTENBILD);
    versteckeBlatt_(teile);
    var index = spalten_(teile, BW_KARTENBILD);
    var zeilen = [];
    for (var i = 0, nr = 0; i < bild.length; i += BW_BILD_MAX, nr++) {
      var zeile = [];
      for (var j = 0; j < index._breite; j++) zeile.push('');
      zeile[index.id] = kartenId + '#' + nr;
      zeile[index.karte] = kartenId;
      zeile[index.daten] = bild.slice(i, i + BW_BILD_MAX);
      zeilen.push(zeile);
    }
    var bereich = teile.getRange(teile.getLastRow() + 1, 1, zeilen.length, index._breite);
    bereich.setNumberFormat('@');
    bereich.setValues(zeilen);
    karte.breite = Math.round(Number(breite) || 0);
    karte.hoehe = Math.round(Number(hoehe) || 0);
    landkarteSchreiben_(ss, karte);
    karte.bild = true;
    return karte;
  } finally {
    lock.releaseLock();
  }
}

function bwLandkarteLoeschen(kartenId) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    var ss = datenbank_();
    kartenbildLoeschen_(ss, kartenId);
    var sheet = vorhandenesBlatt_(ss, BW_LANDKARTE);
    if (sheet) loescheZeile_(sheet, BW_LANDKARTE, kartenId);
    return true;
  } finally {
    lock.releaseLock();
  }
}

/** Liest die Karte (oder legt sie an, wenn id leer ist), ändert sie mit aendern und schreibt sie zurück. */
function mitLandkarte_(kartenId, aendern) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    var ss = datenbank_();
    var karte = kartenId ? landkarteLesen_(ss, kartenId) : { id: neueId_(), name: '', orte: {}, breite: 0, hoehe: 0 };
    if (!karte) throw new Error('Landkarte fehlt');
    aendern(karte);
    landkarteSchreiben_(ss, karte);
    var teile = vorhandenesBlatt_(ss, BW_KARTENBILD);
    karte.bild = !!teile && liesTabelle_(teile, BW_KARTENBILD).some(function (z) { return z.karte === karte.id; });
    return karte;
  } finally {
    lock.releaseLock();
  }
}

function landkarteLesen_(ss, id) {
  var z = liesTabelle_(blatt_(ss, BW_LANDKARTE), BW_LANDKARTE).filter(function (x) { return x.id === id; })[0];
  return z ? landkarteAusZeile_(z, false) : null;
}

function landkarteSchreiben_(ss, k) {
  schreibeZeile_(blatt_(ss, BW_LANDKARTE), BW_LANDKARTE, {
    id: k.id, name: k.name, orte: JSON.stringify(k.orte || {}), breite: String(k.breite || ''), hoehe: String(k.hoehe || '')
  });
}

function kartenbildLoeschen_(ss, kartenId) {
  var teile = vorhandenesBlatt_(ss, BW_KARTENBILD);
  if (!teile) return;
  var index = spalten_(teile, BW_KARTENBILD);
  var n = teile.getLastRow() - 1;
  if (n <= 0) return;
  var spalte = teile.getRange(2, index.karte + 1, n, 1).getValues();
  // Von unten nach oben, damit die Zeilennummern stimmen.
  for (var i = n - 1; i >= 0; i--) if (String(spalte[i][0]) === kartenId) teile.deleteRow(i + 2);
}

/** Lange Datenzeilen sind in der Tabelle nur im Weg. */
function versteckeBlatt_(sheet) {
  try { if (!sheet.isSheetHidden || !sheet.isSheetHidden()) sheet.hideSheet(); } catch (err) { /* egal */ }
}
