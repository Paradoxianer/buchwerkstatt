/**
 * KI-Hilfe mit Claude (Anthropic) oder Gemini (Google).
 *
 * Welche KI, ergibt sich aus dem Schlüssel: „AIza…“ ist ein Google-Schlüssel
 * (aistudio.google.com), alles andere ein Anthropic-Schlüssel.
 *
 * - Felder füllen: Aus Freitext und allen Notizen zu einer Karte werden die
 *   Felder (Alter, Beruf …), weitere Namen und Beziehungen herausgesucht.
 *   Das Ergebnis ist nur ein Vorschlag – übernommen wird erst nach Bestätigung.
 * - Widersprüche prüfen: Findet Unstimmigkeiten in allem, was zu einer Karte
 *   notiert wurde („grüne Augen“ in Kap. 3, „braune Augen“ in Kap. 17).
 *
 * Der API-Schlüssel liegt in den Benutzer-Eigenschaften – er ist nur für die
 * Person sichtbar, die ihn eingetragen hat, und steht nicht im Dokument.
 *
 * Die Anweisungen an die KI sind englisch; geantwortet wird in der Sprache
 * der Seitenleiste (siehe kiSprache_).
 *
 * Alles hier ist optional: Ohne Schlüssel blendet die Seitenleiste die KI aus.
 */

var BW_KI_URL = 'https://api.anthropic.com/v1/messages';
var BW_KI_URL_GOOGLE = 'https://generativelanguage.googleapis.com/v1beta/models/';
var BW_KI_MODELL_GOOGLE = 'gemini-flash-latest';
// Der Name stammt aus der Zeit, als es nur Claude gab – bleibt, damit gespeicherte Schlüssel gelten.
var BW_PROP_KI = 'BW_ANTHROPIC_KEY';
var BW_KI_SPRACHEN = { de: 'German', en: 'English', fr: 'French', es: 'Spanish', it: 'Italian', pt: 'Portuguese', nl: 'Dutch' };

function kiSprache_() {
  return BW_KI_SPRACHEN[sprache_()] || 'English';
}

function bwKiStatus() {
  var key = PropertiesService.getUserProperties().getProperty(BW_PROP_KI);
  return { aktiv: !!key, ende: key ? key.slice(-4) : '', anbieter: key ? kiAnbieter_(key) : '' };
}

function kiAnbieter_(key) {
  return /^AIza/.test(String(key || '').trim()) ? 'google' : 'anthropic';
}

function bwKiSchluesselSetzen(key) {
  var props = PropertiesService.getUserProperties();
  key = String(key || '').trim();
  if (key) props.setProperty(BW_PROP_KI, key); else props.deleteProperty(BW_PROP_KI);
  return bwKiStatus();
}

/**
 * anfrage = { art, name, felder: ['Alter', …], fragen: {Alter: 'Wie alt …?'}, vorhanden: {Alter: '34'}, text, notizen: ['…'], namen: ['Heinrich', …] }
 * (fragen ist optional: die Leitfragen des Steckbriefs, damit die KI weiß, was gemeint ist.)
 * Antwort  = { felder: {Alter: '…'}, aliase: ['…'], beziehungen: [{name, art}] }
 */
