/**
 * Buchwerkstatt – Notizen, Figuren, Orte, Zeitstrahl und Pinnwand
 * direkt neben dem Manuskript in Google Docs.
 *
 * Einstiegspunkte: Menü, Seitenleiste, großes Fenster und das Einbinden der HTML-Teile.
 */

function onOpen(e) {
  DocumentApp.getUi()
    .createAddonMenu()
    .addItem(tx_('menueOeffnen'), 'zeigeSeitenleiste')
    .addSeparator()
    .addItem(tx_('menueMarkieren'), 'menueHervorheben')
    .addItem(tx_('menueEntfernen'), 'menueHervorhebungEntfernen')
    .addToUi();
}

function onInstall(e) {
  onOpen(e);
}

function zeigeSeitenleiste() {
  var html = HtmlService.createTemplateFromFile('Sidebar')
    .evaluate()
    .setTitle('Buchwerkstatt');
  DocumentApp.getUi().showSidebar(html);
}

/**
 * Öffnet das große Fenster (Fenster.html) mit einer Ansicht, z. B.
 * ansicht = 'steckbrief', start = { id: 'Karten-ID' }.
 * Das Fenster lässt das Manuskript bedienbar; es kann immer nur eines offen sein.
 */
function bwFensterOeffnen(ansicht, start, titel) {
  var vorlage = HtmlService.createTemplateFromFile('Fenster');
  // Als JSON ins Skript – ohne „<“, damit kein </script> den Block beendet.
  vorlage.start = JSON.stringify({ ansicht: ansicht, start: start || {} }).replace(/</g, '\\u003c');
  var html = vorlage.evaluate().setWidth(980).setHeight(680);
  DocumentApp.getUi().showModelessDialog(html, titel || 'Buchwerkstatt');
  return true;
}

/** Bindet eine weitere HTML-Datei (Styles, Skripte) in die Seitenleiste ein. */
function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

function menueHervorheben() {
  var anzahl = hervorhebenAlle_();
  DocumentApp.getUi().alert('Buchwerkstatt', tx_('markiert', { n: anzahl }), DocumentApp.getUi().ButtonSet.OK);
}

function menueHervorhebungEntfernen() {
  bwHervorhebungEntfernen();
}
