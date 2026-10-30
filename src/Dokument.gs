/**
 * Alles, was direkt mit dem Manuskript zu tun hat:
 * Cursor lesen, Notizen an Textstellen heften, zu Textstellen springen,
 * Kapitel erkennen und Namen farbig markieren.
 *
 * Textstellen sind unsichtbare „benannte Bereiche“ (Named Ranges). Sie wandern
 * beim Schreiben mit. Ist beim Anheften Text markiert, umfasst der Bereich genau
 * diesen Text (z. B. ein Wort), sonst den ganzen Absatz unter dem Cursor.
 * Gespeichert wird „TabId|BereichId“, damit Dokumente mit Tabs funktionieren.
 */

var BW_ANKER_NAME = 'bw-notiz';
var BW_PROP_MARKIERT = 'BW_MARKIERT';

/** Was steht gerade am Cursor? Wird von der Seitenleiste regelmäßig abgefragt. */
function bwCursor() {
  var doc = DocumentApp.getActiveDocument();
  var el = null, text = '', offset = 0;
  var cursor = doc.getCursor();
  if (cursor) {
    el = cursor.getElement();
    var umgebung = cursor.getSurroundingText();
    text = umgebung ? umgebung.getText() : '';
    offset = cursor.getSurroundingTextOffset();
  } else {
    var auswahl = doc.getSelection();
    if (auswahl) {
      var teil = auswahl.getRangeElements()[0];
      el = teil.getElement();
      if (el.editAsText) {
        text = el.editAsText().getText();
        offset = teil.isPartial() ? teil.getStartOffset() : 0;
      }
    }
  }
  // Nebenbei: Hat das große Fenster etwas geändert? (siehe fensterStand_)
  var fenster = fensterStand_();
  if (!el) return fenster ? { fenster: fenster } : null;
  var tab = aktivesTab_(doc);
  var oben = oberstes_(el);
  var info = oben ? kapitelVon_(inhalt_(doc, tab).getBody(), oben) : { kapitel: '', index: -1 };
  return {
    text: text.length > 4000 ? text.slice(0, 4000) : text,
    offset: offset,
    kapitel: info.kapitel,
    pos: info.index,
    tab: tab ? tab.getId() : '',
    fenster: fenster
  };
}

/**
 * Kapitel, Reihenfolge und (bei Wort-Ankern) den Text aller angehefteten Notizen.
 * pos: ganze Zahl = Absatz, Nachkommastellen = Position im Absatz.
 */
function bwTextstellen() {
  var doc = DocumentApp.getActiveDocument();
  var ergebnis = {};
  tabsOderDokument_(doc).forEach(function (t, tabNr) {
    var inhalt = inhalt_(doc, t);
    var body = inhalt.getBody();
    var kapitelListe = kapitelListe_(body);
    inhalt.getNamedRanges(BW_ANKER_NAME).forEach(function (nr) {
      var teile = nr.getRange().getRangeElements();
      if (!teile.length) return;
      var oben = oberstes_(teile[0].getElement());
      if (!oben) return;
      var index = body.getChildIndex(oben);
      var teilweise = teile[0].isPartial();
      ergebnis[(t ? t.getId() : '') + '|' + nr.getId()] = {
        kapitel: kapitelAnIndex_(kapitelListe, index),
        pos: tabNr * 1000000 + index + (teilweise ? Math.min(teile[0].getStartOffset(), 9999) / 10000 : 0),
        tab: t ? t.getId() : '',
        text: teilweise ? bereichText_(teile) : ''
      };
    });
  });
  return ergebnis;
}

/** Setzt den Cursor an die Textstelle einer Notiz. */
function bwZuTextstelle(anker) {
  var doc = DocumentApp.getActiveDocument();
  var teile = String(anker || '').split('|');
  var tab = teile[0] ? tabMitId_(doc, teile[0]) : null;
  var nr = inhalt_(doc, tab).getNamedRangeById(teile[1]);
  if (!nr) return false;
  var teile = nr.getRange().getRangeElements();
  var el = teile[0].getElement();
  if (tab) {
    try { doc.setActiveTab(tab.getId()); } catch (err) { /* ältere Docs ohne Tabs */ }
  }
  if (teile[0].isPartial()) {
    // An ein Wort geheftet: das Wort markieren, damit man sofort sieht, wo die Notiz hingehört.
    doc.setSelection(nr.getRange());
    return true;
  }
  var ziel = inhalt_(doc, tab);
  var position = function (e) { return ziel.newPosition ? ziel.newPosition(e, 0) : doc.newPosition(e, 0); };
  try {
    doc.setCursor(position(el));
  } catch (err) {
    // Tabellen u. Ä. haben keine Cursor-Position – dann in den ersten Text darin.
    var text = el.findElement ? el.findElement(DocumentApp.ElementType.TEXT) : null;
    if (!text) return false;
    doc.setCursor(position(text.getElement()));
  }
  return true;
}

