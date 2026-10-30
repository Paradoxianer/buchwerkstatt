/**
 * Datenablage: eine Google-Tabelle pro Buch.
 *
 * Blatt „Einträge“    – alle Notizen, Figuren, Orte, Gegenstände, Ereignisse, Ideen
 * Blatt „Beziehungen“ – von Hand gesetzte Beziehungen („Tochter von“ …)
 * Blatt „Statistik“   – Wortzahl pro Tag
 *
 * Die Spalten werden über ihre Überschrift gefunden, damit man die Tabelle
 * auch von Hand (z. B. in der Tabellen-App am Handy) lesen und bearbeiten kann.
 * Blatt- und Spaltennamen gibt es in jeder Sprache; erkannt wird jede davon,
 * neu angelegt wird in der aktuellen Sprache.
 */

var BW_PROP_DB = 'BW_DATENBANK';
var BW_PROP_EINST = 'BW_EINSTELLUNGEN';
var BW_PROP_ORDNER = 'BW_ORDNER';

var BW_EINTRAG = {
  blatt: { de: 'Einträge', en: 'Entries', fr: 'Entrées', es: 'Entradas', it: 'Voci', pt: 'Entradas', nl: 'Items' },
  felder: ['id', 'art', 'name', 'aliase', 'text', 'felder', 'bezug', 'status', 'anker', 'kapitel', 'blatt', 'erstellt', 'geaendert', 'ankertext'],
  koepfe: {
    de: ['ID', 'Art', 'Name', 'Auch genannt', 'Text', 'Felder', 'Bezug', 'Status', 'Textstelle', 'Kapitel', 'Blatt', 'Erstellt', 'Geändert', 'Angeheftet an'],
    en: ['ID', 'Type', 'Name', 'Also called', 'Text', 'Fields', 'Linked to', 'Status', 'Passage', 'Chapter', 'Document', 'Created', 'Changed', 'Pinned to'],
    fr: ['ID', 'Type', 'Nom', 'Aussi appelé', 'Texte', 'Champs', 'Lié à', 'Statut', 'Passage', 'Chapitre', 'Document', 'Créé', 'Modifié', 'Épinglé à'],
    es: ['ID', 'Tipo', 'Nombre', 'También llamado', 'Texto', 'Campos', 'Vinculado a', 'Estado', 'Pasaje', 'Capítulo', 'Documento', 'Creado', 'Modificado', 'Fijado a'],
    it: ['ID', 'Tipo', 'Nome', 'Detto anche', 'Testo', 'Campi', 'Collegato a', 'Stato', 'Passaggio', 'Capitolo', 'Documento', 'Creato', 'Modificato', 'Fissato a'],
    pt: ['ID', 'Tipo', 'Nome', 'Também chamado', 'Texto', 'Campos', 'Ligado a', 'Estado', 'Passagem', 'Capítulo', 'Documento', 'Criado', 'Alterado', 'Fixado em'],
    nl: ['ID', 'Soort', 'Naam', 'Ook genoemd', 'Tekst', 'Velden', 'Gekoppeld aan', 'Status', 'Passage', 'Hoofdstuk', 'Document', 'Gemaakt', 'Gewijzigd', 'Vastgemaakt aan']
  },
  breiten: [90, 80, 160, 160, 360, 260, 90, 80, 90, 160, 90, 120, 120, 140]
};

var BW_BEZIEHUNG = {
  blatt: { de: 'Beziehungen', en: 'Relationships', fr: 'Relations', es: 'Relaciones', it: 'Relazioni', pt: 'Relações', nl: 'Relaties' },
  felder: ['id', 'von', 'nach', 'art'],
  koepfe: {
    de: ['ID', 'Von', 'Nach', 'Beziehung'],
    en: ['ID', 'From', 'To', 'Relationship'],
    fr: ['ID', 'De', 'À', 'Relation'],
    es: ['ID', 'De', 'A', 'Relación'],
    it: ['ID', 'Da', 'A', 'Relazione'],
    pt: ['ID', 'De', 'Para', 'Relação'],
    nl: ['ID', 'Van', 'Naar', 'Relatie']
  },
  breiten: [90, 90, 90, 200]
};

