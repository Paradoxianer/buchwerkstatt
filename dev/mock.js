/**
 * Ersatz für google.script.run, damit die Seitenleiste ohne Google im
 * Browser ausprobiert werden kann (npm run vorschau).
 * Hält die Daten im Speicher und liefert ein kleines Beispielbuch.
 */
(function () {
  var id = 100;
  function neueId() { return 'm' + (++id); }
  function jetzt() { return new Date().toISOString().slice(0, 16).replace('T', ' '); }

  var kapitel = ['Kapitel 1 – Ankunft', 'Kapitel 2 – Der Hafen', 'Kapitel 3 – Die Uhr'];
  var absaetze = [
    { text: 'Lena stand am Kai und sah den Schiffen nach. Der Geruch von Diesel lag über dem Hafen.', kapitel: 1, pos: 12 },
    { text: 'Heinrich hatte ihr die Taschenuhr nie gezeigt. Erst jetzt, Jahre später, hielt Lena sie in der Hand.', kapitel: 2, pos: 40 },
    { text: 'Jonas wartete schon vor der Tür, als sie zurückkam.', kapitel: 2, pos: 44 }
  ];
  var cursorNr = 0;
  var wechsel = 0;

  var db = {
    einstellungen: null,
    eintraege: [
      { id: 'p1', art: 'person', name: 'Lena Berger', aliase: ['Lena', 'Lenchen'], text: 'Hebamme, Anfang dreißig. Rote Locken, trägt immer die alte Strickjacke ihrer Mutter. Misstraut Männern seit der Sache mit dem Vater.', felder: { Alter: '34', Beruf: 'Hebamme', Aussehen: 'rote Locken, Strickjacke' }, bezug: [], status: '', anker: '|nr1', kapitel: kapitel[0], blatt: 'x', erstellt: '2026-10-20 09:12', geaendert: '' },
      { id: 'p2', art: 'person', name: 'Heinrich Berger', aliase: ['Vater', 'der Alte'], text: 'Lenas Vater. Verschwand 1987 ohne ein Wort.', felder: { Alter: '68' }, bezug: [], status: '', anker: '', kapitel: '', blatt: '', erstellt: '2026-10-20 09:20', geaendert: '' },
      { id: 'p3', art: 'person', name: 'Jonas', aliase: [], text: 'Fischer, kennt Lena aus der Schulzeit.', felder: {}, bezug: [], status: '', anker: '', kapitel: '', blatt: '', erstellt: '2026-10-21 18:02', geaendert: '' },
      { id: 'o1', art: 'ort', name: 'Hafen', aliase: ['Kai'], text: 'Riecht nach Diesel, alte Kräne, Möwen.', felder: { Atmosphäre: 'rau, laut, salzig' }, bezug: [], status: '', anker: '', kapitel: '', blatt: '', erstellt: '2026-10-21 18:10', geaendert: '' },
      { id: 'd1', art: 'ding', name: 'Taschenuhr', aliase: ['die Uhr'], text: 'Gehörte dem Vater. Gravur auf der Rückseite: „Für H.“', felder: {}, bezug: [], status: '', anker: '|nr2', kapitel: kapitel[2], blatt: '', erstellt: '2026-10-22 07:44', geaendert: '' },
      { id: 'n1', art: 'notiz', name: '', text: 'Hier muss klarer werden, dass Lena die Uhr schon als Kind gesehen hat. @Jonas könnte das erwähnen.', felder: {}, bezug: [], status: '', anker: '|nr3', kapitel: kapitel[1], blatt: '', erstellt: '2026-10-23 21:30', geaendert: '' },
      { id: 'n2', art: 'notiz', name: '', text: 'Szene am Kai kürzen – zu viel Beschreibung. Vielleicht trifft sie hier schon @Kowalski?', felder: {}, bezug: [], status: '', anker: '|nr4', kapitel: kapitel[1], blatt: '', erstellt: '2026-10-24 08:05', geaendert: '' },
      { id: 'z1', art: 'zeit', name: '3. Februar 1987', text: 'Heinrich verschwindet.', felder: {}, bezug: [], status: '', anker: '', kapitel: '', blatt: '', erstellt: '2026-10-24 08:10', geaendert: '' },
      { id: 'z2', art: 'zeit', name: '12. März', text: 'Lena trifft Jonas am Hafen.', felder: {}, bezug: [], status: '', anker: '', kapitel: '', blatt: '', erstellt: '2026-10-24 08:11', geaendert: '' },
      { id: 'z3', art: 'zeit', name: 'zwei Tage nach Heinrichs Verschwinden', text: 'Die Polizei findet sein Boot leer im Hafen.', felder: {}, bezug: [], status: '', anker: '', kapitel: '', blatt: '', erstellt: '2026-10-24 08:12', geaendert: '' },
      { id: 'z4', art: 'zeit', name: 'Sommer, Jahre später', text: 'Lena kehrt zurück und findet die Taschenuhr.', felder: {}, bezug: [], status: '', anker: '', kapitel: '', blatt: '', erstellt: '2026-10-24 08:13', geaendert: '' },
      { id: 'i1', art: 'idee', name: '', text: 'Was, wenn Jonas Heinrichs Sohn aus zweiter Ehe ist?', felder: {}, bezug: [], status: 'offen', anker: '', kapitel: '', blatt: '', erstellt: '2026-10-25 22:00', geaendert: '' },
      { id: 'i2', art: 'idee', name: '', text: 'Die Taschenuhr bleibt immer um 4:17 stehen.', felder: {}, bezug: [], status: 'verwendet', anker: '', kapitel: '', blatt: '', erstellt: '2026-10-25 22:05', geaendert: '' }
    ],
    beziehungen: [{ id: 'b1', von: 'p1', nach: 'p2', art: 'Tochter von' }],
    textstellen: { '|nr1': { kapitel: kapitel[0], pos: 12, tab: '' }, '|nr2': { kapitel: kapitel[2], pos: 70, tab: '' }, '|nr3': { kapitel: kapitel[1], pos: 40, tab: '' }, '|nr4': { kapitel: kapitel[1], pos: 31, tab: '' } },
    ki: false
  };

  // Sprache des „Google-Kontos“ aus der Adresse: #en, #fr, #es …
  var kontoSprache = (location.hash.match(/\b(de|en|fr|es|it|pt|nl)\b/) || [0, 'de'])[1];
  var standardArten = {};
  var kurzeArten = {};
  BW_SPRACHEN.forEach(function (s) {
    standardArten[s] = standardArten_(s);
    kurzeArten[s] = {};
    standardArten[s].forEach(function (a) { kurzeArten[s][a.id] = kurzeFelder_(s, a.id); });
  });
  var STANDARD = {
    arten: [
      { id: 'person', name: 'Person', mehrzahl: 'Personen', icon: '👤', farbe: '#3367d6', hell: '#dfe8fb', woerter: ['Person', 'Figur'], karte: true, felder: ['Alter', 'Aussehen', 'Beruf', 'Charakter', 'Herkunft', 'Ziel / Motivation', 'Sprechweise'] },
      { id: 'ort', name: 'Ort', mehrzahl: 'Orte', icon: '📍', farbe: '#188038', hell: '#dcf1e3', woerter: ['Ort'], karte: true, felder: ['Art', 'Lage', 'Atmosphäre', 'Besonderheiten'] },
      { id: 'ding', name: 'Gegenstand', mehrzahl: 'Gegenstände', icon: '🔑', farbe: '#b06000', hell: '#fbecd3', woerter: ['Ding', 'Gegenstand'], karte: true, felder: ['Aussehen', 'Herkunft', 'Bedeutung'] },
      { id: 'zeit', name: 'Ereignis', mehrzahl: 'Zeitstrahl', icon: '📅', farbe: '#8430ce', hell: '#efe1fb', woerter: ['Zeit', 'Wann'], karte: false, felder: [] },
      { id: 'idee', name: 'Idee', mehrzahl: 'Ideen', icon: '💡', farbe: '#c5221f', hell: '#fbe0e0', woerter: ['Idee'], karte: false, felder: [] }
    ],
    sprache: 'auto', tagesziel: 500, gesamtziel: 80000, zieldatum: '', schreibtage: [1, 2, 3, 4, 5], anheften: true, blaetterAuto: true, kiAnzeigen: true, kiModell: 'claude-opus-5-5', hinweisGesehen: false
  };
  db.einstellungen = JSON.parse(JSON.stringify(STANDARD));
  db.einstellungen.arten = standardArten[kontoSprache];
  if (location.hash.indexOf('ki') >= 0) db.ki = true;
  if (location.hash.indexOf('gemini') >= 0) { db.ki = true; db.kiAnbieter = 'google'; }
  db.bilder = {};
  if (location.hash.indexOf('leer') >= 0) {
    db.eintraege = [];
    db.beziehungen = [];
  }

  var server = {
    bwLaden: function () {
      return { buch: 'Die Taschenuhr (Roman)', tabelleUrl: '#', ordnerUrl: '#', kontoSprache: kontoSprache, version: { nummer: '0.2.0', stand: '2026-10-30 10:52', commit: '2a1db94' },
        standardArten: standardArten, kurzeArten: kurzeArten, einstellungen: db.einstellungen, eintraege: db.eintraege, beziehungen: db.beziehungen, bilder: db.bilder, ki: { aktiv: db.ki, ende: db.ki ? 'abcd' : '', anbieter: db.kiAnbieter } };
    },
    bwSpeichern: function (e, opt) {
      var neu = !e.id || e.id.indexOf('tmp') === 0;
      var x = Object.assign({}, e, { id: neu ? neueId() : e.id, geaendert: jetzt(), erstellt: e.erstellt || jetzt() });
      var stelle = null;
      if (opt && opt.anheften && !x.anker) {
        var a = absaetze[cursorNr];
        x.anker = '|nr' + x.id;
        x.kapitel = kapitel[a.kapitel];
        stelle = { kapitel: x.kapitel, pos: a.pos, tab: '' };
        db.textstellen[x.anker] = stelle;
      }
      db.eintraege = db.eintraege.filter(function (y) { return y.id !== x.id; }).concat([x]);
      return Object.assign({}, x, stelle ? { pos: stelle.pos, tab: '' } : {});
    },
    bwAnheften: function (id) {
      // Abwechselnd: ein markiertes Wort, dann nur der Absatz unter dem Cursor
      var x = db.eintraege.filter(function (y) { return y.id === id; })[0];
      if (!x) return null;
      var abs = absaetze[cursorNr];
      var wort = (wechsel++ % 2) ? abs.text.split(' ')[3].replace(/[.,]/g, '') : '';
      x.anker = '|nr' + id + wechsel;
      x.kapitel = kapitel[abs.kapitel];
      x.ankertext = wort;
      var stelle = { anker: x.anker, kapitel: x.kapitel, ankertext: wort, pos: abs.pos + (wort ? 0.002 : 0), tab: '' };
      db.textstellen[x.anker] = { kapitel: x.kapitel, pos: stelle.pos, tab: '', text: wort };
      return stelle;
    },
    bwLoesen: function (id) {
      var x = db.eintraege.filter(function (y) { return y.id === id; })[0];
      if (x) x.anker = x.kapitel = x.ankertext = '';
      return true;
    },
    bwLoeschen: function (id) { db.eintraege = db.eintraege.filter(function (y) { return y.id !== id; }); return true; },
    bwBeziehungSpeichern: function (b) { var x = Object.assign({}, b, { id: neueId() }); db.beziehungen.push(x); return x; },
    bwBeziehungLoeschen: function () { return true; },
    bwEinstellungenSpeichern: function (e) { db.einstellungen = e; return e; },
    bwCursor: function () {
      wechsel++;
      if (wechsel % 4 === 0) cursorNr = (cursorNr + 1) % absaetze.length;
      var a = absaetze[cursorNr];
      return { text: a.text, offset: wechsel % 2 ? 2 : 30, kapitel: kapitel[a.kapitel], pos: a.pos, tab: '' };
    },
    bwTextstellen: function () { return db.textstellen; },
    bwZuTextstelle: function () { return true; },
    bwZuAbsatz: function () { return true; },
    bwZuFundstelle: function () { return true; },
    bwVorkommen: function (begriffe) {
      var name = begriffe[0] || 'Lena';
      var f = function (vor, nach, absatz) { return { absatz: absatz, wort: name, nr: 0, vor: vor, nach: nach }; };
      return [
        { kapitel: kapitel[0], anzahl: 3, tab: '', treffer: [
          f('Der Regen hatte aufgehört, als ', ' den Wagen vor der alten Mühle abstellte…', 2),
          f('…drückte mit der Schulter dagegen. ', ' strich mit den Fingern über den rauen Stoff…', 4),
          f('…sah sie zum ersten Mal die Gravur. ', ' klappte sie auf und wieder zu…', 5)] },
        { kapitel: kapitel[1], anzahl: 2, tab: '', treffer: [
          f('„Jonas Weber“, sagte er. ', ' erinnerte sich vage an einen schlaksigen Jungen…', 31),
          f('…fiel sein Blick auf die Taschenuhr, die ', ' auf den Tisch gelegt hatte.', 36)] }
      ];
    },
    bwHervorheben: function (b) { return b.length * 4; },
    bwHervorhebungEntfernen: function () { return 3; },
    bwBlaetterSync: function (liste) { var r = {}; liste.forEach(function (b) { r[b.id] = 'blatt-' + b.id; }); return r; },
    bwStatistik: function () {
      var verlauf = [];
      for (var i = 13; i >= 0; i--) {
        var d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
        verlauf.push({ datum: d, geschrieben: [320, 610, 0, 540, 800, 120, 505, 0, 450, 700, 520, 610, 90, 260][13 - i], gesamt: 41000 });
      }
      return { gesamt: 41230, heute: 260, verlauf: verlauf };
    },
    bwBildSetzen: function (id, bild) { db.bilder[id] = bild.klein; return { bild: bild.klein, datei: 'datei-' + id }; },
    bwBildEntfernen: function (id) { delete db.bilder[id]; return true; },
    bwKiBild: function (anfrage) {
      // Attrappe: ein gemaltes Platzhalter-Porträt
      var c = document.createElement('canvas');
      c.width = c.height = 512;
      var g = c.getContext('2d');
      var verlauf = g.createLinearGradient(0, 0, 512, 512);
      verlauf.addColorStop(0, anfrage.stil === 'skizze' ? '#eee' : '#f6d6b8');
      verlauf.addColorStop(1, anfrage.stil === 'skizze' ? '#bbb' : '#8fb3e8');
      g.fillStyle = verlauf; g.fillRect(0, 0, 512, 512);
      g.fillStyle = anfrage.stil === 'skizze' ? '#555' : '#c0392b';
      g.beginPath(); g.arc(256, 210, 110, 0, 7); g.fill();
      g.fillStyle = '#f1c9a5'; g.beginPath(); g.arc(256, 230, 80, 0, 7); g.fill();
      g.fillStyle = '#34495e'; g.beginPath(); g.ellipse(256, 470, 170, 140, 0, 0, 7); g.fill();
      return { daten: c.toDataURL('image/png').split(',')[1], mime: 'image/png' };
    },
    bwKiStatus: function () { return { aktiv: db.ki, ende: 'abcd', anbieter: db.kiAnbieter }; },
    bwKiSchluesselSetzen: function (k) {
      db.ki = !!k;
      db.kiAnbieter = /^AIza/.test(k) ? 'google' : k ? 'anthropic' : '';
      return { aktiv: db.ki, ende: 'abcd', anbieter: db.kiAnbieter };
    },
    bwFensterOeffnen: function (ansicht, start) {
      window.open('fenster.html#' + (ansicht === 'zeitstrahl' ? 'zeit' : 'id=' + start.id), '_blank', 'width=980,height=680');
      return true;
    },
    bwReihenfolgeSetzen: function (ids) {
      var neu = {};
      ids.forEach(function (id, i) { neu[id] = i + 1; });
      db.eintraege.forEach(function (y) { if (y.id in neu) y.reihe = String(neu[y.id]); });
      return neu;
    },
    bwWerteSetzen: function (id, werte) {
      var x = db.eintraege.filter(function (y) { return y.id === id; })[0];
      if (!x) return null;
      ['name', 'text', 'status'].forEach(function (k) { if (werte[k] != null) x[k] = werte[k]; });
      return x;
    },
    bwFensterLoeschen: function (id) { db.eintraege = db.eintraege.filter(function (y) { return y.id !== id; }); return true; },
    bwKiZeitOrdnen: function (liste) {
      // Beispiel: relative Angabe nach ihrem Bezugsereignis
      var ids = liste.map(function (z) { return z.id; });
      var i = ids.indexOf('z3');
      if (i >= 0) { ids.splice(i, 1); ids.splice(ids.indexOf('z1') + 1, 0, 'z3'); }
      return { reihenfolge: ids, hinweise: [{ id: 'z3', text: '„zwei Tage nach Heinrichs Verschwinden“ bezieht sich auf den 3. Februar 1987.' }] };
    },
    bwObenSetzen: function (artId, oben) {
      db.einstellungen.arten.forEach(function (a) { if (a.id === artId) a.oben = oben; });
      return oben;
    },
    bwFelderSetzen: function (id, aenderungen) {
      var x = db.eintraege.filter(function (y) { return y.id === id; })[0];
      if (!x) return null;
      x.felder = Object.assign({}, x.felder, aenderungen);
      return x;
    },
    bwEintraegeLesen: function (ids) { return db.eintraege.filter(function (y) { return ids.indexOf(y.id) >= 0; }); },
    bwKiFelder: function (a) {
      var bekannt = { Alter: '34', Aussehen: 'rote Locken, alte Strickjacke der Mutter', Beruf: 'Hebamme', Charakter: 'misstrauisch gegenüber Männern',
        'Ziel / Motivation': 'will wissen, warum der Vater verschwand', Eltern: 'Vater Heinrich, verschwand 1987 ohne ein Wort', Kleidung: 'immer die alte Strickjacke der Mutter',
        Wunde: 'vom Vater verlassen', Freunde: 'Jonas, aus der Schulzeit' };
      var felder = {};
      a.felder.forEach(function (f) { felder[f] = bekannt[f] || ''; });
      return {
        felder: felder,
        aliase: ['Lenchen', 'die Hebamme'],
        beziehungen: [{ name: 'Jonas', art: 'Schulfreundin von' }]
      };
    },
    bwKiPruefen: function () {
      return { befunde: [{ art: 'widerspruch', text: 'Das Alter passt nicht zusammen.', belege: ['[Kapitel 1] „Anfang dreißig“', 'Steckbrief: „34“ – aber 1987 verschwand der Vater, als sie 5 war'] }] };
    }
  };

  function run(erfolg, fehler) {
    var r = {};
    r.withSuccessHandler = function (f) { return run(f, fehler); };
    r.withFailureHandler = function (f) { return run(erfolg, f); };
    Object.keys(server).forEach(function (name) {
      r[name] = function () {
        var args = JSON.parse(JSON.stringify(Array.prototype.slice.call(arguments)));
        setTimeout(function () {
          try {
            var x = server[name].apply(null, args);
            if (erfolg) erfolg(JSON.parse(JSON.stringify(x === undefined ? null : x)));
          } catch (err) {
            if (fehler) fehler(err);
          }
        }, name === 'bwCursor' ? 60 : 250);
      };
    });
    return r;
  }
  window.google = { script: { run: run(null, null) } };
})();
