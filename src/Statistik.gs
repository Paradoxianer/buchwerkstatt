/**
 * Schreibziel und Statistik: Die Wortzahl des Manuskripts wird pro Tag
 * gemerkt (Blatt „Statistik“). „Heute geschrieben“ ist der Zuwachs seit dem
 * letzten Stand vom Vortag.
 */

var BW_STATISTIK = {
  blatt: { de: 'Statistik', en: 'Statistics', fr: 'Statistiques', es: 'Estadísticas', it: 'Statistiche', pt: 'Estatísticas', nl: 'Statistieken' },
  felder: ['id', 'start', 'woerter'],
  koepfe: {
    de: ['Datum', 'Wörter am Morgen', 'Wörter zuletzt'],
    en: ['Date', 'Words in the morning', 'Words latest'],
    fr: ['Date', 'Mots le matin', 'Mots en dernier'],
    es: ['Fecha', 'Palabras por la mañana', 'Palabras al final'],
    it: ['Data', 'Parole al mattino', 'Parole alla fine'],
    pt: ['Data', 'Palavras de manhã', 'Palavras no fim'],
    nl: ['Datum', 'Woorden ’s ochtends', 'Woorden laatst']
  },
  breiten: [110, 140, 140]
};

function bwStatistik() {
  var woerter = wortzahl_();
  var heute = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var sheet = blatt_(datenbank_(), BW_STATISTIK);
  var tage = liesTabelle_(sheet, BW_STATISTIK);
  var eintrag = tage.filter(function (t) { return t.id === heute; })[0];
  if (!eintrag) {
    var vorher = tage.filter(function (t) { return t.id < heute; }).sort(function (a, b) { return a.id < b.id ? -1 : 1; }).pop();
    eintrag = { id: heute, start: String(vorher ? vorher.woerter : woerter), woerter: String(woerter) };
    tage.push(eintrag);
  } else {
    eintrag.woerter = String(woerter);
  }
  schreibeZeile_(sheet, BW_STATISTIK, eintrag);
  var verlauf = tage
    .sort(function (a, b) { return a.id < b.id ? -1 : 1; })
    .slice(-30)
    .map(function (t) { return { datum: t.id, geschrieben: Math.max(0, Number(t.woerter) - Number(t.start)), gesamt: Number(t.woerter) }; });
  return { gesamt: woerter, heute: Math.max(0, woerter - Number(eintrag.start)), verlauf: verlauf };
}

function wortzahl_() {
  var doc = DocumentApp.getActiveDocument();
  var summe = 0;
  tabsOderDokument_(doc).forEach(function (t) {
    var text = inhalt_(doc, t).getBody().getText();
    var treffer = text.match(/[^\s]+/g);
    summe += treffer ? treffer.length : 0;
  });
  return summe;
}