/** Grundeinstellungen. Die Arten (Schlüsselwörter, Felder) kommen je nach Sprache aus Sprachen.gs. */
var BW_STANDARD = {
  sprache: 'auto',
  tagesziel: 500,
  gesamtziel: 0,
  zieldatum: '',
  schreibtage: [1, 2, 3, 4, 5],
  anheften: true,
  blaetterAuto: true,
  kiAnzeigen: true,
  kiModell: 'claude-opus-5-5',
  hinweisGesehen: false
};

/* ------------------------------------------------------------------ */
/* Öffentliche Funktionen (werden von der Seitenleiste aufgerufen)     */
/* ------------------------------------------------------------------ */

/** Lädt alles, was die Seitenleiste zum Start braucht. */
function bwLaden() {
  var ss = datenbank_();
  var doc = DocumentApp.getActiveDocument();
  var props = PropertiesService.getDocumentProperties();
  // Der Buch-Ordner enthält Tabelle und Personenblätter; ältere Versionen hatten nur den Welt-Ordner.
  var ordnerId = props.getProperty(BW_PROP_BUCHORDNER) || props.getProperty(BW_PROP_ORDNER);
  var standardArten = {}, kurzeArten = {};
  BW_SPRACHEN.forEach(function (s) {
    standardArten[s] = standardArten_(s);
    kurzeArten[s] = {};
    standardArten[s].forEach(function (a) { kurzeArten[s][a.id] = kurzeFelder_(s, a.id); });
  });
  return {
    buch: doc.getName(),
    tabelleUrl: ss.getUrl(),
    ordnerUrl: ordnerId ? 'https://drive.google.com/drive/folders/' + ordnerId : '',
    kontoSprache: kontoSprache_(),
    // src/Version.gs entsteht erst beim Hochladen (npm run push).
    version: typeof BW_VERSION !== 'undefined' ? BW_VERSION : null,
    standardArten: standardArten,
    kurzeArten: kurzeArten,
    fensterStand: fensterStand_(),
    einstellungen: einstellungen_(),
    eintraege: liesTabelle_(blatt_(ss, BW_EINTRAG), BW_EINTRAG).map(eintragAusZeile_),
    beziehungen: liesTabelle_(blatt_(ss, BW_BEZIEHUNG), BW_BEZIEHUNG),
    ki: bwKiStatus()
  };
}

/**
 * Speichert einen Eintrag (neu oder geändert).
 * optionen.anheften: true → die Notiz wird an die aktuelle Cursor-Stelle geheftet.
 */
function bwSpeichern(eintrag, optionen) {
  optionen = optionen || {};
  var lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    var ss = datenbank_();
    var sheet = blatt_(ss, BW_EINTRAG);
    var jetzt = zeitstempel_();
    var e = {
      id: eintrag.id && String(eintrag.id).indexOf('tmp') !== 0 ? eintrag.id : neueId_(),
      art: eintrag.art || 'notiz',
      name: eintrag.name || '',
      aliase: eintrag.aliase || [],
      text: eintrag.text || '',
      felder: eintrag.felder || {},
      bezug: eintrag.bezug || [],
      status: eintrag.status || '',
      anker: eintrag.anker || '',
      kapitel: eintrag.kapitel || '',
      blatt: eintrag.blatt || '',
      erstellt: eintrag.erstellt || jetzt,
      geaendert: jetzt,
      ankertext: eintrag.ankertext || ''
    };
    var stelle = null;
    if (optionen.anheften && !e.anker) {
      stelle = anheften_();
      if (stelle) {
        e.anker = stelle.anker;
        e.kapitel = stelle.kapitel;
        e.ankertext = stelle.ankertext;
      }
    }
    schreibeZeile_(sheet, BW_EINTRAG, eintragZuZeile_(e));
    var ergebnis = eintragAusZeile_(eintragZuZeile_(e));
    if (stelle) {
      ergebnis.pos = stelle.pos;
      ergebnis.tab = stelle.tab;
    }
    return ergebnis;
  } finally {
    lock.releaseLock();
  }
}