function bwKiFelder(anfrage) {
  var schluessel = anfrage.felder.map(function (f, i) { return 'f' + i; });
  var eigenschaften = {};
  anfrage.felder.forEach(function (f, i) {
    var frage = anfrage.fragen && anfrage.fragen[f];
    eigenschaften[schluessel[i]] = { type: 'string', description: frage ? f + ' – ' + frage : f };
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

  var system = 'You help a novelist maintain their story bible (characters, places, objects). ' +
    'You read their notes and fill in the fields of a card. Stick strictly to the text: ' +
    'invent nothing, embellish nothing. If the text says nothing about a field, return an empty string. ' +
    'Write short, note-style values like on an index card. ' +
    'If statements contradict each other, use the latest one and append "(earlier: …)". ' +
    'Write all values in ' + kiSprache_() + ', even if the notes are in another language.';

  var felderListe = anfrage.felder.map(function (f, i) {
    var alt = anfrage.vorhanden && anfrage.vorhanden[f] ? ' (current value: "' + anfrage.vorhanden[f] + '")' : '';
    var frage = anfrage.fragen && anfrage.fragen[f] ? ' – ' + anfrage.fragen[f] : '';
    return schluessel[i] + ' = ' + f + frage + alt;
  }).join('\n');

  var prompt = 'Card: ' + anfrage.art + ' "' + anfrage.name + '"\n\n' +
    'Fields (key = meaning):\n' + felderListe + '\n\n' +
    'Free text of the card:\n' + (anfrage.text || '(empty)') + '\n\n' +
    (anfrage.notizen && anfrage.notizen.length ? 'Notes that mention this card (oldest first):\n- ' + anfrage.notizen.join('\n- ') + '\n\n' : '') +
    'Other cards in this book: ' + (anfrage.namen || []).join(', ') + '\n\n' +
    'Also:\n' +
    '- aliase: other names by which "' + anfrage.name + '" is referred to in the text (nicknames, roles like "the father", surname). Only what appears in the text.\n' +
    '- beziehungen: connections to other cards from the list above. name = exactly the name from the list, art = a short label from the point of view of "' + anfrage.name + '", e.g. "daughter of", "lives in", "belongs to" – written in ' + kiSprache_() + '.';

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
  var system = 'You are a careful editor checking continuity in a novel. ' +
    'You get everything the author has noted about one character, place or object. ' +
    'Report only real inconsistencies (contradictions in appearance, age, names, timelines, places) ' +
    'and at most three short hints about obvious gaps. No style critique, no plot suggestions. ' +
    'In "belege", quote the affected passages briefly and verbatim, with chapter. ' +
    'Write "text" in ' + kiSprache_() + '. If everything is consistent, return an empty list.';
  var felder = Object.keys(anfrage.felder || {}).map(function (k) { return k + ': ' + anfrage.felder[k]; }).join('\n');
  var prompt = anfrage.art + ' "' + anfrage.name + '"\n\nFields:\n' + (felder || '(none)') +
    '\n\nFree text:\n' + (anfrage.text || '(empty)') +
    '\n\nNotes:\n' + ((anfrage.notizen || []).map(function (n) { return '- [' + (n.kapitel || 'no chapter') + '] ' + n.text; }).join('\n') || '(none)') +
    '\n\nTimeline:\n' + ((anfrage.ereignisse || []).map(function (z) { return '- ' + z.datum + ': ' + z.text; }).join('\n') || '(none)');
  return kiAnfrage_(system, prompt, schema, 4000);
}

/**
 * Schlägt eine chronologische Reihenfolge für den Zeitstrahl vor – auch bei relativen
 * Angaben („zwei Tage vor dem Krieg“), die sich nicht ausrechnen lassen.
 * liste = [{ id, datum, text, abschnitt }] in der jetzigen Reihenfolge.
 * Antwort = { reihenfolge: [ids], hinweise: [{ id, text }] }
 */
function bwKiZeitOrdnen(liste) {
  var schema = {
    type: 'object',
    properties: {
      reihenfolge: { type: 'array', items: { type: 'integer' } },
      hinweise: {
        type: 'array',
        items: {
          type: 'object',
          properties: { nr: { type: 'integer' }, text: { type: 'string' } },
          required: ['nr', 'text'],
          additionalProperties: false
        }
      }
    },
    required: ['reihenfolge', 'hinweise'],
    additionalProperties: false
  };
  var system = 'You help a novelist put the timeline of their story in chronological order (story time, not chapter order). ' +
    'Dates may be absolute ("12 March 1914"), relative to other events ("two days before the war broke out") or vague. ' +
    'Resolve relative dates by finding the event they refer to. Lines marked SECTION are headings for a period; ' +
    'place each before the events that belong to it. If the current order is already right, keep it. ' +
    'Return every number exactly once in "reihenfolge". ' +
    'In "hinweise", briefly explain only moves that are not obvious and events whose position is uncertain (at most five), written in ' + kiSprache_() + '.';
  var prompt = 'Timeline in its current order:\n' + liste.map(function (z, i) {
    return (i + 1) + '. ' + (z.abschnitt ? 'SECTION: ' + (z.datum || z.text) : (z.datum || '(no date)') + ' – ' + String(z.text || '').slice(0, 300));
  }).join('\n');
  var antwort = kiAnfrage_(system, prompt, schema, 4000);
  // Nur gültige Nummern, jede einmal; Vergessenes bleibt an seinem Platz hinten dran.
  var gesehen = {};
  var reihenfolge = (antwort.reihenfolge || []).filter(function (nr) {
    if (!(nr >= 1 && nr <= liste.length) || gesehen[nr]) return false;
    gesehen[nr] = true;
    return true;
  });
  liste.forEach(function (z, i) { if (!gesehen[i + 1]) reihenfolge.push(i + 1); });
  return {
    reihenfolge: reihenfolge.map(function (nr) { return liste[nr - 1].id; }),
    hinweise: (antwort.hinweise || []).filter(function (x) { return liste[x.nr - 1]; })
      .map(function (x) { return { id: liste[x.nr - 1].id, text: x.text }; })
  };
}

function kiAnfrage_(system, prompt, schema, maxTokens) {
  var key = PropertiesService.getUserProperties().getProperty(BW_PROP_KI);
  if (!key) throw new Error(tx_('kiKeinSchluessel'));
  return kiAnbieter_(key) === 'google'
    ? kiGoogle_(key, system, prompt, schema)
    : kiAnthropic_(key, system, prompt, schema, maxTokens);
}

function kiAnthropic_(key, system, prompt, schema, maxTokens) {
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
    if (code === 401) meldung = tx_('ki401');
    if (code === 429 || code === 529) meldung = tx_('kiAusgelastet');
    throw new Error('✨ ' + meldung);
  }
  if (daten.stop_reason === 'refusal') throw new Error('✨ ' + tx_('kiAbgelehnt'));
  if (daten.stop_reason === 'max_tokens') throw new Error('✨ ' + tx_('kiZuLang'));
  var text = (daten.content || []).filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('');
  return JSON.parse(text);
}

/** Gemini über die Gemini API (Schlüssel aus Google AI Studio). */
function kiGoogle_(key, system, prompt, schema) {
  var body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    // Gemini rechnet das Nachdenken zu den Ausgabe-Tokens – daher großzügig.
    generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema, maxOutputTokens: 16384 }
  };
  var antwort = UrlFetchApp.fetch(BW_KI_URL_GOOGLE + BW_KI_MODELL_GOOGLE + ':generateContent', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': key },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });
  var code = antwort.getResponseCode();
  var daten = {};
  try { daten = JSON.parse(antwort.getContentText()); } catch (err) { daten = {}; }
  if (code !== 200) {
    var fehler = daten.error || {};
    var meldung = fehler.message || 'HTTP ' + code;
    if (code === 401 || code === 403 || /API_KEY_INVALID|API key not valid/i.test(JSON.stringify(fehler))) meldung = tx_('ki401');
    else if (code === 429 || code === 503) meldung = tx_('kiAusgelastet');
    throw new Error('✨ ' + meldung);
  }
  if (daten.promptFeedback && daten.promptFeedback.blockReason) throw new Error('✨ ' + tx_('kiAbgelehnt'));
  var kandidat = (daten.candidates || [])[0] || {};
  if (kandidat.finishReason === 'MAX_TOKENS') throw new Error('✨ ' + tx_('kiZuLang'));
  if (/SAFETY|PROHIBITED|BLOCKLIST|RECITATION/.test(kandidat.finishReason || '')) throw new Error('✨ ' + tx_('kiAbgelehnt'));
  var text = ((kandidat.content || {}).parts || []).filter(function (p) { return p.text && !p.thought; })
    .map(function (p) { return p.text; }).join('');
  if (!text) throw new Error('✨ ' + tx_('kiAbgelehnt'));
  return JSON.parse(text);
}

