# Buchwerkstatt im Google Workspace Marketplace veröffentlichen

Diese Anleitung führt vom Code im Repo bis zum öffentlichen Eintrag, den alle in Google Docs unter **Erweiterungen → Add-ons → Add-ons herunterladen** finden.

**Zeitaufwand:** etwa 2–3 Stunden eigene Arbeit. Dazu kommt die Wartezeit auf Googles Prüfungen, typischerweise einige Tage bis wenige Wochen.
**Kosten:** keine. Die Buchwerkstatt nutzt keine „eingeschränkten“ Berechtigungen, deshalb ist keine kostenpflichtige Sicherheitsprüfung nötig.

## Überblick

1. [Vorbereiten: Platzhalter ausfüllen, Webseite veröffentlichen](#1-vorbereiten)
2. [Eigenständiges Apps-Script-Projekt anlegen und hochladen](#2-apps-script-projekt)
3. [Google-Cloud-Projekt anlegen und verknüpfen](#3-google-cloud-projekt)
4. [OAuth-Zustimmungsbildschirm einrichten](#4-oauth-zustimmungsbildschirm)
5. [Bereitstellung erstellen](#5-bereitstellung)
6. [Marketplace SDK: App-Konfiguration und Store-Eintrag](#6-marketplace-sdk)
7. [OAuth-Überprüfung beantragen (Demo-Video)](#7-oauth-überprüfung)
8. [Eintrag zur Prüfung einreichen](#8-einreichen)
9. [Updates veröffentlichen](#9-updates)

---

## 1. Vorbereiten

**a) Platzhalter ausfüllen.** In `docs/datenschutz.html` und `docs/nutzungsbedingungen.html` sind die rot markierten Stellen auszufüllen: Name, Anschrift, Kontakt-E-Mail. Google verlangt eine erreichbare Kontaktadresse. Wer in Deutschland ein Angebot öffentlich bereitstellt, sollte außerdem prüfen, ob ein Impressum nötig ist.

```bash
grep -n "platzhalter" docs/*.html
```

**b) GitHub Pages einschalten.** Im Repo unter **Settings → Pages** als Quelle „Deploy from a branch“, Branch `main`, Ordner `/docs` wählen. Danach sind die Seiten erreichbar unter:

| Seite | Adresse |
|---|---|
| Startseite | `https://paradoxianer.github.io/buchwerkstatt/` |
| Datenschutz | `https://paradoxianer.github.io/buchwerkstatt/datenschutz.html` |
| Nutzungsbedingungen | `https://paradoxianer.github.io/buchwerkstatt/nutzungsbedingungen.html` |
| Abmelde-/Deinstallations-URL (falls verlangt) | `https://paradoxianer.github.io/buchwerkstatt/deinstallieren.html` |
| Hilfe | `https://github.com/Paradoxianer/buchwerkstatt/issues` |

**c) Domain bestätigen.** Google verlangt, dass die Domain von Startseite und Datenschutzerklärung dir nachweislich gehört. Das geschieht in der [Google Search Console](https://search.google.com/search-console) mit demselben Google-Konto, das später das Cloud-Projekt besitzt.
- Für `paradoxianer.github.io` legst du ein Repo `Paradoxianer/paradoxianer.github.io` an und legst die Bestätigungsdatei von Google dort hinein.
- Falls Google die github.io-Adresse beim OAuth-Zustimmungsbildschirm nicht akzeptiert, ist eine eigene Domain (ca. 10 €/Jahr) der sichere Weg. Die Seiten aus `docs/` lassen sich unter jeder Domain veröffentlichen.

## 2. Apps-Script-Projekt

Für den Marketplace muss es ein **eigenständiges** Projekt sein, nicht an ein Dokument gebunden. Einmalig unter <https://script.google.com/home/usersettings> die „Google Apps Script API“ einschalten.

```bash
npm install
```

```bash
npx clasp login
```

```bash
npx clasp create --type standalone --title "Buchwerkstatt" --rootDir src
```

Falls clasp die Datei `.clasp.json` in `src/` statt ins Hauptverzeichnis legt, einfach verschieben (`mv src/.clasp.json .`).

```bash
npm run push
```

Zum Testen vor der Veröffentlichung: Im Apps-Script-Editor (`npx clasp open`) **Bereitstellen → Bereitstellungen testen → Editor-Add-on** wählen und ein Test-Dokument auswählen. Die Buchwerkstatt erscheint dann in diesem Dokument unter **Erweiterungen**.

## 3. Google-Cloud-Projekt

Apps Script legt automatisch ein verstecktes Standardprojekt an. Für den Marketplace braucht es ein **eigenes** Cloud-Projekt.

1. In der [Google Cloud Console](https://console.cloud.google.com/) ein neues Projekt „Buchwerkstatt“ anlegen und die **Projektnummer** notieren (Startseite des Projekts).
2. Im Apps-Script-Editor unter **⚙️ Projekteinstellungen → Google Cloud Platform-Projekt → Projekt ändern** diese Projektnummer eintragen.
3. In der Cloud Console unter **APIs & Dienste → Bibliothek** aktivieren:
   - **Google Workspace Marketplace SDK**
   - **Google Drive API** (für den erweiterten Dienst „Drive“)
   - **Google Docs API** und **Google Sheets API** (schadet nicht, wird bei der Prüfung manchmal erwartet)

## 4. OAuth-Zustimmungsbildschirm

Cloud Console → **APIs & Dienste → OAuth-Zustimmungsbildschirm** (in neueren Oberflächen „Google Auth Platform“):

| Feld | Eintrag |
|---|---|
| Nutzertyp | **Extern** |
| App-Name | Buchwerkstatt |
| Support-E-Mail | deine Kontaktadresse |
| App-Logo | `docs/marketplace/icon-128.png` (optional; ein Logo löst zusätzlich eine Markenprüfung aus) |
| Startseite | `https://paradoxianer.github.io/buchwerkstatt/` |
| Datenschutzerklärung | `https://paradoxianer.github.io/buchwerkstatt/datenschutz.html` |
| Nutzungsbedingungen | `https://paradoxianer.github.io/buchwerkstatt/nutzungsbedingungen.html` |
| Abmelde-/Deinstallations-URL (falls verlangt) | `https://paradoxianer.github.io/buchwerkstatt/deinstallieren.html` |
| Autorisierte Domain | `paradoxianer.github.io` (bzw. eigene Domain) |
| Kontakt des Entwicklers | deine E-Mail |

**Bereiche (Scopes)** genau diese fünf hinzufügen. Es sind dieselben wie in `src/appsscript.json`:

| Bereich | Einstufung | Begründung (für das Formular, Englisch) |
|---|---|---|
| `https://www.googleapis.com/auth/documents` | sensibel | Reads the open manuscript (cursor position, headings, word count) to show the notes for the current chapter, pins notes to passages via named ranges, optionally highlights character names, and writes the per-card Google Docs (“card documents”) the user asks for. |
| `https://www.googleapis.com/auth/spreadsheets` | sensibel | Stores the user’s notes, cards and relationships in a Google Sheet that the add-on creates in the user’s own Drive. |
| `https://www.googleapis.com/auth/drive.file` | nicht sensibel | Moves, renames and trashes only the files and folders the add-on created itself (the sheet, card documents and their folder). No access to other files. |
| `https://www.googleapis.com/auth/script.container.ui` | nicht sensibel | Shows the sidebar and the Extensions menu in Google Docs. |
| `https://www.googleapis.com/auth/script.external_request` | sensibel | Only for the optional AI feature: when the user explicitly clicks “Fill in profile” or “Check for contradictions” and has entered their own Anthropic or Google Gemini API key, the card’s text and related notes are sent to api.anthropic.com or generativelanguage.googleapis.com. |

Solange die App im Status **„Test“** ist, können bis zu 100 eingetragene Testnutzer sie ohne Überprüfung nutzen. Deine Frau kannst du dort schon eintragen.

## 5. Bereitstellung

Der Marketplace verweist auf eine feste, versionierte **Bereitstellung**:

```bash
npx clasp deploy --description "1.0"
```

Die ausgegebene **Versionsnummer** (`Created version 1`) und die **Bereitstellungs-ID** (beginnt mit `AKfycb…`) notieren. Im Marketplace SDK (Schritt 6) werden für ein Editor-Add-on Skript-ID und Versionsnummer eingetragen; die Bereitstellungs-ID wird bei Updates wiederverwendet.

## 6. Marketplace SDK

Cloud Console → **Google Workspace Marketplace SDK → App-Konfiguration**:

| Feld | Eintrag |
|---|---|
| App-Sichtbarkeit | Öffentlich (mit einem privaten gmail.com-Konto ist nur „öffentlich“ möglich; „nicht gelistet“ blendet die App in der Suche aus) |
| Installationseinstellungen | Individuelle Installation (und Admin-Installation erlauben) |
| App-Integration | **„Google Workspace-Add-on“ NICHT anhaken** (das ist für Add-ons mit Karten-Oberfläche). Stattdessen weiter unten **„Docs-Add-on“** anhaken – die Buchwerkstatt ist ein Editor-Add-on mit eigener Seitenleiste. |
| Skript-ID | die Skript-ID des Apps-Script-Projekts (⚙️ Projekteinstellungen, steht auch in `.clasp.json`) |
| Skriptversion | die Versionsnummer aus Schritt 5 (`Created version 1` → `1`) |
| OAuth-Bereiche | dieselben fünf wie oben |
| Entwickler | Name, Website (`https://paradoxianer.github.io/buchwerkstatt/`), E-Mail |

Dann **Store-Eintrag**:

| Feld | Datei bzw. Text |
|---|---|
| Name, Kurz- und Detailbeschreibung | `docs/marketplace/eintrag.md` (pro Sprache eintragen) |
| Kategorie | Kreativ-Tools (eine Kategorie „Produktivität“ gibt es nicht) |
| Anwendungssymbol 32 × 32 / 128 × 128 | `docs/marketplace/icon-32.png`, `icon-128.png` |
| Kartenbanner 220 × 140 | `docs/marketplace/banner-220x140.png` |
| Screenshots 1280 × 800 | `docs/marketplace/screenshot-1-notizen.png` … `screenshot-5-ziel.png` |
| Nutzungsbedingungen, Datenschutz, Support | Adressen aus Schritt 1 |

Neu erzeugen lassen sich Symbole und Screenshots mit:

```bash
npm run marketplace
```

## 7. OAuth-Überprüfung

Weil die App sensible Bereiche nutzt, prüft Google sie vor der Veröffentlichung. Im OAuth-Zustimmungsbildschirm **„App veröffentlichen“** und dann **„Zur Überprüfung einreichen“** wählen. Google verlangt ein **Demo-Video** (z. B. als nicht gelistetes YouTube-Video), das zeigt, wie jeder Bereich genutzt wird.

**Drehbuch für das Video (3–4 Minuten, auf Englisch einsprechen oder mit Untertiteln):**

1. **Zustimmungsbildschirm:** Ein Test-Dokument öffnen und die Buchwerkstatt installieren bzw. starten. Den Google-Zustimmungsbildschirm zeigen. In der Adresszeile muss die **OAuth-Client-ID** sichtbar sein: auf die URL klicken und kurz heranzoomen.
2. **`script.container.ui`:** Erweiterungen → Buchwerkstatt → Öffnen. Die Seitenleiste erscheint.
3. **`documents`:**
   - in den Text klicken, damit „Hier“ das Kapitel zeigt,
   - ein Wort markieren und eine Notiz mit 📌 daran heften, dann zur Textstelle springen,
   - „Namen im Text markieren“ zeigen.
4. **`spreadsheets`:** `Person Lena: 34, midwife` eingeben, unter Mehr → „Tabelle öffnen“ die angelegte Tabelle mit dem Eintrag zeigen.
5. **`drive.file`:** Unter Mehr → „Alle Blätter jetzt erstellen“ klicken, den Ordner „… – Buchwerkstatt“ mit Tabelle und Personenblatt in Drive zeigen. Erwähnen, dass nur diese selbst angelegten Dateien zugänglich sind.
6. **`script.external_request`:** Unter Mehr → KI-Hilfe einen Gemini- oder Anthropic-Schlüssel eintragen, auf einer Karte „Fill in profile“ klicken und den Vorschlag zeigen. Erklären, dass nur bei diesem ausdrücklichen Klick Text an die gewählte KI-API geht.
7. **Löschen:** eine Karte löschen; das Personenblatt wandert in den Papierkorb.

### Englisches Sprechskript

Zum Vorlesen beim Aufnehmen oder als Untertitel. Links steht, was im Bild zu sehen ist, darunter der Sprechtext.

**Vorbereitung:**
- Das Testdokument „Das Haus am Fluss – Testmanuskript“ öffnen.
- Die Buchwerkstatt unter ⚙️ Mehr → Sprache auf **English** stellen, damit die Prüfer die Oberfläche lesen können. Die Schlüsselwörter heißen dann `Character`, `Place` …
- Für Szene 6 einen Gemini- oder Anthropic-Schlüssel bereithalten.
- Bildschirm in 1080p aufnehmen, Browser-Zoom 100 %.

Für das Personenblatt in Szene 5 reicht ein Klick auf „📄 Create all documents now“.

---

**Scene 1 – Intro and consent screen (≈ 30 s)**
*Bild: Testdokument offen. Extensions → Add-ons → Buchwerkstatt installieren bzw. starten. Der Google-Zustimmungsbildschirm erscheint. Auf die Adresszeile klicken und heranzoomen, sodass die `client_id=…` lesbar ist. Kurz durch die Liste der Berechtigungen scrollen, dann „Allow“.*

> Hi, this is a short demo of Buchwerkstatt, a Google Docs add-on for novelists. It keeps characters, places, a timeline and notes right next to the manuscript.
> I'm opening a test manuscript and starting the add-on. This is the Google consent screen. In the address bar you can see the OAuth client ID of our project. The add-on asks for access to the current document, to spreadsheets, to files it creates itself, for showing its sidebar, and for optional external requests. I'll show each of these in this video. I click Allow.

**Scene 2 – `script.container.ui` (≈ 15 s)**
*Bild: Extensions → Buchwerkstatt → Open. Die Seitenleiste erscheint, kurz über die Tabs fahren.*

> The scope script.container.ui is used only to show this sidebar and the entry in the Extensions menu. Everything the add-on does happens from here.

**Scene 3 – `documents` (≈ 50 s)**
*Bild:*
1. In einen Absatz in Kapitel 2 klicken; die Seitenleiste zeigt das Kapitel.
2. Das Wort „Mühle“ markieren, eine Notiz tippen („The mill should feel abandoned“), mit 📌 anheften.
3. Woanders hinklicken, dann im ⋯-Menü der Notiz „📌 Go to passage“; das Dokument springt zurück und markiert das Wort.
4. Danach unter ⚙️ More „🖍️ Highlight names in the text“, die Namen werden farbig; mit „Remove highlights“ wieder entfernen.

> The documents scope lets the add-on read the open manuscript. When I click into the text, the sidebar knows which chapter I'm in.
> I select a word and pin a note to it. The add-on stores a named range in the document, so later I can jump straight back to that passage.
> Optionally it can highlight all character names in the text, and remove the highlighting again. The add-on only works with the document that is open and the documents it creates for the user.

**Scene 4 – `spreadsheets` (≈ 30 s)**
*Bild: Ins Notizfeld `Character Lena Hartmann: 34, returns to her father's mill` tippen und speichern. Die Karte erscheint unter „World“. Dann unter ⚙️ More „📊 Open the spreadsheet with all entries“: die Tabelle im neuen Tab zeigen, die Zeile mit Lena markieren.*

> All notes and cards are stored in a Google Sheet in the user's own Drive. When I type "Character Lena Hartmann" in the note field, a character card is created.
> Here is that spreadsheet: the add-on created it next to the manuscript, and Lena is in it as a row. The user owns this data and can read or edit it directly. There is no server of our own.

**Scene 5 – `drive.file` (≈ 35 s)**
*Bild: Unter ⚙️ More auf „📄 Create all documents now“ klicken. Dann Google Drive öffnen, den Ordner „Das Haus am Fluss – Testmanuskript – Buchwerkstatt“ zeigen, darin die Tabelle und den Unterordner mit dem Dokument „Lena Hartmann“. Das Dokument kurz öffnen.*

> The drive.file scope is used only for files the add-on creates itself. It creates one folder next to the manuscript and puts the spreadsheet and the card documents inside. The card documents make the characters usable as smart chips in the Docs mobile app.
> With drive.file, the add-on can create, rename, move and trash only these files. It cannot see any other file in the user's Drive.

**Scene 6 – `script.external_request` (≈ 40 s)**
*Bild:*
1. ⚙️ More → „AI help (optional)“: den eigenen API-Schlüssel einfügen (den Schlüssel danach unkenntlich machen oder vorher im Video verpixeln).
2. Lenas Karte öffnen, „✨ Fill in profile“ klicken; der Vorschlag erscheint, „Apply“ klicken.
3. Optional: Avatar anklicken → „✨ Create image with AI“ (nur Gemini).

> The last scope, script.external_request, is only used by the optional AI help. It is off by default. To use it, users enter their own Gemini or Anthropic API key.
> Only when I explicitly click "Fill in profile", this card's text and the related notes are sent to the AI provider I chose. The suggestion comes back here, and nothing is changed until I click Apply.
> No data is sent to anyone else, and the add-on works fully without AI.

**Scene 7 – Deleting (≈ 15 s)**
*Bild: Auf Lenas Karte ⋯ → „🗑️ Delete card“, mit „Yes, delete“ bestätigen. In Drive zeigen, dass das Dokument „Lena Hartmann“ im Papierkorb liegt.*

> When I delete a card, its row is removed from the spreadsheet and its card document is moved to the trash. Again, only files the add-on created are touched.

**Scene 8 – Outro (≈ 10 s)**
*Bild: Seitenleiste mit Manuskript.*

> That's Buchwerkstatt: all data stays in the user's own Google Drive, and every scope is used only for the features shown here. Thanks for reviewing.

In das Begründungsfeld kommen die englischen Texte aus der Tabelle in Schritt 4. Rückfragen von Google kommen per E-Mail an die Support-Adresse. Meist geht es um Details der Datenschutzerklärung oder des Videos.

## 8. Einreichen

Ist die OAuth-Überprüfung durch, im Marketplace SDK unter **Store-Eintrag → Veröffentlichen** einreichen. Nach Googles Prüfung ist die Buchwerkstatt öffentlich zu finden. Den Link zum Eintrag dann in `docs/index.html` (Abschnitt „Installieren“) und im README eintragen.

## 9. Updates

Bei einem Editor-Add-on verweist der Marketplace auf eine **Versionsnummer** des Skripts. Für ein Update eine neue Version anlegen und deren Nummer eintragen:

```bash
npm test && npm run push
```

```bash
npx clasp deploy --deploymentId AKfycb… --description "0.3.0"
```

clasp meldet dabei `Created version N`. Im Marketplace SDK unter **App-Konfiguration → Skriptversion** die neue Nummer `N` eintragen und speichern.

Alle Nutzerinnen und Nutzer bekommen die neue Version dann automatisch. Nur wenn neue **Bereiche** dazukommen, muss die OAuth-Überprüfung erneut durchlaufen werden.

---

## Prüfliste

- [ ] Platzhalter in Datenschutz und Nutzungsbedingungen ausgefüllt
- [ ] GitHub Pages aktiv, alle drei Seiten erreichbar
- [ ] Domain in der Search Console bestätigt
- [ ] Eigenständiges Apps-Script-Projekt, Code hochgeladen, im Test-Dokument ausprobiert
- [ ] Eigenes Cloud-Projekt verknüpft, Marketplace SDK und Drive API aktiv
- [ ] OAuth-Zustimmungsbildschirm mit den fünf Bereichen
- [ ] Versionierte Bereitstellung erstellt, ID notiert
- [ ] App-Konfiguration und Store-Eintrag ausgefüllt (Texte, Symbole, Banner, Screenshots)
- [ ] Demo-Video hochgeladen, OAuth-Überprüfung eingereicht und bestanden
- [ ] Store-Eintrag veröffentlicht, Link auf Startseite und im README ergänzt