/** Löscht einen Eintrag samt Textstelle, Beziehungen und (bei Karten) Blatt. */
function bwLoeschen(id) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    var ss = datenbank_();
    var sheet = blatt_(ss, BW_EINTRAG);
    var zeilen = liesTabelle_(sheet, BW_EINTRAG);
    var alt = zeilen.filter(function (z) { return z.id === id; })[0];
    if (!alt) return false;
    if (alt.anker) ankerEntfernen_(alt.anker);
    if (alt.blatt) {
      dateiInPapierkorb_(alt.blatt);
    }
    loescheZeile_(sheet, BW_EINTRAG, id);
    var bez = blatt_(ss, BW_BEZIEHUNG);
    liesTabelle_(bez, BW_BEZIEHUNG).forEach(function (b) {
      if (b.von === id || b.nach === id) loescheZeile_(bez, BW_BEZIEHUNG, b.id);
    });
    return true;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Heftet einen Eintrag (neu) an die aktuelle Stelle im Text – an das markierte
 * Wort oder den Absatz unter dem Cursor. Ein alter Anker wird entfernt.
 * Ergebnis: { anker, kapitel, ankertext, pos, tab } oder null, wenn kein Cursor im Text steht.
 */
function bwAnheften(id) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    var sheet = blatt_(datenbank_(), BW_EINTRAG);
    var zeile = liesTabelle_(sheet, BW_EINTRAG).filter(function (z) { return z.id === id; })[0];
    if (!zeile) return null;
    var stelle = anheften_();
    if (!stelle) return null;
    if (zeile.anker) ankerEntfernen_(zeile.anker);
    zeile.anker = stelle.anker;
    zeile.kapitel = stelle.kapitel;
    zeile.ankertext = stelle.ankertext;
    zeile.geaendert = zeitstempel_();
    schreibeZeile_(sheet, BW_EINTRAG, zeile);
    return stelle;
  } finally {
    lock.releaseLock();
  }
}

/** Löst einen Eintrag vom Text (der Anker im Dokument verschwindet). */
function bwLoesen(id) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    var sheet = blatt_(datenbank_(), BW_EINTRAG);
    var zeile = liesTabelle_(sheet, BW_EINTRAG).filter(function (z) { return z.id === id; })[0];
    if (!zeile) return false;
    if (zeile.anker) ankerEntfernen_(zeile.anker);
    zeile.anker = zeile.kapitel = zeile.ankertext = '';
    zeile.geaendert = zeitstempel_();
    schreibeZeile_(sheet, BW_EINTRAG, zeile);
    return true;
  } finally {
    lock.releaseLock();
  }
}

function bwBeziehungSpeichern(b) {
  var sheet = blatt_(datenbank_(), BW_BEZIEHUNG);
  var zeile = { id: b.id && String(b.id).indexOf('tmp') !== 0 ? b.id : neueId_(), von: b.von, nach: b.nach, art: b.art || '' };
  schreibeZeile_(sheet, BW_BEZIEHUNG, zeile);
  return zeile;
}

function bwBeziehungLoeschen(id) {
  loescheZeile_(blatt_(datenbank_(), BW_BEZIEHUNG), BW_BEZIEHUNG, id);
  return true;
}

/**
 * Ändert einzelne Steckbrief-Felder einer Karte (aus dem großen Fenster).
 * Nur die übergebenen Felder werden ersetzt, damit gleichzeitige Änderungen
 * in der Seitenleiste nicht verloren gehen.
 */
function bwFelderSetzen(id, aenderungen) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    var sheet = blatt_(datenbank_(), BW_EINTRAG);
    var zeile = liesTabelle_(sheet, BW_EINTRAG).filter(function (z) { return z.id === id; })[0];
    if (!zeile) return null;
    var felder = felderAusText_(zeile.felder);
    Object.keys(aenderungen || {}).forEach(function (k) { felder[k] = String(aenderungen[k] || '').trim(); });
    zeile.felder = felderZuText_(felder);
    zeile.geaendert = zeitstempel_();
    schreibeZeile_(sheet, BW_EINTRAG, zeile);
    fensterMelden_([id]);
    return eintragAusZeile_(zeile);
  } finally {
    lock.releaseLock();
  }
}

