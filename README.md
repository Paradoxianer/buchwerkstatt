# 📖 Buchwerkstatt

Eine Erweiterung für **Google Docs**, die beim Romanschreiben den Überblick behält: Notizen, Figuren, Orte, Gegenstände, Zeitstrahl, Ideen-Pinnwand und Schreibziel stehen direkt neben dem Manuskript.

Die Grundidee: **Es gibt nur einen Notizblock.** Das erste Wort einer Notiz entscheidet, was daraus wird:

| Du tippst … | Daraus wird … |
|---|---|
| `Person Lena: 34, Hebamme, rote Locken` | neue Figur **Lena** |
| `Ort Hafen: riecht nach Diesel` | neuer Ort |
| `Ding Taschenuhr: gehörte dem Vater` | neuer Gegenstand |
| `Zeit 12. März: Lena trifft Jonas` | Ereignis im Zeitstrahl |
| `Idee: Was, wenn Jonas der Bruder ist?` | Karte auf der Pinnwand |
| `@Lena hat eine Narbe an der Hand` | Notiz zu Lena |
| einfach Text | normale Notiz an dieser Stelle im Text |

**Bekannte Namen werden automatisch verlinkt.** Das gilt auch für Spitznamen und Rollen wie „der Vater“, wenn sie bei der Karte unter „Auch genannt“ stehen. Ein Klick auf einen Namen öffnet die Karte. Dort steht automatisch, womit die Karte verbunden ist, welche Notizen sie erwähnen und in welchen Kapiteln sie vorkommt.

<p>
<img src="docs/notizen.png" width="230" alt="Notizen">
<img src="docs/karte.png" width="230" alt="Karte einer Figur">
<img src="docs/zeitstrahl.png" width="230" alt="Zeitstrahl">
<img src="docs/ki-vorschlag.png" width="230" alt="KI füllt den Steckbrief">
</p>

## Was sie kann

- **📝 Notizen an der Textstelle:** Neue Notizen werden unsichtbar an den Absatz geheftet, in dem der Cursor steht. „📍 Hier“ zeigt die Notizen zum aktuellen Kapitel, und 📌 springt zurück zur Stelle im Text.
- **👤 Karte unter dem Cursor:** Steht der Cursor auf einem Namen, erscheint oben die Kurzinfo zur Figur. Sonst zeigt die Leiste, wer im aktuellen Absatz vorkommt.
- **👥 Welt:** Alle Figuren, Orte und Gegenstände mit Steckbrief, Beschreibung, Beziehungen („Tochter von“) und automatischen Verbindungen. Eigene Arten (z. B. „Organisation“) lassen sich mit eigenen Feldern anlegen.
- **📅 Zeitstrahl:** Ereignisse nach Datum im Buch sortiert, filterbar nach Figur. Erkannt werden z. B. „12. März“, „3.4.1987“ und „Tag 5“.
- **💡 Pinnwand:** Ideen nach offen, verwendet und verworfen sortiert.
- **🎯 Ziel:** Wörter heute, Tagesziel, Verlauf der letzten 14 Tage, Serie und Fortschritt fürs ganze Buch.
- **📄 Personenblätter fürs Handy:** Zu jeder Karte entsteht automatisch ein kleines Google Doc im Ordner „*Buchtitel* – Welt“. Damit funktioniert in Google Docs **`@Lena`** als Verweis (Smart Chip), auch in der **Docs-App am iPhone**. Die Blätter sind untereinander verlinkt.
- **🖍️ Namen im Text markieren:** Färbt alle Namen im Manuskript ein. Ein Klick entfernt die Markierungen wieder.
- **✨ KI-Hilfe (optional, mit Claude):**
  - *Steckbrief ausfüllen*: Die KI liest Beschreibung und alle Notizen zur Karte und schlägt Felder, weitere Namen und Beziehungen vor. Übernommen wird nur, was angehakt ist.
  - *Widersprüche prüfen*: Findet z. B. „grüne Augen“ in Kapitel 3 und „braune Augen“ in Kapitel 17.

Alle Daten liegen in einer **Google-Tabelle** neben dem Manuskript („*Buchtitel* – Buchwerkstatt“). Die Tabelle ist gut lesbar und funktioniert auch in der Google-Tabellen-App. Es gibt keinen eigenen Server, alles bleibt im eigenen Google-Konto.

## Einrichten

Die Erweiterung wird als Apps-Script-Projekt an das Manuskript gehängt. Das muss man nur einmal pro Buch machen.

### Variante A – mit `clasp` (empfohlen)