/**
 * Erzeugt einen Anker an der aktuellen Stelle:
 * markierter Text → genau dieser Text, sonst der Absatz unter dem Cursor.
 * Ergebnis: { anker, kapitel, ankertext, pos, tab } oder null (kein Cursor im Text).
 */
function anheften_() {
  var doc = DocumentApp.getActiveDocument();
  var tab = aktivesTab_(doc);
  var inhalt = inhalt_(doc, tab);
  var bereich = (inhalt.newRange ? inhalt.newRange() : doc.newRange());
  var erstes = null, ankertext = '', versatz = 0;
  var auswahl = doc.getSelection();
  var cursor = doc.getCursor();
  if (auswahl) {
    var teile = auswahl.getRangeElements().filter(function (r) { return oberstes_(r.getElement()); });
    if (!teile.length) return null;
    teile.forEach(function (r) {
      if (r.isPartial()) bereich.addElement(r.getElement().asText(), r.getStartOffset(), r.getEndOffsetInclusive());
      else bereich.addElement(r.getElement());
    });
    erstes = teile[0].getElement();
    versatz = teile[0].isPartial() ? teile[0].getStartOffset() : 0;
    ankertext = bereichText_(teile);
  } else if (cursor) {
    erstes = oberstes_(cursor.getElement());
    if (!erstes) return null; // z. B. in Kopf- oder Fußzeile
    bereich.addElement(erstes);
  } else {
    return null;
  }
  var oben = oberstes_(erstes);
  if (!oben) return null;
  var nr = inhalt.addNamedRange(BW_ANKER_NAME, bereich.build());
  var info = kapitelVon_(inhalt.getBody(), oben);
  return {
    anker: (tab ? tab.getId() : '') + '|' + nr.getId(),
    kapitel: info.kapitel,
    ankertext: ankertext,
    pos: info.index + Math.min(versatz, 9999) / 10000,
    tab: tab ? tab.getId() : ''
  };
}

/** Der markierte Text eines Bereichs, gekürzt auf ein paar Wörter. */
function bereichText_(teile) {
  var text = teile.map(function (r) {
    var el = r.getElement();
    if (!el.editAsText) return '';
    var t = el.editAsText().getText();
    return r.isPartial() ? t.slice(r.getStartOffset(), r.getEndOffsetInclusive() + 1) : t;
  }).join(' ').replace(/\s+/g, ' ').trim();
  return text.length > 40 ? text.slice(0, 39).trim() + '…' : text;
}

function ankerEntfernen_(anker) {
  try {
    var doc = DocumentApp.getActiveDocument();
    var teile = String(anker).split('|');
    var tab = teile[0] ? tabMitId_(doc, teile[0]) : null;
    var nr = inhalt_(doc, tab).getNamedRangeById(teile[1]);
    if (nr) nr.remove();
  } catch (err) {
    // Textstelle gibt es nicht mehr – nichts zu tun.
  }
}

/**
 * Wo kommt eine Karte vor?
 * begriffe: Namen und „Auch genannt“.
 * Ergebnis: [{kapitel, anzahl, tab, treffer: [{absatz, wort, nr, vor, nach}]}]
 * absatz = Index im Textkörper, nr = das wievielte „wort“ im Absatz (zum Hinspringen),
 * vor/nach = etwas Text drumherum. Je Kapitel höchstens BW_FUND_MAX Treffer mit Text.
 */
var BW_FUND_MAX = 60;

function bwVorkommen(begriffe) {
  var muster = namensmuster_(begriffe);
  if (!muster) return [];
  var doc = DocumentApp.getActiveDocument();
  var ergebnis = [];
  tabsOderDokument_(doc).forEach(function (t) {
    var body = inhalt_(doc, t).getBody();
    var aktuell = null;
    for (var i = 0; i < body.getNumChildren(); i++) {
      var kind = body.getChild(i);
      if (istKapitel_(kind) || !aktuell) {
        var titel = istKapitel_(kind) ? kind.asParagraph().getText().trim() : '';
        aktuell = { kapitel: titel, anzahl: 0, tab: t ? t.getId() : '', treffer: [] };
        ergebnis.push(aktuell);
        if (istKapitel_(kind)) continue;
      }
      fundstellen_(kind.getText ? kind.getText() : '', muster).forEach(function (f) {
        aktuell.anzahl++;
        if (aktuell.treffer.length >= BW_FUND_MAX) return;
        f.absatz = i;
        aktuell.treffer.push(f);
      });
    }
  });
  return ergebnis.filter(function (k) { return k.anzahl > 0; });
}

