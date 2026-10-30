/**
 * Personenblätter: Zu jeder Karte (Person, Ort, Gegenstand …) entsteht ein
 * eigenes kleines Google Doc im Ordner „<Buch> – Welt“.
 *
 * Wozu? In Google Docs kann man mit „@Lena“ auf ein Dokument namens „Lena“
 * verweisen (Smart Chip). Das funktioniert auch in der Docs-App am iPhone,
 * ganz ohne Add-on. Die Blätter verlinken sich außerdem gegenseitig.
 *
 * Den Inhalt baut die Seitenleiste zusammen; hier wird er nur geschrieben.
 * blatt = { id, titel, untertitel, fusszeile, blattId, abschnitte: [{ titel, zeilen: [[{t, z}]] }] }
 * Eine Zeile ist eine Liste von Stücken; z = ID einer anderen Karte → Link.
 */

function bwBlaetterSync(blaetter) {
  if (!blaetter || !blaetter.length) return {};
  var ss = datenbank_();
  var sheet = blatt_(ss, BW_EINTRAG);
  var eintraege = liesTabelle_(sheet, BW_EINTRAG);
  var bilder = bilderLesen_(ss);
  var blattVon = {};
  eintraege.forEach(function (e) { if (e.blatt) blattVon[e.id] = e.blatt; });

  var ordner = null;
  var ergebnis = {};

  // 1. Jede Karte bekommt ein Dokument (fehlende anlegen, umbenannte umbenennen).
  blaetter.forEach(function (b) {
    var bisher = blattVon[b.id] || b.blattId;
    var info = dateiInfo_(bisher);
    var id;
    if (!info && bisher && dokumentDa_(bisher)) {
      // Drive sieht das Blatt nicht, weil es jemand anderes angelegt hat (beim
      // gemeinsamen Schreiben) – öffnen lässt es sich aber: weiterverwenden.
      id = bisher;
      var fremd = DocumentApp.openById(id);
      if (fremd.getName() !== b.titel) fremd.setName(b.titel);
    } else if (!info || info.trashed) {
      ordner = ordner || weltOrdner_();
      id = DocumentApp.create(b.titel).getId();
      dateiVerschieben_(id, ordner);
    } else {
      id = info.id;
      if (info.name !== b.titel) dateiUmbenennen_(id, b.titel);
    }
    blattVon[b.id] = id;
    ergebnis[b.id] = id;
  });

  // 2. Inhalte schreiben – jetzt kennen wir alle Ziele für Links.
  // Klappt ein Blatt nicht, sollen die anderen trotzdem fertig werden.
  var fehler = [];
  blaetter.forEach(function (b) {
    try {
      schreibeBlatt_(blattVon[b.id], b, blattVon, bilder[b.id]);
    } catch (err) {
      console.error('Personenblatt „' + b.titel + '“: ' + (err && err.stack || err));
      fehler.push(b.titel + ': ' + (err && err.message || err));
    }
  });

  // 3. Neue Blatt-IDs in der Tabelle merken.
  eintraege.forEach(function (e) {
    if (ergebnis[e.id] && e.blatt !== ergebnis[e.id]) {
      e.blatt = ergebnis[e.id];
      schreibeZeile_(sheet, BW_EINTRAG, e);
    }
  });
  if (fehler.length) throw new Error(fehler.join('\n'));
  return ergebnis;
}

function dokumentDa_(id) {
  try {
    DocumentApp.openById(id);
    return true;
  } catch (err) {
    return false;
  }
}

function schreibeBlatt_(docId, b, blattVon, bild) {
  var doc = DocumentApp.openById(docId);
  var body = doc.getBody();
  body.clear();
  // Hier wird bewusst nichts verkettet: Einige Apps-Script-Methoden geben
  // nichts zurück (z. B. setText), und dann bricht die Kette mit „null“ ab.
  var titel = body.getParagraphs()[0];
  titel.setText(b.titel || '');
  titel.setHeading(DocumentApp.ParagraphHeading.TITLE);
  if (b.untertitel) absatz_(body, b.untertitel, DocumentApp.ParagraphHeading.SUBTITLE);
  var blob = bildBlob_(bild);
  if (blob) {
    var bildAbsatz = absatz_(body, '', DocumentApp.ParagraphHeading.NORMAL);
    var grafik = bildAbsatz.appendInlineImage(blob);
    var breite = 180;
    grafik.setHeight(Math.round(grafik.getHeight() * breite / grafik.getWidth()));
    grafik.setWidth(breite);
  }
  (b.abschnitte || []).forEach(function (a) {
    if (!a.zeilen || !a.zeilen.length) return;
    if (a.titel) absatz_(body, a.titel, DocumentApp.ParagraphHeading.HEADING2);
    a.zeilen.forEach(function (stuecke) {
      var absatz = absatz_(body, '', DocumentApp.ParagraphHeading.NORMAL);
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
  absatz_(body, '', DocumentApp.ParagraphHeading.NORMAL);
  var fuss = absatz_(body, b.fusszeile || '', DocumentApp.ParagraphHeading.NORMAL).editAsText();
  fuss.setItalic(true);
  fuss.setFontSize(9);
  fuss.setForegroundColor('#80868b');
  doc.saveAndClose();
}

function absatz_(body, text, ueberschrift) {
  var absatz = body.appendParagraph(String(text));
  absatz.setHeading(ueberschrift);
  return absatz;
}

/** Ordner „<Buch> – Welt“ im Buch-Ordner. Gibt die Ordner-ID zurück. */
function weltOrdner_() {
  var props = PropertiesService.getDocumentProperties();
  var id = props.getProperty(BW_PROP_ORDNER);
  if (id && dateiNutzbar_(id)) return id;
  var doc = DocumentApp.getActiveDocument();
  id = ordnerAnlegen_(doc.getName() + ' – ' + tx_('ordner'), buchOrdner_());
  props.setProperty(BW_PROP_ORDNER, id);
  return id;
}