/** Liest einzelne Einträge neu – für die Seitenleiste, wenn das große Fenster etwas geändert hat. */
function bwEintraegeLesen(ids) {
  return liesTabelle_(blatt_(datenbank_(), BW_EINTRAG), BW_EINTRAG)
    .filter(function (z) { return ids.indexOf(z.id) >= 0; })
    .map(eintragAusZeile_);
}

/* ------------------------------------------------------------------ */
/* Abgleich zwischen großem Fenster und Seitenleiste                   */
/* ------------------------------------------------------------------ */

/**
 * Fenster und Seitenleiste laufen getrennt. Was das Fenster speichert, wird hier
 * vermerkt; die Seitenleiste fragt den Stand mit dem Cursor ab (bwCursor) und
 * lädt die genannten Einträge neu.
 */
var BW_CACHE_FENSTER = 'BW_FENSTER_STAND';

function fensterMelden_(ids, oben) {
  var cache = CacheService.getDocumentCache();
  if (!cache) return;
  var stand = { zeit: Date.now(), ids: ids };
  if (oben) stand.oben = oben;
  cache.put(BW_CACHE_FENSTER, JSON.stringify(stand), 21600);
}

/**
 * Setzt die Stern-Felder einer Art (aus dem großen Fenster). Nur dieser eine
 * Wert wird geändert, alles andere in den Einstellungen bleibt, wie es ist.
 */
function bwObenSetzen(artId, oben) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    var e = einstellungen_();
    var a = (e.arten || []).filter(function (x) { return x.id === artId; })[0];
    if (!a) return null;
    a.oben = (oben || []).map(String);
    bwEinstellungenSpeichern(e);
    var info = {};
    info[artId] = a.oben;
    fensterMelden_([], info);
    return a.oben;
  } finally {
    lock.releaseLock();
  }
}

/** { zeit, ids, oben? } der letzten Änderung aus dem Fenster – oder null. */
function fensterStand_() {
  try {
    var cache = CacheService.getDocumentCache();
    var roh = cache && cache.get(BW_CACHE_FENSTER);
    return roh ? JSON.parse(roh) : null;
  } catch (err) {
    return null;
  }
}

function bwEinstellungenSpeichern(neu) {
  neu = Object.assign({}, neu, { arten: felderPacken_(neu.arten) });
  PropertiesService.getDocumentProperties().setProperty(BW_PROP_EINST, JSON.stringify(neu));
  bwCacheSprache_ = null;
  return einstellungen_();
}

/* ------------------------------------------------------------------ */
/* Einstellungen                                                       */
/* ------------------------------------------------------------------ */

function einstellungen_() {
  var gespeichert = einstellungenRoh_();
  var e = JSON.parse(JSON.stringify(BW_STANDARD));
  e.arten = standardArten_(sprache_());
  Object.keys(gespeichert).forEach(function (k) { e[k] = gespeichert[k]; });
  e.arten = felderEntpacken_(e.arten);
  return e;
}

/*
 * Die ausführlichen Steckbriefe sind lang, eine Dokument-Eigenschaft fasst aber
 * nur 9 KB. Entspricht die Feldliste einer Standard-Art einer Vorlage, wird nur
 * ein Verweis gespeichert: „fragebogen:de“ oder „kurz:de“.
 */
function vorlageVon_(artId, felder) {
  if (!felder || typeof felder === 'string' || !felder.length) return null;
  var text = JSON.stringify(felder);
  for (var i = 0; i < BW_SPRACHEN.length; i++) {
    var s = BW_SPRACHEN[i];
    var lang = fragebogen_(s, artId), kurz = kurzeFelder_(s, artId);
    if (lang && JSON.stringify(lang) === text) return 'fragebogen:' + s;
    if (kurz && kurz.length && JSON.stringify(kurz) === text) return 'kurz:' + s;
  }
  return null;
}

function felderPacken_(arten) {
  return (arten || []).map(function (a) {
    var vorlage = vorlageVon_(a.id, a.felder);
    return vorlage ? Object.assign({}, a, { felder: vorlage }) : a;
  });
}

function felderEntpacken_(arten) {
  return (arten || []).map(function (a) {
    if (typeof a.felder !== 'string') return a;
    var teile = a.felder.split(':');
    var felder = teile[0] === 'kurz' ? kurzeFelder_(teile[1], a.id) : fragebogen_(teile[1], a.id);
    return Object.assign({}, a, { felder: felder || [] });
  });
}