/** Name als ganzes Wort, auch im Genitiv („Lenas“); längere Namen zuerst. */
function namensmuster_(begriffe) {
  var liste = begriffe.filter(function (b) { return b && b.length > 1; })
    .sort(function (a, b) { return b.length - a.length; })
    .map(function (b) { return b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
  if (!liste.length) return null;
  return new RegExp('(?<![\\p{L}\\p{N}_])(?:' + liste.join('|') + ')(?=s?(?![\\p{L}\\p{N}_]))', 'gu');
}

/** Alle Treffer in einem Absatz, mit etwas Text davor und danach (an Wortgrenzen gekürzt). */
function fundstellen_(text, muster) {
  var funde = [];
  var rand = 45;
  var glatt = function (s) { return s.replace(/\s+/g, ' '); };
  muster.lastIndex = 0;
  var m;
  while ((m = muster.exec(text))) {
    var ende = m.index + m[0].length;
    var vor = text.slice(Math.max(0, m.index - rand), m.index);
    var nach = text.slice(ende, ende + rand);
    if (m.index > rand) vor = '…' + vor.replace(/^\S*\s/, '');
    if (ende + rand < text.length) nach = nach.replace(/\s\S*$/, '') + '…';
    funde.push({ wort: m[0], nr: text.slice(0, m.index).split(m[0]).length - 1, vor: glatt(vor), nach: glatt(nach) });
  }
  return funde;
}

/**
 * Markiert eine Fundstelle aus bwVorkommen: das nr-te „wort“ im Absatz.
 * Hat sich der Text seitdem geändert, landet der Cursor am Anfang des Absatzes (Ergebnis false).
 */
function bwZuFundstelle(tabId, absatz, wort, nr) {
  var doc = DocumentApp.getActiveDocument();
  var tab = tabId ? tabMitId_(doc, tabId) : null;
  if (tab) {
    try { doc.setActiveTab(tab.getId()); } catch (err) { /* ohne Tabs */ }
  }
  var inhalt = inhalt_(doc, tab);
  var body = inhalt.getBody();
  if (absatz >= body.getNumChildren()) return false;
  var el = body.getChild(absatz);
  var muster = String(wort).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var treffer = el.findText ? el.findText(muster) : null;
  for (var k = 0; treffer && k < nr; k++) treffer = el.findText(muster, treffer);
  if (!treffer) {
    bwZuAbsatz(tabId, absatz);
    return false;
  }
  var bereich = inhalt.newRange ? inhalt.newRange() : doc.newRange();
  bereich.addElement(treffer.getElement().asText(), treffer.getStartOffset(), treffer.getEndOffsetInclusive());
  doc.setSelection(bereich.build());
  return true;
}

/** Setzt den Cursor an den Anfang eines Absatzes. */
function bwZuAbsatz(tabId, index) {
  var doc = DocumentApp.getActiveDocument();
  var tab = tabId ? tabMitId_(doc, tabId) : null;
  if (tab) {
    try { doc.setActiveTab(tab.getId()); } catch (err) { /* ohne Tabs */ }
  }
  var inhalt = inhalt_(doc, tab);
  var el = inhalt.getBody().getChild(index);
  var text = el.findElement ? el.findElement(DocumentApp.ElementType.TEXT) : null;
  var ziel = text ? text.getElement() : el;
  doc.setCursor(inhalt.newPosition ? inhalt.newPosition(ziel, 0) : doc.newPosition(ziel, 0));
  return true;
}

/* ------------------------------------------------------------------ */
/* Namen farbig markieren                                              */
/* ------------------------------------------------------------------ */

/** begriffe: [{text, farbe}] – markiert jedes Vorkommen im ganzen Manuskript. */
function bwHervorheben(begriffe) {
  bwHervorhebungEntfernen();
  var doc = DocumentApp.getActiveDocument();
  var anzahl = 0;
  tabsOderDokument_(doc).forEach(function (t) {
    var body = inhalt_(doc, t).getBody();
    begriffe.forEach(function (b) {
      var muster = suchmuster_(b.text);
      var treffer = body.findText(muster);
      while (treffer) {
        treffer.getElement().asText().setBackgroundColor(treffer.getStartOffset(), treffer.getEndOffsetInclusive(), b.farbe);
        anzahl++;
        treffer = body.findText(muster, treffer);
      }
    });
  });
  PropertiesService.getDocumentProperties().setProperty(BW_PROP_MARKIERT, JSON.stringify(begriffe.map(function (b) { return b.text; })));
  return anzahl;
}

/** Entfernt nur die Markierungen, die die Buchwerkstatt gesetzt hat. */
function bwHervorhebungEntfernen() {
  var props = PropertiesService.getDocumentProperties();
  var roh = props.getProperty(BW_PROP_MARKIERT);
  if (!roh) return 0;
  var begriffe = JSON.parse(roh);
  var doc = DocumentApp.getActiveDocument();
  var anzahl = 0;
  tabsOderDokument_(doc).forEach(function (t) {
    var body = inhalt_(doc, t).getBody();
    begriffe.forEach(function (text) {
      var muster = suchmuster_(text);
      var treffer = body.findText(muster);
      while (treffer) {
        treffer.getElement().asText().setBackgroundColor(treffer.getStartOffset(), treffer.getEndOffsetInclusive(), null);
        anzahl++;
        treffer = body.findText(muster, treffer);
      }
    });
  });
  props.deleteProperty(BW_PROP_MARKIERT);
  return anzahl;
}

/** Für das Menü: markiert alle Karten-Namen in ihren Farben. */
function hervorhebenAlle_() {
  var daten = bwLaden();
  var arten = {};
  daten.einstellungen.arten.forEach(function (a) { arten[a.id] = a; });
  var begriffe = [];
  daten.eintraege.forEach(function (e) {
    var art = arten[e.art];
    if (!art || !art.karte || !e.name) return;
    [e.name].concat(e.aliase).forEach(function (n) {
      if (n && n.length > 1) begriffe.push({ text: n, farbe: art.hell });
    });
  });
  return bwHervorheben(begriffe);
}

function suchmuster_(text) {
  var maskiert = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var anfang = /^[A-Za-z0-9]/.test(text) ? '\\b' : '';
  var ende = /[A-Za-z0-9]$/.test(text) ? '\\b' : '';
  return anfang + maskiert + ende;
}

/* ------------------------------------------------------------------ */
/* Hilfsfunktionen für Tabs und Kapitel                                */
/* ------------------------------------------------------------------ */

function aktivesTab_(doc) {
  try {
    return doc.getActiveTab() || null;
  } catch (err) {
    return null;
  }
}

/** Der beschreibbare Inhalt eines Tabs – oder das Dokument selbst ohne Tabs. */
function inhalt_(doc, tab) {
  return tab ? tab.asDocumentTab() : doc;
}

function tabsOderDokument_(doc) {
  var tabs = [];
  try {
    (function sammle(liste) {
      liste.forEach(function (t) {
        tabs.push(t);
        sammle(t.getChildTabs());
      });
    })(doc.getTabs());
  } catch (err) {
    tabs = [];
  }
  return tabs.length ? tabs : [null];
}

function tabMitId_(doc, id) {
  try {
    return doc.getTab(id);
  } catch (err) {
    return null;
  }
}

/** Das Element direkt unter dem Textkörper (Absatz, Listenpunkt, Tabelle). */
function oberstes_(el) {
  var typBody = DocumentApp.ElementType.BODY_SECTION;
  while (el && el.getParent() && el.getParent().getType() !== typBody) {
    el = el.getParent();
  }
  return el && el.getParent() ? el : null;
}

var BW_KAPITEL_EBENEN = [
  DocumentApp.ParagraphHeading.TITLE,
  DocumentApp.ParagraphHeading.HEADING1,
  DocumentApp.ParagraphHeading.HEADING2,
  DocumentApp.ParagraphHeading.HEADING3
];

function istKapitel_(kind) {
  if (kind.getType() !== DocumentApp.ElementType.PARAGRAPH) return false;
  var p = kind.asParagraph();
  return BW_KAPITEL_EBENEN.indexOf(p.getHeading()) >= 0 && p.getText().trim() !== '';
}

/** Nächste Überschrift oberhalb eines Elements. */
function kapitelVon_(body, oben) {
  var index = body.getChildIndex(oben);
  for (var i = index; i >= 0; i--) {
    var kind = body.getChild(i);
    if (istKapitel_(kind)) return { kapitel: kind.asParagraph().getText().trim(), index: index };
  }
  return { kapitel: '', index: index };
}

function kapitelListe_(body) {
  var liste = [];
  for (var i = 0; i < body.getNumChildren(); i++) {
    var kind = body.getChild(i);
    if (istKapitel_(kind)) liste.push({ index: i, titel: kind.asParagraph().getText().trim() });
  }
  return liste;
}

function kapitelAnIndex_(liste, index) {
  var titel = '';
  for (var i = 0; i < liste.length && liste[i].index <= index; i++) titel = liste[i].titel;
  return titel;
}