1. Manuskript in Google Docs öffnen → **Erweiterungen → Apps Script**. Es öffnet sich ein leeres Projekt. Oben links einen Namen vergeben, z. B. „Buchwerkstatt“.
2. Im Apps-Script-Editor links auf **⚙️ Projekteinstellungen** gehen und die **Skript-ID** kopieren.
3. Auf dem Computer:

   ```bash
   git clone https://github.com/Paradoxianer/buchwerkstatt.git
   ```

   ```bash
   cd buchwerkstatt && npm install
   ```

   ```bash
   npx clasp login
   ```

   ```bash
   cp .clasp.json.example .clasp.json
   ```

   In `.clasp.json` die Skript-ID eintragen. Danach:

   ```bash
   npx clasp push --force
   ```

   (Einmalig vorher unter <https://script.google.com/home/usersettings> die „Google Apps Script API“ einschalten.)
4. Das Manuskript neu laden → **Erweiterungen → Buchwerkstatt → Buchwerkstatt öffnen**.

### Variante B – ohne Werkzeuge (kopieren und einfügen)

1. Manuskript öffnen → **Erweiterungen → Apps Script**.
2. Für jede Datei aus dem Ordner [`src/`](src) im Editor über **＋ → Skript** (für `.gs`) bzw. **＋ → HTML** (für `.html`) eine Datei **mit gleichem Namen** anlegen und den Inhalt hineinkopieren:
   `Main`, `Store`, `Dokument`, `Blaetter`, `Ki`, `Statistik` (Skript) sowie `Sidebar`, `Styles`, `Core`, `App` (HTML). Die vorhandene `Code.gs` kann gelöscht werden.
3. **⚙️ Projekteinstellungen → „Manifestdatei appsscript.json im Editor anzeigen“** aktivieren und den Inhalt von [`src/appsscript.json`](src/appsscript.json) übernehmen.
4. Speichern, das Manuskript neu laden → **Erweiterungen → Buchwerkstatt → Buchwerkstatt öffnen**.

### Beim ersten Start

Google fragt nach Berechtigungen (Dokument, Tabellen, Drive und Internetzugriff für die KI). Da die Erweiterung nicht im Marketplace veröffentlicht ist, erscheint „Google hat diese App nicht überprüft“. Dann auf **Erweitert → Zu Buchwerkstatt wechseln** klicken. Das ist bei eigenen Skripten normal.

Wer die Seitenleiste benutzt, muss die Berechtigungen **selbst** bestätigen. Also beim ersten Mal am besten mit dem Konto öffnen, mit dem auch geschrieben wird.

### KI-Hilfe einschalten (optional)

1. Auf <https://console.anthropic.com/settings/keys> einen API-Schlüssel erstellen und etwas Guthaben aufladen.
2. In der Seitenleiste unter **⚙️ Mehr → KI-Hilfe** den Schlüssel einfügen.

Der Schlüssel wird nur in den Benutzereinstellungen des eigenen Google-Kontos gespeichert, nicht im Dokument. Eine Anfrage kostet je nach Menge der Notizen meist weniger als einen Cent. Das Modell lässt sich in den Einstellungen wählen; voreingestellt ist Claude Opus 5.5.

## Tipps

- **Kapitel** werden an Überschriften erkannt (Titel, Überschrift 1–3). Wer Kapitel als Überschrift formatiert, bekommt „📍 Hier“ und „Wo kommt Lena vor?“ geschenkt.
- **Umbenennen** ist sicher: Der alte Name wandert automatisch zu „Auch genannt“, bestehende Notizen bleiben verlinkt.
- Bei **„Heinrich Berger“** werden auch „Heinrich“ und „Berger“ allein erkannt, solange es eindeutig ist. Auch der Genitiv wird erkannt („Lenas“).
- `@Name`, den es noch nicht gibt, erscheint gestrichelt. Ein Klick darauf legt ihn als Person, Ort oder Gegenstand an.
- Die Schlüsselwörter („Person“, „Figur“ …) und die Felder im Steckbrief sind unter **⚙️ Mehr** frei änderbar.
- **⏎** speichert, **⇧⏎** macht eine neue Zeile. Bei Vorschlägen wählt **↑↓** aus und **⏎/Tab** übernimmt.
- Die Personenblätter werden überschrieben. Änderungen also immer in der Seitenleiste machen.

## Entwicklung

```
src/            Apps-Script-Projekt (wird mit clasp hochgeladen)
  Main.gs         Menü, Seitenleiste
  Store.gs        Tabelle als Datenablage, Einstellungen
  Dokument.gs     Cursor, Textstellen (Named Ranges), Kapitel, Markieren, Vorkommen
  Blaetter.gs     Personenblätter als Google Docs
  Ki.gs           Claude-API (Felder füllen, Widersprüche prüfen)
  Statistik.gs    Wortzahl & Tagesverlauf
  Sidebar.html    Gerüst der Seitenleiste
  Styles.html     Aussehen
  Core.html       Logik ohne Oberfläche: Notiz zerlegen, Namen finden, Datum sortieren
  App.html        Oberfläche
dev/            Vorschau ohne Google (mock.js ersetzt google.script.run)
tests/          Tests für Core
```

```bash
npm test
```

```bash
npm run vorschau
```

`npm run vorschau` baut `dist/vorschau.html` mit Beispieldaten. Die Datei lässt sich einfach im Browser öffnen (`#leer` am Ende der Adresse startet mit einem leeren Buch).
