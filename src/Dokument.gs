/**
 * Alles, was direkt mit dem Manuskript zu tun hat:
 * Cursor lesen, Notizen an Textstellen heften, zu Textstellen springen,
 * Kapitel erkennen und Namen farbig markieren.
 *
 * Textstellen sind unsichtbare „benannte Bereiche“ (Named Ranges) um den
 * Absatz, an dem die Notiz entstanden ist. Sie wandern beim Schreiben mit.
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
  if (!el) return null;
  var tab = aktivesTab_(doc);
  var oben = oberstes_(el);
  var info = oben ? kapitelVon_(inhalt_(doc, tab).getBody(), oben) : { kapitel: '', index: -1 };
  return {
    text: text.length > 4000 ? text.slice(0, 4000) : text,
    offset: offset,
    kapitel: info.kapitel,
    pos: info.index,
    tab: tab ? tab.getId() : ''
  };
}

/** Kapitel und Reihenfolge aller angehefteten Notizen (für „Hier“ und Sortierung). */
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
      ergebnis[(t ? t.getId() : '') + '|' + nr.getId()] = {
        kapitel: kapitelAnIndex_(kapitelListe, index),
        pos: tabNr * 1000000 + index,
        tab: t ? t.getId() : ''
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
  var el = nr.getRange().getRangeElements()[0].getElement();
  if (tab) {
    try { doc.setActiveTab(tab.getId()); } catch (err) { /* ältere Docs ohne Tabs */ }
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

/** Heftet eine neue Notiz an den Absatz unter dem Cursor. */
function anheften_() {
  var doc = DocumentApp.getActiveDocument();
  var el = null;
  var cursor = doc.getCursor();
  if (cursor) {
    el = cursor.getElement();
  } else {
    var auswahl = doc.getSelection();
    if (auswahl) el = auswahl.getRangeElements()[0].getElement();
  }
  if (!el) return null;
  var oben = oberstes_(el);
  if (!oben) return null; // z. B. in Kopf- oder Fußzeile
  var tab = aktivesTab_(doc);
  var inhalt = inhalt_(doc, tab);
  var bereich = (inhalt.newRange ? inhalt.newRange() : doc.newRange()).addElement(oben).build();
  var nr = inhalt.addNamedRange(BW_ANKER_NAME, bereich);
  var info = kapitelVon_(inhalt.getBody(), oben);
  return {
    anker: (tab ? tab.getId() : '') + '|' + nr.getId(),
    kapitel: info.kapitel,
    pos: info.index,
    tab: tab ? tab.getId() : ''
  };
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
 * In welchen Kapiteln kommt eine Karte vor?
 * begriffe: Namen und „Auch genannt“. Ergebnis: [{kapitel, anzahl, tab, index}]
 * index = erster Absatz im Kapitel mit Treffer (zum Hinspringen).
 */
function bwVorkommen(begriffe) {
  var liste = begriffe.filter(function (b) { return b && b.length > 1; })
    .sort(function (a, b) { return b.length - a.length; })
    .map(function (b) { return b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
  if (!liste.length) return [];
  // Name als ganzes Wort, auch im Genitiv („Lenas“).
  var muster = new RegExp('(?<![\\p{L}\\p{N}_])(?:' + liste.join('|') + ')(?=s?(?![\\p{L}\\p{N}_]))', 'gu');
  var doc = DocumentApp.getActiveDocument();
  var ergebnis = [];
  tabsOderDokument_(doc).forEach(function (t) {
    var body = inhalt_(doc, t).getBody();
    var aktuell = null;
    for (var i = 0; i < body.getNumChildren(); i++) {
      var kind = body.getChild(i);
      if (istKapitel_(kind) || !aktuell) {
        var titel = istKapitel_(kind) ? kind.asParagraph().getText().trim() : '';
        aktuell = { kapitel: titel, anzahl: 0, tab: t ? t.getId() : '', index: -1 };
        ergebnis.push(aktuell);
        if (istKapitel_(kind)) continue;
      }
      var text = kind.getText ? kind.getText() : '';
      var treffer = text.match(muster);
      if (treffer) {
        if (aktuell.index < 0) aktuell.index = i;
        aktuell.anzahl += treffer.length;
      }
    }
  });
  return ergebnis.filter(function (k) { return k.anzahl > 0; });
}

/** Setzt den Cursor an den Anfang eines Absatzes (für „Wo kommt X vor?“). */
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