function einstellungenRoh_() {
  try {
    var roh = PropertiesService.getDocumentProperties().getProperty(BW_PROP_EINST);
    return roh ? JSON.parse(roh) : {};
  } catch (err) {
    return {};
  }
}

/* ------------------------------------------------------------------ */
/* Tabelle                                                             */
/* ------------------------------------------------------------------ */

var bwCacheDb_ = null;

/** Öffnet die Tabelle zum Dokument – oder legt sie im Buch-Ordner an. */
function datenbank_() {
  if (bwCacheDb_) return bwCacheDb_;
  var props = PropertiesService.getDocumentProperties();
  var id = props.getProperty(BW_PROP_DB);
  var ss = null;
  if (id) {
    // Nur eine Tabelle im Papierkorb gilt als weg. Ist sie über Drive nicht
    // erreichbar (z. B. von einer älteren Version angelegt), wird sie trotzdem
    // geöffnet – sonst würde eine neue, leere Tabelle die Daten „verstecken“.
    var info = dateiInfo_(id);
    if (!info || !info.trashed) {
      try { ss = SpreadsheetApp.openById(id); } catch (err) { ss = null; }
    }
  }
  if (!ss) {
    var doc = DocumentApp.getActiveDocument();
    ss = SpreadsheetApp.create(doc.getName() + ' – Buchwerkstatt');
    try { dateiVerschieben_(ss.getId(), buchOrdner_()); } catch (err) { /* bleibt in „Meine Ablage“ */ }
    var erstes = ss.getSheets()[0];
    erstes.setName(BW_EINTRAG.blatt[sprache_()] || BW_EINTRAG.blatt.en);
    props.setProperty(BW_PROP_DB, ss.getId());
  }
  bwCacheDb_ = ss;
  return ss;
}

function blatt_(ss, def) {
  var sheet = null;
  Object.keys(def.blatt).forEach(function (s) { sheet = sheet || ss.getSheetByName(def.blatt[s]); });
  if (!sheet) sheet = ss.insertSheet(def.blatt[sprache_()] || def.blatt.en);
  if (sheet.getLastRow() === 0) {
    var koepfe = def.koepfe[sprache_()] || def.koepfe.en;
    sheet.getRange(1, 1, 1, koepfe.length).setValues([koepfe]).setFontWeight('bold').setBackground('#f1f3f4');
    sheet.setFrozenRows(1);
    // Alles als reinen Text speichern, sonst macht die Tabelle aus „12. März“ ein Datum.
    sheet.getRange(1, 1, sheet.getMaxRows(), koepfe.length).setNumberFormat('@');
    def.breiten.forEach(function (b, i) { sheet.setColumnWidth(i + 1, b); });
  }
  return sheet;
}

/** Spaltennummer (0-basiert) je Feld, anhand der Überschriften. Fehlende Spalten werden ergänzt. */
function spalten_(sheet, def) {
  var breite = Math.max(sheet.getLastColumn(), 1);
  var koepfe = sheet.getRange(1, 1, 1, breite).getValues()[0].map(String);
  var index = {};
  def.felder.forEach(function (f, i) {
    var pos = -1;
    Object.keys(def.koepfe).forEach(function (s) {
      if (pos < 0) pos = koepfe.indexOf(def.koepfe[s][i]);
    });
    if (pos < 0) {
      var kopf = (def.koepfe[sprache_()] || def.koepfe.en)[i];
      pos = koepfe.length;
      koepfe.push(kopf);
      sheet.getRange(1, pos + 1).setValue(kopf).setFontWeight('bold').setBackground('#f1f3f4');
    }
    index[f] = pos;
  });
  index._breite = koepfe.length;
  return index;
}

