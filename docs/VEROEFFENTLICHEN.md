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
| Kategorie | Produktivität |
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
