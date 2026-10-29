/**
 * Buchwerkstatt – Notizen, Figuren, Orte, Zeitstrahl und Pinnwand
 * direkt neben dem Manuskript in Google Docs.
 *
 * Einstiegspunkte: Menü, Seitenleiste und das Einbinden der HTML-Teile.
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
