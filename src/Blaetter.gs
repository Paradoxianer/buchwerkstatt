/**
 * Personenblätter: Zu jeder Karte (Person, Ort, Gegenstand …) entsteht ein
 * eigenes kleines Google Doc im Ordner „<Buch> – Welt“.
 *
 * Wozu? In Google Docs kann man mit „@Lena“ auf ein Dokument namens „Lena“
 * verweisen (Smart Chip). Das funktioniert auch in der Docs-App am iPhone,
 * ganz ohne Add-on. Die Blätter verlinken sich außerdem gegenseitig.
 *
 * Den Inhalt baut die Seitenleiste zusammen; hier wird er nur geschrieben.
 * blatt = { id, titel, untertitel, blattId, abschnitte: [{ titel, zeilen: [[{t, z}]] }] }
 * Eine Zeile ist eine Liste von Stücken; z = ID einer anderen Karte → Link.
 */

function bwBlaetterSync(blaetter) {
  if (!blaetter || !blaetter.length) return {};
  var ss = datenbank_();
  var sheet = blatt_(ss, BW_EINTRAG);
  var eintraege = liesTabelle_(sheet, BW_EINTRAG);
  var blattVon = {};
  eintraege.forEach(function (e) { if (e.blatt) blattVon[e.id] = e.blatt; });

  var ordner = null;
  var ergebnis = {};

  // 1. Jede Karte bekommt ein Dokument (fehlende anlegen, umbenannte umbenennen).
  blaetter.forEach(function (b) {
    var id = blattVon[b.id] || b.blattId;
    var datei = null;
    if (id) {
      try {
        datei = DriveApp.getFileById(id);
        if (datei.isTrashed()) datei = null;
      } catch (err) {
        datei = null;
      }
    }
    if (!datei) {
      ordner = ordner || weltOrdner_();
      var neu = DocumentApp.create(b.titel);
      datei = DriveApp.getFileById(neu.getId());
      datei.moveTo(ordner);
    } else if (datei.getName() !== b.titel) {
      datei.setName(b.titel);
    }
    blattVon[b.id] = datei.getId();
    ergebnis[b.id] = datei.getId();
  });

  // 2. Inhalte schreiben – jetzt kennen wir alle Ziele für Links.
  blaetter.forEach(function (b) {
    schreibeBlatt_(blattVon[b.id], b, blattVon);
  });

  // 3. Neue Blatt-IDs in der Tabelle merken.
  eintraege.forEach(function (e) {
    if (ergebnis[e.id] && e.blatt !== ergebnis[e.id]) {
      e.blatt = ergebnis[e.id];
      schreibeZeile_(sheet, BW_EINTRAG, e);
    }
  });
  return ergebnis;
}

function schreibeBlatt_(docId, b, blattVon) {
  var doc = DocumentApp.openById(docId);
  var body = doc.getBody();
  body.clear();
  body.getChild(0).asParagraph().setText(b.titel).setHeading(DocumentApp.ParagraphHeading.TITLE);
  if (b.untertitel) {
    body.appendParagraph(b.untertitel).setHeading(DocumentApp.ParagraphHeading.SUBTITLE);
  }
  (b.abschnitte || []).forEach(function (a) {
    if (!a.zeilen || !a.zeilen.length) return;
    body.appendParagraph(a.titel).setHeading(DocumentApp.ParagraphHeading.HEADING2);
    a.zeilen.forEach(function (stuecke) {
      var absatz = body.appendParagraph('');
      absatz.setHeading(DocumentApp.ParagraphHeading.NORMAL);
      var text = absatz.editAsText();
      var pos = 0;
      stuecke.forEach(function (s) {
        if (!s.t) return;
        text.appendText(s.t);
        var ende = pos + s.t.length - 1;
        if (s.fett) text.setBold(pos, ende, true);
        if (s.z && blattVon[s.z]) text.setLinkUrl(pos, ende, 'https://docs.google.com/document/d/' + blattVon[s.z] + '/edit');
        pos += s.t.length;
      });
    });
  });
  body.appendParagraph('');
  body.appendParagraph('Automatisch erstellt von der Buchwerkstatt. Änderungen bitte in der Seitenleiste vornehmen – sie werden hier überschrieben.')
    .editAsText().setItalic(true).setFontSize(9).setForegroundColor('#80868b');
  doc.saveAndClose();
}

/** Ordner „<Buch> – Welt“ neben dem Manuskript. */
function weltOrdner_() {
  var props = PropertiesService.getDocumentProperties();
  var id = props.getProperty(BW_PROP_ORDNER);
  if (id) {
    try {
      var vorhanden = DriveApp.getFolderById(id);
      if (!vorhanden.isTrashed()) return vorhanden;
    } catch (err) { /* neu anlegen */ }
  }
  var doc = DocumentApp.getActiveDocument();
  var name = doc.getName() + ' – Welt';
  var eltern = DriveApp.getFileById(doc.getId()).getParents();
  var ordner = eltern.hasNext() ? eltern.next().createFolder(name) : DriveApp.createFolder(name);
  props.setProperty(BW_PROP_ORDNER, ordner.getId());
  return ordner;
}
