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
      { id: 'i1', art: 'idee', name: '', text: 'Was, wenn Jonas Heinrichs Sohn aus zweiter Ehe ist?', felder: {}, bezug: [], status: 'offen', anker: '', kapitel: '', blatt: '', erstellt: '2026-10-25 22:00', geaendert: '' },
      { id: 'i2', art: 'idee', name: '', text: 'Die Taschenuhr bleibt immer um 4:17 stehen.', felder: {}, bezug: [], status: 'verwendet', anker: '', kapitel: '', blatt: '', erstellt: '2026-10-25 22:05', geaendert: '' }
    ],
    beziehungen: [{ id: 'b1', von: 'p1', nach: 'p2', art: 'Tochter von' }],
    textstellen: { '|nr1': { kapitel: kapitel[0], pos: 12, tab: '' }, '|nr2': { kapitel: kapitel[2], pos: 70, tab: '' }, '|nr3': { kapitel: kapitel[1], pos: 40, tab: '' }, '|nr4': { kapitel: kapitel[1], pos: 31, tab: '' } },
    ki: false
  };

  var STANDARD = {
    arten: [
      { id: 'person', name: 'Person', mehrzahl: 'Personen', icon: '👤', farbe: '#3367d6', hell: '#dfe8fb', woerter: ['Person', 'Figur'], karte: true, felder: ['Alter', 'Aussehen', 'Beruf', 'Charakter', 'Herkunft', 'Ziel / Motivation', 'Sprechweise'] },
      { id: 'ort', name: 'Ort', mehrzahl: 'Orte', icon: '📍', farbe: '#188038', hell: '#dcf1e3', woerter: ['Ort'], karte: true, felder: ['Art', 'Lage', 'Atmosphäre', 'Besonderheiten'] },
      { id: 'ding', name: 'Gegenstand', mehrzahl: 'Gegenstände', icon: '🔑', farbe: '#b06000', hell: '#fbecd3', woerter: ['Ding', 'Gegenstand'], karte: true, felder: ['Aussehen', 'Herkunft', 'Bedeutung'] },
      { id: 'zeit', name: 'Ereignis', mehrzahl: 'Zeitstrahl', icon: '📅', farbe: '#8430ce', hell: '#efe1fb', woerter: ['Zeit', 'Wann'], karte: false, felder: [] },
      { id: 'idee', name: 'Idee', mehrzahl: 'Ideen', icon: '💡', farbe: '#c5221f', hell: '#fbe0e0', woerter: ['Idee'], karte: false, felder: [] }
    ],
    tagesziel: 500, gesamtziel: 80000, anheften: true, blaetterAuto: true, kiModell: 'claude-opus-5-5', hinweisGesehen: false
  };
  db.einstellungen = JSON.parse(JSON.stringify(STANDARD));
  if (location.hash.indexOf('leer') >= 0) {
    db.eintraege = [];
    db.beziehungen = [];
  }

  var server = {
    bwLaden: function () {
      return { buch: 'Die Taschenuhr (Roman)', tabelleUrl: '#', ordnerUrl: '#', einstellungen: db.einstellungen, eintraege: db.eintraege, beziehungen: db.beziehungen, ki: { aktiv: db.ki, ende: db.ki ? 'abcd' : '' } };
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
    bwVorkommen: function () { return [{ kapitel: kapitel[0], anzahl: 7, tab: '', index: 3 }, { kapitel: kapitel[1], anzahl: 3, tab: '', index: 30 }]; },
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
    bwKiStatus: function () { return { aktiv: db.ki, ende: 'abcd' }; },
    bwKiSchluesselSetzen: function (k) { db.ki = !!k; return { aktiv: db.ki, ende: 'abcd' }; },
    bwKiFelder: function (a) {
      return {
        felder: { Alter: '34', Aussehen: 'rote Locken, alte Strickjacke der Mutter', Beruf: 'Hebamme', Charakter: 'misstrauisch gegenüber Männern', Herkunft: '', 'Ziel / Motivation': 'will wissen, warum der Vater verschwand', Sprechweise: '' },
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