function liesTabelle_(sheet, def) {
  var index = spalten_(sheet, def);
  var n = sheet.getLastRow() - 1;
  if (n <= 0) return [];
  var werte = sheet.getRange(2, 1, n, index._breite).getValues();
  var ergebnis = [];
  werte.forEach(function (zeile, i) {
    var obj = {};
    def.felder.forEach(function (f) { obj[f] = alsText_(zeile[index[f]]); });
    var leer = def.felder.every(function (f) { return obj[f] === ''; });
    if (leer) return;
    if (!obj.id) {
      // Zeile wurde von Hand in der Tabelle ergänzt – ID nachtragen.
      obj.id = neueId_();
      sheet.getRange(i + 2, index.id + 1).setValue(obj.id);
    }
    ergebnis.push(obj);
  });
  return ergebnis;
}

function schreibeZeile_(sheet, def, obj) {
  var index = spalten_(sheet, def);
  var nr = zeileVon_(sheet, index, obj.id);
  var zeile;
  if (nr) {
    zeile = sheet.getRange(nr, 1, 1, index._breite).getValues()[0];
  } else {
    zeile = [];
    for (var i = 0; i < index._breite; i++) zeile.push('');
    nr = sheet.getLastRow() + 1;
  }
  def.felder.forEach(function (f) { zeile[index[f]] = obj[f] == null ? '' : String(obj[f]); });
  var bereich = sheet.getRange(nr, 1, 1, index._breite);
  bereich.setNumberFormat('@');
  bereich.setValues([zeile]);
}

function loescheZeile_(sheet, def, id) {
  var nr = zeileVon_(sheet, spalten_(sheet, def), id);
  if (nr) sheet.deleteRow(nr);
}

function zeileVon_(sheet, index, id) {
  if (!id || sheet.getLastRow() < 2) return 0;
  var treffer = sheet.getRange(2, index.id + 1, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(id)).matchEntireCell(true).findNext();
  return treffer ? treffer.getRow() : 0;
}

/* ------------------------------------------------------------------ */
/* Umwandlung Zeile ⇄ Eintrag                                          */
/* ------------------------------------------------------------------ */

function eintragZuZeile_(e) {
  return {
    id: e.id,
    art: e.art,
    name: e.name,
    aliase: (e.aliase || []).join(', '),
    text: e.text,
    felder: felderZuText_(e.felder || {}),
    bezug: (e.bezug || []).join(', '),
    status: e.status,
    anker: e.anker,
    kapitel: e.kapitel,
    blatt: e.blatt,
    erstellt: e.erstellt,
    geaendert: e.geaendert,
    ankertext: e.ankertext || ''
  };
}

function eintragAusZeile_(z) {
  return {
    id: z.id,
    art: (z.art || 'notiz').toLowerCase(),
    name: z.name,
    aliase: liste_(z.aliase),
    text: z.text,
    felder: felderAusText_(z.felder),
    bezug: liste_(z.bezug),
    status: z.status,
    anker: z.anker,
    kapitel: z.kapitel,
    blatt: z.blatt,
    erstellt: z.erstellt,
    geaendert: z.geaendert,
    ankertext: z.ankertext || ''
  };
}

/**
 * Felder werden lesbar gespeichert: eine Zeile pro Feld, „Alter: 34“.
 * Antworten über mehrere Zeilen werden eingerückt fortgesetzt:
 *   Kindheit: Wuchs am Hafen auf.
 *     Der Vater verschwand, als sie fünf war.
 */
function felderZuText_(felder) {
  return Object.keys(felder)
    .filter(function (k) { return String(felder[k] || '').trim() !== ''; })
    .map(function (k) { return k + ': ' + String(felder[k]).trim().split('\n').join('\n  '); })
    .join('\n');
}

function felderAusText_(text) {
  var felder = {}, letztes = null;
  String(text || '').split('\n').forEach(function (zeile) {
    if (/^\s/.test(zeile) && letztes) {
      felder[letztes] += '\n' + zeile.trim();
      return;
    }
    var m = zeile.match(/^([^:]{1,60}):\s?(.*)$/);
    if (!m) return;
    letztes = m[1].trim();
    felder[letztes] = m[2].trim();
  });
  return felder;
}

function liste_(text) {
  return String(text || '').split(',').map(function (s) { return s.trim(); }).filter(String);
}

function alsText_(wert) {
  if (wert instanceof Date) return Utilities.formatDate(wert, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  return wert == null ? '' : String(wert);
}

function zeitstempel_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}

function neueId_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 10);
}
