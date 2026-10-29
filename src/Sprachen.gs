/**
 * Sprachen auf der Server-Seite: Menü, Tabellen-Überschriften, Ordnernamen,
 * Fehlermeldungen und die Standard-Arten (Schlüsselwörter und Felder).
 *
 * Die Oberfläche der Seitenleiste übersetzt I18n.html.
 * Neue Sprache: hier in BW_TEXTE und BW_STANDARD_ARTEN ergänzen und in I18n.html.
 */

var BW_SPRACHEN = ['de', 'en'];

var BW_TEXTE = {
  de: {
    sprachName: 'Deutsch',
    menueOeffnen: 'Buchwerkstatt öffnen',
    menueMarkieren: 'Namen im Text farbig markieren',
    menueEntfernen: 'Markierungen wieder entfernen',
    markiert: '{n} Stellen markiert.',
    ordner: 'Welt',
    kiKeinSchluessel: 'Für die KI-Hilfe fehlt noch der API-Schlüssel (Mehr → KI-Hilfe).',
    ki401: 'Der API-Schlüssel wurde nicht akzeptiert. Bitte in den Einstellungen prüfen.',
    kiAusgelastet: 'Die KI ist gerade ausgelastet. Bitte gleich noch einmal versuchen.',
    kiAbgelehnt: 'Die Anfrage wurde abgelehnt.',
    kiZuLang: 'Die Antwort war zu lang. Bitte mit weniger Text versuchen.'
  },
  en: {
    sprachName: 'English',
    menueOeffnen: 'Open Buchwerkstatt',
    menueMarkieren: 'Highlight names in the text',
    menueEntfernen: 'Remove highlights',
    markiert: '{n} places highlighted.',
    ordner: 'World',
    kiKeinSchluessel: 'AI help needs an API key first (More → AI help).',
    ki401: 'The API key was not accepted. Please check it in the settings.',
    kiAusgelastet: 'The AI is busy right now. Please try again in a moment.',
    kiAbgelehnt: 'The request was declined.',
    kiZuLang: 'The answer was too long. Please try with less text.'
  }
};

var BW_STANDARD_ARTEN = {
  de: [
    { id: 'person', name: 'Person', mehrzahl: 'Personen', woerter: ['Person', 'Figur'],
      felder: ['Alter', 'Aussehen', 'Beruf', 'Charakter', 'Herkunft', 'Ziel / Motivation', 'Sprechweise'] },
    { id: 'ort', name: 'Ort', mehrzahl: 'Orte', woerter: ['Ort'], felder: ['Art', 'Lage', 'Atmosphäre', 'Besonderheiten'] },
    { id: 'ding', name: 'Gegenstand', mehrzahl: 'Gegenstände', woerter: ['Ding', 'Gegenstand'], felder: ['Aussehen', 'Herkunft', 'Bedeutung'] },
    { id: 'zeit', name: 'Ereignis', mehrzahl: 'Zeitstrahl', woerter: ['Zeit', 'Wann'], felder: [] },
    { id: 'idee', name: 'Idee', mehrzahl: 'Ideen', woerter: ['Idee'], felder: [] }
  ],
  en: [
    { id: 'person', name: 'Character', mehrzahl: 'Characters', woerter: ['Character', 'Person'],
      felder: ['Age', 'Appearance', 'Occupation', 'Personality', 'Background', 'Goal / Motivation', 'Voice'] },
    { id: 'ort', name: 'Place', mehrzahl: 'Places', woerter: ['Place', 'Location'], felder: ['Kind', 'Location', 'Atmosphere', 'Details'] },
    { id: 'ding', name: 'Object', mehrzahl: 'Objects', woerter: ['Object', 'Item'], felder: ['Appearance', 'Origin', 'Significance'] },
    { id: 'zeit', name: 'Event', mehrzahl: 'Timeline', woerter: ['Time', 'When'], felder: [] },
    { id: 'idee', name: 'Idea', mehrzahl: 'Ideas', woerter: ['Idea'], felder: [] }
  ]
};

/** Aussehen der Arten – gleich in allen Sprachen. */
var BW_ART_STIL = {
  person: { icon: '👤', farbe: '#3367d6', hell: '#dfe8fb', karte: true },
  ort: { icon: '📍', farbe: '#188038', hell: '#dcf1e3', karte: true },
  ding: { icon: '🔑', farbe: '#b06000', hell: '#fbecd3', karte: true },
  zeit: { icon: '📅', farbe: '#8430ce', hell: '#efe1fb', karte: false },
  idee: { icon: '💡', farbe: '#c5221f', hell: '#fbe0e0', karte: false }
};

function standardArten_(sprache) {
  return (BW_STANDARD_ARTEN[sprache] || BW_STANDARD_ARTEN.en).map(function (a) {
    var stil = BW_ART_STIL[a.id];
    return {
      id: a.id, name: a.name, mehrzahl: a.mehrzahl, icon: stil.icon, farbe: stil.farbe, hell: stil.hell,
      woerter: a.woerter.slice(), karte: stil.karte, felder: a.felder.slice()
    };
  });
}

/** Sprache der Seitenleiste: aus den Einstellungen, sonst aus dem Google-Konto. */
var bwCacheSprache_ = null;
function sprache_() {
  if (bwCacheSprache_) return bwCacheSprache_;
  var s = einstellungenRoh_().sprache;
  if (!s || s === 'auto') s = kontoSprache_();
  bwCacheSprache_ = BW_SPRACHEN.indexOf(s) >= 0 ? s : 'en';
  return bwCacheSprache_;
}

function kontoSprache_() {
  try {
    return String(Session.getActiveUserLocale() || '').slice(0, 2).toLowerCase();
  } catch (err) {
    return '';
  }
}

function tx_(schluessel, werte) {
  var text = (BW_TEXTE[sprache_()] || BW_TEXTE.en)[schluessel] || BW_TEXTE.en[schluessel] || schluessel;
  return text.replace(/\{(\w+)\}/g, function (m, k) { return werte && werte[k] != null ? werte[k] : m; });
}
