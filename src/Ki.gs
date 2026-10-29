/**
 * KI-Hilfe mit Claude (Anthropic).
 *
 * - Felder füllen: Aus Freitext und allen Notizen zu einer Karte werden die
 *   Felder (Alter, Beruf …), weitere Namen und Beziehungen herausgesucht.
 *   Das Ergebnis ist nur ein Vorschlag – übernommen wird erst nach Bestätigung.
 * - Widersprüche prüfen: Findet Unstimmigkeiten in allem, was zu einer Karte
 *   notiert wurde („grüne Augen“ in Kap. 3, „braune Augen“ in Kap. 17).
 *
 * Der API-Schlüssel liegt in den Benutzer-Eigenschaften – er ist nur für die
 * Person sichtbar, die ihn eingetragen hat, und steht nicht im Dokument.
 */

var BW_KI_URL = 'https://api.anthropic.com/v1/messages';
var BW_PROP_KI = 'BW_ANTHROPIC_KEY';

function bwKiStatus() {
  var key = PropertiesService.getUserProperties().getProperty(BW_PROP_KI);
  return { aktiv: !!key, ende: key ? key.slice(-4) : '' };
}

function bwKiSchluesselSetzen(key) {
  var props = PropertiesService.getUserProperties();
  key = String(key || '').trim();
  if (key) props.setProperty(BW_PROP_KI, key); else props.deleteProperty(BW_PROP_KI);
  return bwKiStatus();
}

/**
 * anfrage = { art, name, felder: ['Alter', …], vorhanden: {Alter: '34'}, text, notizen: ['…'], namen: ['Heinrich', …] }
 * Antwort  = { felder: {Alter: '…'}, aliase: ['…'], beziehungen: [{name, art}] }
 */
function bwKiFelder(anfrage) {
  var schluessel = anfrage.felder.map(function (f, i) { return 'f' + i; });
  var eigenschaften = {};
  anfrage.felder.forEach(function (f, i) {
    eigenschaften[schluessel[i]] = { type: 'string', description: f };
  });
  var schema = {
    type: 'object',
    properties: {
      felder: { type: 'object', properties: eigenschaften, required: schluessel, additionalProperties: false },
      aliase: { type: 'array', items: { type: 'string' } },
      beziehungen: {
        type: 'array',
        items: {
          type: 'object',
          properties: { name: { type: 'string' }, art: { type: 'string' } },
          required: ['name', 'art'],
          additionalProperties: false
        }
      }
    },
    required: ['felder', 'aliase', 'beziehungen'],
    additionalProperties: false
  };

  var system = 'Du unterstützt eine Romanautorin beim Pflegen ihrer Kartei (Figuren, Orte, Gegenstände). ' +
    'Du liest ihre Notizen und trägst die Angaben in Felder ein. Halte dich streng an den Text: ' +
    'nichts erfinden, nichts ausschmücken. Steht zu einem Feld nichts im Text, gib einen leeren String zurück. ' +
    'Schreibe knapp und stichpunktartig auf Deutsch, so wie man es auf eine Karteikarte schreibt. ' +
    'Widersprechen sich Angaben, nimm die neueste und hänge „(früher: …)“ an.';

  var felderListe = anfrage.felder.map(function (f, i) {
    var alt = anfrage.vorhanden && anfrage.vorhanden[f] ? ' (bisher: „' + anfrage.vorhanden[f] + '“)' : '';
    return schluessel[i] + ' = ' + f + alt;
  }).join('\n');

  var prompt = 'Karte: ' + anfrage.art + ' „' + anfrage.name + '“\n\n' +
    'Felder (Schlüssel = Bedeutung):\n' + felderListe + '\n\n' +
    'Freitext der Karte:\n' + (anfrage.text || '(leer)') + '\n\n' +
    (anfrage.notizen && anfrage.notizen.length ? 'Notizen, die diese Karte erwähnen (älteste zuerst):\n- ' + anfrage.notizen.join('\n- ') + '\n\n' : '') +
    'Andere Karten in diesem Buch: ' + (anfrage.namen || []).join(', ') + '\n\n' +
    'Zusätzlich:\n' +
    '- aliase: andere Bezeichnungen, unter denen „' + anfrage.name + '“ im Text vorkommt (Spitznamen, Rollen wie „der Vater“, Nachname). Nur was im Text steht.\n' +
    '- beziehungen: Verbindungen zu anderen Karten aus der Liste oben. name = genau der Name aus der Liste, art = kurze Bezeichnung aus Sicht von „' + anfrage.name + '“, z. B. „Tochter von“, „wohnt in“, „gehört“.';

  var antwort = kiAnfrage_(system, prompt, schema, 4000);
  var felder = {};
  anfrage.felder.forEach(function (f, i) { felder[f] = antwort.felder[schluessel[i]] || ''; });
  return { felder: felder, aliase: antwort.aliase || [], beziehungen: antwort.beziehungen || [] };
}