/*
 * Bilder erzeugen (nur Gemini – Claude erzeugt keine Bilder).
 * anfrage = { artId, art, name, felder: {Aussehen: '…', …}, text, stil: 'illustration'|'foto'|'skizze', hinweis }
 * Antwort  = { daten: Base64, mime }
 */
var BW_KI_BILD_MODELLE = ['gemini-3.1-flash-image', 'gemini-2.5-flash-image'];
var BW_KI_BILD_STILE = {
  illustration: 'Painterly digital illustration with soft, warm light, like a book illustration.',
  foto: 'Photorealistic portrait photograph, natural light, shallow depth of field.',
  skizze: 'Expressive pencil sketch, graphite on paper, no colour.'
};

function bwKiBild(anfrage) {
  var key = PropertiesService.getUserProperties().getProperty(BW_PROP_KI);
  if (!key) throw new Error(tx_('kiKeinSchluessel'));
  if (kiAnbieter_(key) !== 'google') throw new Error('✨ ' + tx_('kiBildNurGemini'));

  var kurz = function (x, n) { x = String(x || '').trim(); return x.length > n ? x.slice(0, n) + '…' : x; };
  var notizen = Object.keys(anfrage.felder || {})
    .filter(function (k) { return String(anfrage.felder[k] || '').trim(); })
    .map(function (k) { return '- ' + k + ': ' + kurz(anfrage.felder[k], 300); })
    .join('\n');
  var motiv = anfrage.artId === 'person'
    ? 'A head-and-shoulders portrait of the fictional character "' + anfrage.name + '".'
    : 'An illustration of "' + anfrage.name + '" (' + anfrage.art + ') from a novel.';
  var prompt = motiv + '\n' +
    (BW_KI_BILD_STILE[anfrage.stil] || BW_KI_BILD_STILE.illustration) + '\n' +
    'Square image, calm neutral background. No text, no lettering, no frame, no watermark.\n' +
    'Use the author\'s notes below (they may be in another language). Focus on what shows: ' +
    'age, appearance, face, hair, clothing, posture, mood. Ignore everything that cannot be seen. ' +
    'Where the notes say nothing, choose something plausible and unobtrusive.\n\n' +
    'Notes:\n' + (notizen || '(none)') +
    (anfrage.text ? '\n\nDescription:\n' + kurz(anfrage.text, 1200) : '') +
    (anfrage.hinweis ? '\n\nThe author especially wants: ' + kurz(anfrage.hinweis, 400) : '');

  var body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '1:1' } }
  };
  var antwort = null, code = 0;
  // Ist das neuere Modell (noch) nicht verfügbar, das ältere nehmen.
  for (var i = 0; i < BW_KI_BILD_MODELLE.length; i++) {
    antwort = UrlFetchApp.fetch(BW_KI_URL_GOOGLE + BW_KI_BILD_MODELLE[i] + ':generateContent', {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-goog-api-key': key },
      payload: JSON.stringify(body),
      muteHttpExceptions: true
    });
    code = antwort.getResponseCode();
    if (code !== 404) break;
  }
  var daten = {};
  try { daten = JSON.parse(antwort.getContentText()); } catch (err) { daten = {}; }
  if (code !== 200) {
    var fehler = daten.error || {};
    var meldung = fehler.message || 'HTTP ' + code;
    if (code === 401 || code === 403 || /API_KEY_INVALID|API key not valid/i.test(JSON.stringify(fehler))) meldung = tx_('ki401');
    else if (code === 429 || code === 503) meldung = tx_('kiAusgelastet');
    throw new Error('✨ ' + meldung);
  }
  if (daten.promptFeedback && daten.promptFeedback.blockReason) throw new Error('✨ ' + tx_('kiAbgelehnt'));
  var teile = (((daten.candidates || [])[0] || {}).content || {}).parts || [];
  var bild = teile.filter(function (p) { return p.inlineData && p.inlineData.data; })[0];
  if (!bild) throw new Error('✨ ' + tx_('kiAbgelehnt'));
  return { daten: bild.inlineData.data, mime: bild.inlineData.mimeType || 'image/png' };
}
