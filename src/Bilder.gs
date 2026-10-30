/**
 * Bilder zu Karten (Personen, Orte, Gegenstände): hochgeladen oder von Gemini erzeugt.
 *
 * - Das Original liegt als JPEG im Welt-Ordner in Drive („Lena.jpg“).
 * - Ein kleines Vorschaubild (256 px, als data:-URL) steht im Blatt „Bilder“
 *   der Tabelle. So kann die Seitenleiste es ohne Drive-Freigaben anzeigen,
 *   und auch Mitschreibende sehen es.
 * - Verkleinert wird schon in der Seitenleiste (Canvas); hier wird nur gespeichert.
 *
 * Ein eigenes Blatt statt einer Spalte in „Einträge“: So kann normales Speichern
 * einer Karte (bwSpeichern) kein Bild überschreiben, und die Einträge bleiben lesbar.
 */

var BW_BILD = {
  blatt: { de: 'Bilder', en: 'Images', fr: 'Images', es: 'Imágenes', it: 'Immagini', pt: 'Imagens', nl: 'Afbeeldingen' },
  felder: ['id', 'bild', 'datei'],
  koepfe: {
    de: ['ID', 'Vorschau', 'Datei'],
    en: ['ID', 'Preview', 'File'],
    fr: ['ID', 'Aperçu', 'Fichier'],
    es: ['ID', 'Vista previa', 'Archivo'],
    it: ['ID', 'Anteprima', 'File'],
    pt: ['ID', 'Pré-visualização', 'Ficheiro'],
    nl: ['ID', 'Voorbeeld', 'Bestand']
  },
  breiten: [90, 200, 200]
};

// Eine Tabellenzelle fasst 50.000 Zeichen.
var BW_BILD_MAX = 49000;

/** { Karten-ID: data:-URL } – ohne das Blatt anzulegen, wenn es (noch) keine Bilder gibt. */
function bilderLesen_(ss) {
  var sheet = vorhandenesBlatt_(ss, BW_BILD);
  var bilder = {};
  if (!sheet) return bilder;
  liesTabelle_(sheet, BW_BILD).forEach(function (z) { if (z.bild) bilder[z.id] = z.bild; });
  return bilder;
}

function vorhandenesBlatt_(ss, def) {
  var sheet = null;
  Object.keys(def.blatt).forEach(function (s) { sheet = sheet || ss.getSheetByName(def.blatt[s]); });
  return sheet;
}

/**
 * bild = { klein: 'data:image/jpeg;base64,…' (Vorschau), gross: '…' (Base64 ohne Präfix), name }
 * Ersetzt ein vorhandenes Bild (das alte Original wandert in den Papierkorb).
 */
function bwBildSetzen(id, bild) {
  if (!bild || !/^data:image\/(jpeg|png|webp);base64,/.test(bild.klein || '')) throw new Error('Bild fehlt');
  if (bild.klein.length > BW_BILD_MAX) throw new Error(tx_('bildZuGross'));
  var ss = datenbank_();
  var sheet = blatt_(ss, BW_BILD);
  var alt = liesTabelle_(sheet, BW_BILD).filter(function (z) { return z.id === id; })[0];

  var datei = '';
  if (bild.gross) {
    var blob = Utilities.newBlob(Utilities.base64Decode(bild.gross), 'image/jpeg', (bild.name || 'Bild') + '.jpg');
    var ordner = null;
    try { ordner = weltOrdner_(); } catch (err) { ordner = null; }
    datei = Drive.Files.create(ordner ? { name: blob.getName(), parents: [ordner] } : { name: blob.getName() }, blob).id;
  }
  if (alt && alt.datei && alt.datei !== datei) dateiInPapierkorb_(alt.datei);
  schreibeZeile_(sheet, BW_BILD, { id: id, bild: bild.klein, datei: datei });
  return { bild: bild.klein, datei: datei };
}

function bwBildEntfernen(id) {
  bildLoeschen_(datenbank_(), id);
  return true;
}

/** Auch beim Löschen einer Karte. */
function bildLoeschen_(ss, id) {
  var sheet = vorhandenesBlatt_(ss, BW_BILD);
  if (!sheet) return;
  var alt = liesTabelle_(sheet, BW_BILD).filter(function (z) { return z.id === id; })[0];
  if (!alt) return;
  if (alt.datei) dateiInPapierkorb_(alt.datei);
  loescheZeile_(sheet, BW_BILD, id);
}

/** Das Vorschaubild als Blob – für die Personenblätter. */
function bildBlob_(dataUrl) {
  var m = /^data:(image\/[a-z]+);base64,(.*)$/.exec(dataUrl || '');
  return m ? Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], 'bild') : null;
}