/**
 * anfrage = { art, name, text, felder: {…}, notizen: [{kapitel, text}], ereignisse: [{datum, text}] }
 * Antwort  = { befunde: [{ art: 'widerspruch'|'hinweis', text, belege: ['…'] }] }
 */
function bwKiPruefen(anfrage) {
  var schema = {
    type: 'object',
    properties: {
      befunde: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            art: { type: 'string', enum: ['widerspruch', 'hinweis'] },
            text: { type: 'string' },
            belege: { type: 'array', items: { type: 'string' } }
          },
          required: ['art', 'text', 'belege'],
          additionalProperties: false
        }
      }
    },
    required: ['befunde'],
    additionalProperties: false
  };
  var system = 'Du bist eine sorgfältige Lektorin und achtest auf Kontinuität in einem Roman. ' +
    'Du bekommst alles, was die Autorin zu einer Figur, einem Ort oder Gegenstand notiert hat. ' +
    'Melde nur echte Unstimmigkeiten (Widersprüche bei Aussehen, Alter, Namen, Zeitabläufen, Orten) ' +
    'und höchstens drei kurze Hinweise auf offensichtliche Lücken. Keine Stilkritik, keine Vorschläge zur Handlung. ' +
    'Zitiere in „belege“ die betroffenen Stellen wörtlich und kurz, mit Kapitel. Antworte auf Deutsch. ' +
    'Wenn alles stimmig ist, gib eine leere Liste zurück.';
  var felder = Object.keys(anfrage.felder || {}).map(function (k) { return k + ': ' + anfrage.felder[k]; }).join('\n');
  var prompt = anfrage.art + ' „' + anfrage.name + '“\n\nFelder:\n' + (felder || '(keine)') +
    '\n\nFreitext:\n' + (anfrage.text || '(leer)') +
    '\n\nNotizen:\n' + ((anfrage.notizen || []).map(function (n) { return '- [' + (n.kapitel || 'ohne Kapitel') + '] ' + n.text; }).join('\n') || '(keine)') +
    '\n\nZeitstrahl:\n' + ((anfrage.ereignisse || []).map(function (z) { return '- ' + z.datum + ': ' + z.text; }).join('\n') || '(keine)');
  return kiAnfrage_(system, prompt, schema, 4000);
}

function kiAnfrage_(system, prompt, schema, maxTokens) {
  var key = PropertiesService.getUserProperties().getProperty(BW_PROP_KI);
  if (!key) throw new Error('Für die KI-Hilfe fehlt noch der API-Schlüssel (Einstellungen → KI).');
  var modell = einstellungen_().kiModell || BW_STANDARD.kiModell;
  var body = {
    model: modell,
    max_tokens: maxTokens,
    system: system,
    messages: [{ role: 'user', content: prompt }],
    output_config: { effort: 'low', format: { type: 'json_schema', schema: schema } }
  };
  var headers = { 'x-api-key': key, 'anthropic-version': '2026-10-21' };
  // Lehnt das Modell eine Anfrage ab, springt serverseitig automatisch ein passendes anderes ein.
  if (/opus-5|fable|sonnet-5-5/.test(modell)) {
    body.fallbacks = 'default';
    headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
  }
  var antwort = UrlFetchApp.fetch(BW_KI_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: headers,
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });
  var code = antwort.getResponseCode();
  var daten = {};
  try { daten = JSON.parse(antwort.getContentText()); } catch (err) { daten = {}; }
  if (code !== 200) {
    var meldung = daten.error && daten.error.message ? daten.error.message : 'HTTP ' + code;
    if (code === 401) meldung = 'Der API-Schlüssel wurde nicht akzeptiert. Bitte in den Einstellungen prüfen.';
    if (code === 429 || code === 529) meldung = 'Die KI ist gerade ausgelastet. Bitte gleich noch einmal versuchen.';
    throw new Error('KI: ' + meldung);
  }
  if (daten.stop_reason === 'refusal') throw new Error('KI: Die Anfrage wurde abgelehnt.');
  if (daten.stop_reason === 'max_tokens') throw new Error('KI: Die Antwort war zu lang. Bitte mit weniger Text versuchen.');
  var text = (daten.content || []).filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('');
  return JSON.parse(text);
}
