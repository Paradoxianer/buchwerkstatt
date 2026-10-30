/**
 * Sprachen auf der Server-Seite: Menü, Tabellen-Überschriften, Ordnernamen,
 * Fehlermeldungen und die Standard-Arten (Schlüsselwörter und Felder).
 * Die ausführlichen Steckbriefe mit Bereichen und Leitfragen stehen in Fragebogen.gs;
 * die Felder hier sind die kurze Liste.
 *
 * Die Oberfläche der Seitenleiste übersetzt I18n.html.
 * Neue Sprache: hier in BW_TEXTE und BW_STANDARD_ARTEN ergänzen und in I18n.html.
 */

var BW_SPRACHEN = ['de', 'en', 'fr', 'es', 'it', 'pt', 'nl'];

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
    kiZuLang: 'Die Antwort war zu lang. Bitte mit weniger Text versuchen.',
    keinZugriff: 'Kein Zugriff auf die Tabelle dieses Buchs. Sie gehört wohl jemand anderem. Bitte den Ordner „{ordner}“ in Google Drive für dich freigeben lassen (Bearbeiten) und dann neu laden.'
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
    kiZuLang: 'The answer was too long. Please try with less text.',
    keinZugriff: 'No access to this book’s spreadsheet – it probably belongs to someone else. Please ask them to share the folder “{ordner}” in Google Drive with you (Editor), then reload.'
  },
  fr: {
    sprachName: 'Français',
    menueOeffnen: 'Ouvrir Buchwerkstatt',
    menueMarkieren: 'Surligner les noms dans le texte',
    menueEntfernen: 'Retirer le surlignage',
    markiert: '{n} passages surlignés.',
    ordner: 'Univers',
    kiKeinSchluessel: 'L’aide IA nécessite d’abord une clé API (Plus → Aide IA).',
    ki401: 'La clé API n’a pas été acceptée. Veuillez la vérifier dans les réglages.',
    kiAusgelastet: 'L’IA est très sollicitée en ce moment. Veuillez réessayer dans un instant.',
    kiAbgelehnt: 'La demande a été refusée.',
    kiZuLang: 'La réponse était trop longue. Veuillez réessayer avec moins de texte.',
    keinZugriff: 'Pas d’accès au tableur de ce livre – il appartient sans doute à quelqu’un d’autre. Demande-lui de partager avec toi le dossier « {ordner} » dans Google Drive (Éditeur), puis recharge.'
  },
  es: {
    sprachName: 'Español',
    menueOeffnen: 'Abrir Buchwerkstatt',
    menueMarkieren: 'Resaltar nombres en el texto',
    menueEntfernen: 'Quitar resaltado',
    markiert: '{n} pasajes resaltados.',
    ordner: 'Mundo',
    kiKeinSchluessel: 'La ayuda de IA necesita primero una clave API (Más → Ayuda de IA).',
    ki401: 'La clave API no fue aceptada. Revísala en los ajustes.',
    kiAusgelastet: 'La IA está saturada en este momento. Inténtalo de nuevo en un momento.',
    kiAbgelehnt: 'La solicitud fue rechazada.',
    kiZuLang: 'La respuesta fue demasiado larga. Inténtalo con menos texto.',
    keinZugriff: 'No tienes acceso a la hoja de cálculo de este libro; seguramente pertenece a otra persona. Pídele que comparta contigo la carpeta «{ordner}» en Google Drive (Editor) y vuelve a cargar.'
  },
  it: {
    sprachName: 'Italiano',
    menueOeffnen: 'Apri Buchwerkstatt',
    menueMarkieren: 'Evidenzia i nomi nel testo',
    menueEntfernen: 'Rimuovi evidenziazioni',
    markiert: '{n} punti evidenziati.',
    ordner: 'Mondo',
    kiKeinSchluessel: 'L’aiuto IA richiede prima una chiave API (Altro → Aiuto IA).',
    ki401: 'La chiave API non è stata accettata. Controllala nelle impostazioni.',
    kiAusgelastet: 'L’IA è occupata in questo momento. Riprova tra poco.',
    kiAbgelehnt: 'La richiesta è stata rifiutata.',
    kiZuLang: 'La risposta era troppo lunga. Riprova con meno testo.',
    keinZugriff: 'Nessun accesso al foglio di questo libro: probabilmente appartiene a qualcun altro. Chiedi di condividere con te la cartella «{ordner}» in Google Drive (Editor), poi ricarica.'
  },
  pt: {
    sprachName: 'Português',
    menueOeffnen: 'Abrir Buchwerkstatt',
    menueMarkieren: 'Destacar nomes no texto',
    menueEntfernen: 'Remover destaques',
    markiert: '{n} trechos destacados.',
    ordner: 'Mundo',
    kiKeinSchluessel: 'A ajuda de IA precisa primeiro de uma chave API (Mais → Ajuda de IA).',
    ki401: 'A chave API não foi aceita. Verifique-a nas configurações.',
    kiAusgelastet: 'A IA está sobrecarregada agora. Tente novamente em instantes.',
    kiAbgelehnt: 'O pedido foi recusado.',
    kiZuLang: 'A resposta foi longa demais. Tente com menos texto.',
    keinZugriff: 'Sem acesso à folha de cálculo deste livro – provavelmente pertence a outra pessoa. Pede que partilhem contigo a pasta «{ordner}» no Google Drive (Editor) e volta a carregar.'
  },
  nl: {
    sprachName: 'Nederlands',
    menueOeffnen: 'Buchwerkstatt openen',
    menueMarkieren: 'Namen in de tekst markeren',
    menueEntfernen: 'Markeringen verwijderen',
    markiert: '{n} plekken gemarkeerd.',
    ordner: 'Wereld',
    kiKeinSchluessel: 'AI-hulp heeft eerst een API-sleutel nodig (Meer → AI-hulp).',
    ki401: 'De API-sleutel is niet geaccepteerd. Controleer hem in de instellingen.',
    kiAusgelastet: 'De AI is op dit moment druk. Probeer het zo meteen opnieuw.',
    kiAbgelehnt: 'Het verzoek is geweigerd.',
    kiZuLang: 'Het antwoord was te lang. Probeer het met minder tekst.',
    keinZugriff: 'Geen toegang tot de spreadsheet van dit boek – die is waarschijnlijk van iemand anders. Vraag of de map ‘{ordner}’ in Google Drive met je gedeeld wordt (Bewerker) en laad daarna opnieuw.'
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
  ],
  fr: [
    { id: 'person', name: 'Personnage', mehrzahl: 'Personnages', woerter: ['Personnage', 'Perso'],
      felder: ['Âge', 'Apparence', 'Métier', 'Caractère', 'Origine', 'But / Motivation', 'Façon de parler'] },
    { id: 'ort', name: 'Lieu', mehrzahl: 'Lieux', woerter: ['Lieu', 'Endroit'], felder: ['Type', 'Situation', 'Ambiance', 'Particularités'] },
    { id: 'ding', name: 'Objet', mehrzahl: 'Objets', woerter: ['Objet', 'Chose'], felder: ['Apparence', 'Origine', 'Importance'] },
    { id: 'zeit', name: 'Événement', mehrzahl: 'Chronologie', woerter: ['Quand', 'Date'], felder: [] },
    { id: 'idee', name: 'Idée', mehrzahl: 'Idées', woerter: ['Idée', 'Idee'], felder: [] }
  ],
  es: [
    { id: 'person', name: 'Personaje', mehrzahl: 'Personajes', woerter: ['Personaje', 'Persona'],
      felder: ['Edad', 'Aspecto', 'Profesión', 'Carácter', 'Origen', 'Meta / Motivación', 'Forma de hablar'] },
    { id: 'ort', name: 'Lugar', mehrzahl: 'Lugares', woerter: ['Lugar', 'Sitio'], felder: ['Tipo', 'Ubicación', 'Ambiente', 'Detalles'] },
    { id: 'ding', name: 'Objeto', mehrzahl: 'Objetos', woerter: ['Objeto', 'Cosa'], felder: ['Aspecto', 'Origen', 'Importancia'] },
    { id: 'zeit', name: 'Suceso', mehrzahl: 'Cronología', woerter: ['Cuándo', 'Cuando', 'Fecha'], felder: [] },
    { id: 'idee', name: 'Idea', mehrzahl: 'Ideas', woerter: ['Idea'], felder: [] }
  ],
  it: [
    { id: 'person', name: 'Personaggio', mehrzahl: 'Personaggi', woerter: ['Personaggio', 'Persona'],
      felder: ['Età', 'Aspetto', 'Professione', 'Carattere', 'Origine', 'Obiettivo / Motivazione', 'Modo di parlare'] },
    { id: 'ort', name: 'Luogo', mehrzahl: 'Luoghi', woerter: ['Luogo', 'Posto'], felder: ['Tipo', 'Posizione', 'Atmosfera', 'Particolarità'] },
    { id: 'ding', name: 'Oggetto', mehrzahl: 'Oggetti', woerter: ['Oggetto', 'Cosa'], felder: ['Aspetto', 'Origine', 'Significato'] },
    { id: 'zeit', name: 'Evento', mehrzahl: 'Cronologia', woerter: ['Quando', 'Data'], felder: [] },
    { id: 'idee', name: 'Idea', mehrzahl: 'Idee', woerter: ['Idea'], felder: [] }
  ],
  pt: [
    { id: 'person', name: 'Personagem', mehrzahl: 'Personagens', woerter: ['Personagem', 'Pessoa'],
      felder: ['Idade', 'Aparência', 'Profissão', 'Personalidade', 'Origem', 'Objetivo / Motivação', 'Jeito de falar'] },
    { id: 'ort', name: 'Lugar', mehrzahl: 'Lugares', woerter: ['Lugar', 'Local'], felder: ['Tipo', 'Localização', 'Atmosfera', 'Detalhes'] },
    { id: 'ding', name: 'Objeto', mehrzahl: 'Objetos', woerter: ['Objeto', 'Coisa'], felder: ['Aparência', 'Origem', 'Importância'] },
    { id: 'zeit', name: 'Acontecimento', mehrzahl: 'Linha do tempo', woerter: ['Quando', 'Data'], felder: [] },
    { id: 'idee', name: 'Ideia', mehrzahl: 'Ideias', woerter: ['Ideia', 'Idéia'], felder: [] }
  ],
  nl: [
    { id: 'person', name: 'Personage', mehrzahl: 'Personages', woerter: ['Personage', 'Persoon'],
      felder: ['Leeftijd', 'Uiterlijk', 'Beroep', 'Karakter', 'Achtergrond', 'Doel / Motivatie', 'Manier van praten'] },
    { id: 'ort', name: 'Plaats', mehrzahl: 'Plaatsen', woerter: ['Plaats', 'Locatie'], felder: ['Soort', 'Ligging', 'Sfeer', 'Bijzonderheden'] },
    { id: 'ding', name: 'Voorwerp', mehrzahl: 'Voorwerpen', woerter: ['Voorwerp', 'Ding'], felder: ['Uiterlijk', 'Herkomst', 'Betekenis'] },
    { id: 'zeit', name: 'Gebeurtenis', mehrzahl: 'Tijdlijn', woerter: ['Wanneer', 'Tijd'], felder: [] },
    { id: 'idee', name: 'Idee', mehrzahl: 'Ideeën', woerter: ['Idee'], felder: [] }
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
      woerter: a.woerter.slice(), karte: stil.karte, felder: fragebogen_(sprache, a.id) || a.felder.slice()
    };
  });
}

/** Die kurze Feldliste einer Standard-Art (wie vor den ausführlichen Steckbriefen). */
function kurzeFelder_(sprache, artId) {
  var a = (BW_STANDARD_ARTEN[sprache] || BW_STANDARD_ARTEN.en).filter(function (x) { return x.id === artId; })[0];
  return a ? a.felder.slice() : null;
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
