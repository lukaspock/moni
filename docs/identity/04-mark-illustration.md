# møni – Bildzeichen, Illustration, Maskottchen, Pattern (04)

> Teil des Identity-Sprints (Rolle: Mark- und Illustrations-Designer). Reiner Vorschlag an den Owner. Ändert weder `PLAN.md` noch App-Code. Alle Assets liegen als echte SVGs in `docs/identity/assets/` und sind mit macOS-QuickLook gerendert und geprüft.
> Kurzfassung: **Das Zeichen ist der „Schnitt-Ring“: ein Ring (Kalorien) aus zwei Bögen, durchschnitten von einem orangenen Diagonalstrich (Bewegung). Das ist das ø im Namen und zugleich die Kernmechanik der App (Tagesring + Trainingsbonus).**

---

## 0. Ausgangslage (Audit)

| Was es heute gibt                                                                                                                                                                                       | Befund                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `assets/icon.png`, `assets/moni.icon` (Icon Composer, 1 Gruppe, Ebene `Image 3.png`, Mint-Verlauf weiß→`display-p3 0.59/0.97/0.81`, Scale 1.32, Translucency 0.3), `launch-arm.png`, `splash-icon*.png` | Alles zeigt einen **Bizeps-Arm** (Outline-Piktogramm, schwarz auf Mint). Das ist ein Stock-Emoji-Motiv: generisch, steht für „Gym-App“, nicht für møni, hat keinerlei Bezug zu Kalorien, zum ø oder zum Namen.                            |
| `LaunchScreen.tsx`                                                                                                                                                                                      | zeigt `launch-arm.png` mit `tintColor: accent` und Puls-Animation (1 → 1.06). Die Animation bleibt als Prinzip, das Bild wird ersetzt.                                                                                                    |
| `app.config.ts`                                                                                                                                                                                         | `icon: ./assets/icon.png`, `ios.icon: ./assets/moni.icon` (Icon Composer), splash per `expo-splash-screen`-Plugin.                                                                                                                        |
| Theme                                                                                                                                                                                                   | `theme.config.js`: `accent` Mint (`#00C8B3`/dark `#00DAC3`), `bonus` Orange (`#FF8D28`/`#FF9230`), `danger` Rot. **Mint = Kalorienring, Orange = Workout-Bonus** ist in der App bereits gelernte Semantik. Das Zeichen übernimmt sie 1:1. |
| Bibliotheken                                                                                                                                                                                            | `@shopify/react-native-skia` 2.6.2 ist installiert. **`react-native-svg` ist NICHT installiert** (`npm ls react-native-svg` leer, nicht in `node_modules`). `react-native-reanimated` 4.5.1 vorhanden. Details in Abschnitt 8.            |
| `src/components/`                                                                                                                                                                                       | nur `charts/`, `glass/`, `ui/`. Es gibt keinen Ordner `brand/`.                                                                                                                                                                           |

**Konsequenz:** Der Arm muss weg. Das ø ist das einzige wirklich eigene Gestaltungselement, das møni hat (Brand-Strategie 01: ø = Insel im Ring aus Wasser). Das Zeichen baut ausschließlich darauf auf.

---

## 1. Das Bildzeichen

### 1.1 Gestaltungsprinzipien

- **Aus der Mechanik abgeleitet, nicht dekoriert.** Der Ring ist in der App schon der wichtigste Datenträger (KcalRing). Der Diagonalstrich ist das „Bonus-Segment“ (Orange). Wer die App kennt, liest das Zeichen als „mein Ring + mein Training“.
- **Ein Strich, eine Geometrie.** Alles ist `stroke-linecap: round`, eine einzige Strichstärke (11 auf 120 = **9,2 % der Breite**), ein einziger Radius (36). Das passt zu den runden SF-Symbols und zur weichen Liquid-Glass-Haptik.
- **Der Schnitt ist ein Bauteil.** Die Ringbögen enden mit Luft (4 Einheiten) vor dem Strich. Dadurch liest sich der Strich als _vor_ dem Ring liegend (Bewegung durchschneidet), nicht als „Verbotsschild“. Ein durchgehender Ring mit Strich wäre „Ø = durchgestrichen = verboten“, genau die falsche Assoziation für eine ruhige, nicht-urteilende Marke. Der Luftspalt entschärft das.
- **Orange nur als Schnitt.** Der Strich ist das _einzige_ Orange im Zeichen. Dasselbe gilt in der App: Orange bedeutet Bewegung / Bonus, nie Warnung.

### 1.2 Drei Entwürfe

Alle auf 120×120, Ring-Mittelpunkt (60,60).

**Entwurf A – „Schnitt-Ring“** (`mark-draft-a-slash-ring.svg`, final als `logo-mark.svg`)

- Ring r=36, Strich 11, aus _zwei_ Bögen mit je 24° Luft zu beiden Diagonalenden. Diagonalstrich von (24.6, 95.4) nach (95.4, 24.6), also exakt 45° und über den Ring hinaus verlängert, wie der Schrägstrich im Buchstaben ø.
- Konstruktion: Bogenenden bei −21°/111° und 159°/291° (Winkel in SVG-Koordinaten). Luft = halbe Strichbreite (5,5) + Spalt (4) + halbe Kappe (5,5) = 15 Einheiten = 24° bei r=36.
- Stärke: sofort als ø lesbar, extrem reduziert (3 Pfade), skaliert bis 16 px, funktioniert einfarbig, trägt die App-Semantik (Ring + Bonus). Schwäche: erinnert flüchtig an das Leerzeichen-/Durchmesser-Symbol; das wird durch die Wortmarke („møni“ daneben) und die runden Enden aufgelöst.

**Entwurf B – „Fortschrittsring mit Bonus-Tick“** (`mark-draft-b-progress.svg`)

- Grauer Ring, mint Fortschrittsbogen (270°), kleiner oranger Strich im Ring-Inneren nach außen. Direktes Abbild des KcalRing.
- Stärke: super verständlich, „Kalorien-App“ auf den ersten Blick. Schwäche: **wie jede Aktivitäts-/Fitness-App** (Apple-Ringe, Oura, Whoop). Bezug zum ø nur noch über den Strich. Verworfen, weil es die Ownability verschenkt. Bleibt als Datenvisualisierung (Hero-Card), nicht als Logo.

**Entwurf C – „m im Ring“** (`mark-draft-c-m-ring.svg`)

- Ein kleines „m“ aus zwei Bögen im offenen Ring, oranger Schnitt oben rechts als Funken.
- Stärke: Initiale, App-Icon-tauglich. Schwäche: Das ø (das eigentliche Alleinstellungsmerkmal) kommt nicht mehr vor, „m im Kreis“ ist ein Standardtrick (Messenger-/Markenlogos), der Strich wirkt angeklebt. Verworfen.

### 1.3 Empfehlung: Entwurf A

Begründung in drei Sätzen: Er ist der einzige der drei, der das ø _ist_ statt es zu zitieren. Er trägt die App-Semantik (Mint-Ring, Orange-Bonus) ohne Erklärung. Er überlebt jede Reduktion (Mono, 16 px, Tint-Icon, Wasserzeichen im Pattern).

Pfade (verbindlich, 120×120):

```svg
<path d="M93.6 47.1A36 36 0 0 1 47.1 93.6"/>   <!-- Bogen unten rechts -->
<path d="M26.4 72.9A36 36 0 0 1 72.9 26.4"/>   <!-- Bogen oben links  -->
<path d="M24.6 95.4L95.4 24.6"/>               <!-- Schnitt (Orange)   -->
<!-- stroke-width 11, stroke-linecap round, fill none -->
```

### 1.4 Varianten und Dateien

| Datei (`docs/identity/assets/`)                      | Zweck                                                                     | Farbe                                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `logo-mark.svg`                                      | Standard-Bildmarke (Hintergründe hell/dunkel, Onboarding, Launch)         | Ring `--moni-accent`, Schnitt `--moni-bonus`                      |
| `logo-mark-mono.svg`                                 | Einfarbig (Tinted-Icon, Wasserzeichen, Stempel, Share-Card-Footer, Print) | `currentColor`                                                    |
| `logo-wordmark.svg`                                  | Wortmarke „møni“                                                          | `currentColor`, ø-Schnitt `--moni-bonus`                          |
| `logo-wordmark-mono.svg`                             | Wortmarke einfarbig                                                       | `currentColor`                                                    |
| `logo-lockup-horizontal.svg`                         | Bildmarke + Wortmarke                                                     | Ring `--moni-accent`, Schnitt `--moni-bonus`, Text `currentColor` |
| `app-icon-1024-light.svg` / `app-icon-1024-dark.svg` | App-Icon-Vorlagen 1024                                                    | feste Hexwerte (siehe 1.6)                                        |
| `app-icon-layer-foreground.svg`                      | Transparente Vordergrund-Ebene für Icon Composer                          | Ink + Orange                                                      |

**Wortmarke (gezeichnet, keine Schrift nötig):** Gebaut aus Linien mit Strichstärke 9, runden Kappen, x-Höhe 40 (y 20–60), Bogenradius 11. Keine Schriftdatei, keine Lizenz, identisch auf jedem Gerät. Buchstaben: `m` = Stamm + zwei Halbkreisbögen, `ø` = Kreis r=20 plus Schrägstrich (ca. 61° statt 45°, damit der Strich in einem kleinen Zähler noch lesbar bleibt), `n` = Stamm + ein Bogen, `i` = Stamm + runder Punkt (r=4.5). Das ø ist Orange, alles andere `currentColor`. Hinweis: die Wortmarke ist eine Linienschrift; ihr Rhythmus (offene, runde Bögen, gleiche Strichstärke wie die Bildmarke) macht sie mit der Bildmarke und SF Rounded kompatibel. Als UI-Schrift empfehlen wir **SF Pro Rounded** (siehe Visual-Designer-Dokument), die Wortmarke ist ausschließlich Logo und wird nie als Fließtext gesetzt.

**Lockup:** Bildmarke 60 px hoch links, Abstand = halbe Ringhöhe (≈ 16 px bei 60), Wortmarke daneben, vertikal an der x-Höhen-Mitte des Textes ausgerichtet. Gestapelte Variante (Mark oben, Wortmarke darunter, Abstand = Strichstärke × 2) nur für Launch/Share-Footer.

### 1.5 Schutzzone, Mindestgrößen, Fehlverwendung

- **Schutzzone:** Rundum = **1 Strichstärke × 2 ≈ 22 Einheiten (18,3 % der Mark-Breite)**, d. h. ein Fünftel der Zeichenbreite. Bei der Wortmarke: Höhe des „i“-Punkt-Durchmessers × 2 (≈ 18 Einheiten auf der Wortmarken-viewBox).
- **Mindestgrößen:** Bildmarke 16 pt (nur `logo-mark-mono`, ab 24 pt zweifarbig). Wortmarke 56 pt Breite (darunter nur Bildmarke). Lockup 120 pt Breite. Auf Tab-Bar/Navigationsleiste nie das Logo, dort SF-Symbols.
- **Ausrichtung:** Das Zeichen wird nie rotiert (der 45°-Strich ist Teil der Identität; ein gedrehter Strich ist eine andere Marke), nie gespiegelt (ø-Strich läuft von unten links nach oben rechts, wie im Buchstaben).
- **Farbe:** Nur die erlaubten Kombinationen: (1) Mint-Ring + Orange-Schnitt auf Neutral/Weiß/Schwarz, (2) alles `currentColor`, (3) Icon-Varianten aus 1.6. Auf Mint-Flächen nie Mint-Ring (siehe `logo-mark-mono` in Ink/Weiß).
- **Fehlverwendungen:** Ring und Schnitt in anderen Farben (Orange-Ring, Rot-Schnitt, Verläufe); Strich bis in den Ring schließen (Luftspalt weg → „Verbot“-Anmutung); Schatten, Glow, 3D, Kontur, Verlauf _im_ Zeichen; Wortmarke in einer Systemschrift nachsetzen; ø ohne Strich oder o mit Punkt; Strich in Rot („durchgestrichen = schlecht“); Zeichen als Fortschrittsanzeige zweckentfremden (dafür gibt es den echten Ring); Zeichen auf fotografischem Hintergrund ohne ruhige Fläche; Mascot und Zeichen im selben Lockup.

### 1.6 App-Icon (iOS 26, Liquid Glass, Icon Composer)

**Idee:** Ring dunkel-ink auf hellem Mint-Verlauf (Light), Mint-Ring auf tiefem Teal-Schwarz (Dark), der Schnitt bleibt in beiden Orange. Der Mark füllt ≈ 62,5 % der Fläche (640 px von 1024), liegt exakt zentriert. Iconform ist die systemseitige Squircle-Maske, wir liefern ein vollflächiges Quadrat ohne Ecken.

| Modus           | Hintergrund                                                                                                                                                                                                                                                                                                                                                                                                           | Ring      | Schnitt   | Datei                     |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ------------------------- |
| Light (Default) | Verlauf `#FFFFFF` → `#9FF2DF` (wie bisheriges `moni.icon`, damit sich nichts „fremd“ anfühlt)                                                                                                                                                                                                                                                                                                                         | `#0B2B27` | `#FF8D28` | `app-icon-1024-light.svg` |
| Dark            | Verlauf `#12302C` → `#071513`                                                                                                                                                                                                                                                                                                                                                                                         | `#00DAC3` | `#FF9230` | `app-icon-1024-dark.svg`  |
| Tinted / Clear  | Das System entfärbt: Hintergrund wird vom Nutzer-Tint bestimmt, der Vordergrund wird als **Luminanz** gelesen. Deshalb: Mark in `app-icon-layer-foreground.svg` als **eine Ebene**, Ring und Schnitt im Icon Composer nur durch den Helligkeitsunterschied trennbar (Ring dunkel, Schnitt hell). Orange wird auf Tinted zu Graustufe; Kontrast Ring/Schnitt bleibt über Luminanz erhalten (Ink 0.14 vs. Orange 0.62). |           |           | gleiche Ebene             |

**Aufbau im Icon Composer (nur der Owner, siehe 8.4):**

1. Neue `.icon`-Datei (Gruppe 1). Hintergrund = Fill „Linear Gradient“ (Light: `#FFFFFF` → `#9FF2DF`, Dark als Appearance-Variante).
2. Eine Gruppe mit **zwei Ebenen**: Ebene A = Ring (nur die zwei Bögen als PNG/SVG, 1024), Ebene B = Schnitt (nur der Strich). Zwei getrennte Ebenen erlauben dem Liquid-Glass-Renderer, den Schnitt leicht über dem Ring schweben zu lassen (Specular-Highlight läuft über beide). Der aktuelle Stand hat nur eine Ebene mit Translucency 0,3 und Schatten `neutral 0.5`; neu: Schatten `chromatic`/`neutral 0.35`, Translucency 0,2 (der Ring soll solide bleiben).
3. Ebenen mit **SVG** importieren (Icon Composer akzeptiert SVG und PNG; SVG bleibt scharf bei beliebigem Scale).
4. Appearance-Varianten Default / Dark / Clear / Tinted jeweils prüfen: In Dark den Ring auf `#00DAC3`, Schnitt `#FF9230`.

**Wichtig – Splitten:** `app-icon-layer-foreground.svg` enthält beide Teile in einer Datei. Für zwei Ebenen im Composer die Datei zweimal importieren und je eine Gruppe löschen (Ring: 3. Pfad `L95.4 24.6` entfernen; Schnitt: erste zwei Pfade entfernen). Alternativ aus `logo-mark-mono.svg` ableiten.

**Flat-Fallback:** `assets/icon.png` (1024, sRGB, ohne Alpha) einmal aus `app-icon-1024-light.svg` exportieren (z. B. im Browser auf 1024 rendern oder Sketch/Figma). Das ist der Fallback für alle Pfade ohne Icon Composer.

---

## 2. Illustrationsstil

### 2.1 Regeln

| Regel                    | Wert                                                                                                                                                                                                                                          |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linie**                | 3 Einheiten auf einer 160×120-Fläche (≈ 1,9 %), `round` Kappen und Joins, überall gleich. Akzentlinien (Orange/Mint, „Zeichenstrich“) 4–6, nie dünner als die Kontur. Gestrichelt nur für „leer / noch nicht“ (`3 9`, runde Kappen = Punkte). |
| **Farbe**                | **Max. 3 Farben pro Bild:** Ink (`currentColor`), Mint `--moni-accent`, Orange `--moni-bonus`; dazu **eine** helle Fläche `--moni-soft` (Mint 15 %). Rot `--moni-danger` nur in Fehler. Keine Verläufe, keine Schatten, keine Texturen.       |
| **Flächen**              | Ein einzelner Mint-Soft-Füller für den „Hauptkörper“ (Schüssel, Wolke, Glocke, Balken). Alles andere bleibt Linie. Flächen immer **mit** Kontur.                                                                                              |
| **Formen**               | Rundungen: Ecken-Radius ≥ 6 (bei 160×120), Flächen sind aus Kreisen, Halbkreisen, Kapseln. **Keine spitzen Winkel außer dem Schnitt (45°).**                                                                                                  |
| **Perspektive**          | **Flach-frontal**, wie ein Strichzeichnung auf Papier. Keine Isometrie, keine Perspektive, keine Überschneidungen von mehr als einem Objekt. Der Boden ist (wenn nötig) eine Linie bei 35 % Deckkraft.                                        |
| **Das Motiv (Signatur)** | Jede Illustration enthält **den Schnitt** (45° Orange) als Bewegungs-/Zustandssignal und/oder **einen Ring** (gestrichelt = leer, voll = geschafft). Das ist der Wiedererkennungs-Anker.                                                      |
| **Welt**                 | Objekte statt Menschen: Schüssel, Hantel, Glocke, Wolke, Balken, Herz, Ring. **Keine Personen, keine Gesichter außer dem Maskottchen, keine Hände, keine Körper** (verhindert Körperbild-Normierung und Stock-Anmutung).                      |
| **Größe**                | Illustrations-viewBox `160×120`, Darstellung in der App 160–200 pt Breite, zentriert, `color` = `label`. Hero-Varianten (Onboarding) 240 pt.                                                                                                  |
| **Tabu**                 | Fotos, Emoji, Clipart-Cartoon-Gemüse, Waagen mit Maßband, Muskel-Arme, Messer/Gabel-Piktogramm-Klischees (nur Besteck als Nebenelement), Konfetti-Explosionen (Konfetti = max. 4 Striche), Rot für „zu viel gegessen“, Stockfoto-Look.        |

### 2.2 Katalog (16 Motive)

Mit ✔ = fertig als SVG in `assets/`.

| #   | Moment                                 | Motiv                                                                                                                                                           | Datei                     |
| --- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 1   | **Keine Mahlzeiten (Today leer)**      | Leere Schüssel (Soft-Fläche), darüber ein **gestrichelter Ring** mit Schnitt = „hier landet gleich dein Essen“, Gabel rechts.                                   | ✔ `ill-empty-meals.svg`   |
| 2   | **Kein Workout**                       | Hantel (Soft-Scheiben, Mint-Außenscheiben) in gestricheltem Ring, Orange-Schnitt oben rechts.                                                                   | ✔ `ill-empty-workout.svg` |
| 3   | **Keine Daten (Insights)**             | Drei gestrichelte „Platzhalter“-Balken, kleiner Ring mit Schnitt als Cursor am höchsten Balken.                                                                 | ✔ `ill-no-data.svg`       |
| 4   | **Offline**                            | Wolke (Soft) mit orangenem 45°-Strich quer. Der Strich ist hier bewusst _kein_ Verbot, sondern das Marken-ø: „Verbindung getrennt, deine Einträge sind sicher“. | ✔ `ill-offline.svg`       |
| 5   | **Fehler**                             | Ring in drei Stücken (rot), Ausrufezeichen in der Mitte, Orange-Funke. Rot nur hier.                                                                            | ✔ `ill-error.svg`         |
| 6   | **Ziel erreicht**                      | Voller Mint-Ring mit Haken, vier orange Funkenstriche.                                                                                                          | ✔ `ill-goal-reached.svg`  |
| 7   | **Streak / Serie**                     | Sieben Punkte steigend: Soft (verpasst/offen) → Mint (geschafft) → großer Ring mit Schnitt (heute).                                                             | ✔ `ill-streak.svg`        |
| 8   | **Notifications-Primer**               | Glocke (Soft) mit Ring-Badge + Schnitt.                                                                                                                         | ✔ `ill-notifications.svg` |
| 9   | **Health-Primer**                      | Herz (Soft) mit Puls-Linie (Mint) in gestricheltem Ring.                                                                                                        | ✔ `ill-health-primer.svg` |
| 10  | **Onboarding: Willkommen**             | Das Zeichen groß (Ring + Schnitt), Schnitt „fährt“ von links unten ein (Animation, siehe 03-motion). Kein neues Bild nötig.                                     | Basis `logo-mark.svg`     |
| 11  | **Onboarding: Berechnung läuft**       | Ring, der sich aus 12 Segmenten füllt, Schnitt dreht nie. Segmente = Skia, siehe Pattern-Rezept.                                                                | Skia, aus `logo-mark.svg` |
| 12  | **Onboarding: Ziel/Tempo**             | Linie (Gewichtsverlauf) endet in einem Ring mit Schnitt (= Zieldatum).                                                                                          | Beschreibung              |
| 13  | **Kamera-Berechtigung / Foto-Analyse** | Rahmen-Ecken (wie `icon-scan-label`) um eine Schüssel; Mint-Ring pulsiert.                                                                                      | Beschreibung              |
| 14  | **Wochenrückblick leer**               | Sieben leere Ringe (gestrichelt) nebeneinander, der heutige mit Schnitt.                                                                                        | Beschreibung              |
| 15  | **Pause / Ruhetag**                    | Maskottchen „müde“ + Z (`mascot-sleepy.svg`), ohne Zusatzdeko.                                                                                                  | ✔ (Mascot)                |
| 16  | **Alles synchronisiert / Danke**       | Maskottchen „stolz“ mit drei Funkenstrichen (`mascot-happy.svg`).                                                                                               | ✔ (Mascot)                |

**Texte:** Jedes Motiv bekommt max. 2 Zeilen: eine Überschrift (Brand-Voice aus 01), ein Hinweis. Illustration ist nie das einzige Mittel; `accessibilityRole="image"` + `accessibilityLabel` aus der Überschrift, dekorativ sonst `accessible={false}`.

### 2.3 Farb-Platzhalter in den SVGs

Alle SVGs benutzen genau diese Variablen und nichts anderes. Die Fallback-Werte sind die aktuellen `theme.config.js`-Hexwerte (Light):

| Variable                     | Bedeutung                                             | Fallback                    | Quelle in der App       |
| ---------------------------- | ----------------------------------------------------- | --------------------------- | ----------------------- |
| `currentColor`               | Ink / Konturen                                        | –                           | `label` (PlatformColor) |
| `var(--moni-accent,#00C8B3)` | Mint                                                  | `#00C8B3`                   | `useThemeHex('accent')` |
| `var(--moni-bonus,#FF8D28)`  | Orange (Schnitt, Bonus)                               | `#FF8D28`                   | `useThemeHex('bonus')`  |
| `var(--moni-soft,#D6F5F0)`   | Mint-Fläche (Accent bei ~15 % auf `systemBackground`) | `#D6F5F0` (dark: `#14332F`) | berechnet               |
| `var(--moni-danger,#FF383C)` | Fehler                                                | `#FF383C`                   | `useThemeHex('danger')` |

Die Dateien rendern so in jedem Browser/QuickLook/Figma ohne Nachbearbeitung. In React Native werden die `var(...)`-Ausdrücke beim Umwandeln in TSX durch Props ersetzt (siehe 8.2).

---

## 3. Maskottchen

### 3.1 Entscheidung: **Ja, aber klein und selten – „Ø“ (gesprochen „Mö“)**

**Warum ja:** (1) Die App wirkt zu simpel, weil sie _kein Gegenüber_ hat. Ein Kalorien-Tracker braucht eine ruhige Stimme für Momente, in denen Zahlen allein kalt sind (Ruhetag, Fehler, Rekord, „du hast gestern nichts geloggt“). (2) Die Form ist ohnehin da: ein Kreis mit einem 45°-Schnitt. Kein neues Design-Asset, sondern _das Zeichen mit Gesicht_. (3) Es ersetzt die Emojis (siehe Audit 01: „Emoji als Stimmung“) durch ein eigenes, kontrollierbares Ausdrucksset, das zur Marke passt.

**Warum klein und selten:** Fitness-Apps mit Dauer-Maskottchen kippen schnell ins Kindische oder ins Manipulative (Duolingo-Schuld-Muster). møni ist ruhig und urteilsfrei. Regeln:

- **Nur in Moments und Empty States**, nie in Daten-Screens, nie in Tabs, nie auf Buttons, nie im Logo-Lockup, nie im App-Icon.
- **Nie vorwurfsvoll.** Der Zustand „besorgt“ gilt Fehlern und Offline („da hakt etwas“), niemals verpassten Zielen oder Gewicht.
- **Kein Sprechen im Namen des Körpers.** Ø kommentiert den _Tag_, nicht den Menschen („Ruhetag“), nie „du hast zugenommen“.
- Maximal ein Auftritt pro Screen, maximal einmal pro Sitzung für Feier-Zustände.

### 3.2 Konstruktion

Kreis r=40 (Soft-Fläche, Ink-Kontur 5), oben links ein **orangener Kreisabschnitt** (Sehne 45°, entspricht dem Schnitt des Logos: Ø ist ein ø, bei dem der Schnitt ihm die „Mütze“ aufsetzt). Gesicht: zwei Punkte (r=4.5) oder Linienaugen, ein Strich-Mund. Keine Arme, keine Beine, kein Hals. Gesichtsausdruck ausschließlich über Augen/Brauen/Mund + 1–3 Zusatzstriche (Funken, Z, Schweiß). **Anatomie bleibt 100 % geometrisch.**

### 3.3 Fünf Stimmungen

| Stimmung      | Wann                                                      | Merkmale                                                              | Datei                  |
| ------------- | --------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------- |
| **neutral**   | Standard, Onboarding, „Hallo“                             | Punkt-Augen, kleines Lächeln                                          | ✔ `mascot-neutral.svg` |
| **stolz**     | Tagesziel / Ring geschlossen, Streak-Meilenstein, Sync ok | Bogen-Augen (Freude), offener Mund, Wange, 3 orange Funken            | ✔ `mascot-happy.svg`   |
| **müde**      | Ruhetag, Nachtmodus, „kein Training heute“                | Strich-Augen, kleiner Mund „o“, mint Z                                | ✔ `mascot-sleepy.svg`  |
| **besorgt**   | Fehler, Offline, Sync-Konflikt (nie bei Zielen)           | Brauen innen oben, geschwungener Mund, kleiner Schweißbogen           | ✔ `mascot-worried.svg` |
| **motiviert** | Workout-Start, Erinnerungs-Notification-Primer            | Brauen nach innen unten (Entschlossenheit), breites Lächeln, 2 Funken | ✔ `mascot-pumped.svg`  |

Animation (mit Motion-Team abgestimmt): Atmen = Skalierung 1 → 1,03, 2,4 s Ease-in-out (ersetzt die 1,06-Pulsation des LaunchScreens); Stimmungswechsel = Augen/Mund in 120 ms morphen, nie springen. `useReducedMotion()` → statisch.

---

## 4. Generatives Pattern: „Ring-Feld“

**Idee:** Ein Raster aus Mini-Zeichen (Ring + Schnitt) in unterschiedlicher Größe, wie Wellen oder Inseln im Wasser (Brand-Strategie: ø = Insel). Es ist _das Logo als Textur_: erkennbar, aber nie laut. Verwendung: Hero-Card-Hintergrund (Today), Share-Cards, Onboarding-Willkommen, Premium-Paywall, leere Flächen im Profil.

**Datei:** `pattern-ring-field.svg` (240×240, 4×4 Zellen à 60, nahtlos kachelbar, `currentColor`, ein Paar Orange-Schnitte).

### 4.1 Rezept (Skia/SVG, parametrisiert)

Eingabe: `cols`, `rows`, `cell` (Standard 60), `seed`, `density` (0–1, Anteil leerer Zellen, Standard 0.2), `opacity`, `hotRatio` (Anteil orange Schnitte, Standard 0.12).

Pro Zelle `(i, j)`:

1. `h = hash(seed, i, j)` in [0, 1) (z. B. mulberry32 mit `seed ^ (i*73856093) ^ (j*19349663)`).
2. Wenn `h < density` → Zelle leer lassen.
3. `s = lerp(0.35, 1.0, ease(h2))`, `ease(t) = t*t` (viele kleine, wenige große).
4. Radius `r = 22 * s`, Strichstärke `sw = max(2.5, 6 * s)`, Mittelpunkt `(i*cell + cell/2, j*cell + cell/2)`.
5. Zwei Bögen wie im Logo (Bogenenden bei `−45°+g`, `135°−g`, `135°+g`, `315°−g`, `g = deg((1.4 * sw) / r)` begrenzt auf 40°).
6. Schnitt von `center + d*(−0.707, +0.707)` nach `center + d*(+0.707, −0.707)`, `d = 1.38 * r`.
7. `h3 < hotRatio` → Schnitt in `bonus`, sonst `currentColor`.
8. Alles mit `opacity` (Ink-Variante 0.06–0.12 auf Hell, 0.08–0.16 auf Dunkel; Mint-Variante `accent` bei 0.14).

**Varianten:** (a) _Ruhig_ (Standard): `density .2`, Opacity 0.08. (b) _Hero_: kein Dichte-Loch, Mint statt Ink, Opacity 0.18, vertikaler Alpha-Verlauf (unten ausgeblendet) per Skia `LinearGradient` als Maske. (c) _Share-Card_: größere Zellen (`cell` 90), max. 6 Zellen sichtbar, Orange-Anteil hoch (0.3).

**Skia (nur dort, wo animiert wird):** `Canvas` + je Zelle ein `Path` aus `Skia.Path.MakeFromSVGString(d)` (statisch vorberechnet) oder `Group` mit `Matrix`. Parallax: der Hintergrund bewegt sich beim Scrollen mit 0,15× Geschwindigkeit; „Atmen“ pro Zelle `scale ±3 %`, Phase aus `h`. Alle Animationen laufen auf UI-Thread-SharedValues; Reduced Motion → statisch.

**Statisch (empfohlen für Listen/Cards):** `pattern-ring-field.svg` als Bild/SVG-Komponente, `opacity` per Prop. Kachel = zwei Wiederholungen horizontal/vertikal.

---

## 5. Icon-System

### 5.1 SF Symbols vs. eigene Icons

- **SF Symbols bleiben der Standard** für alles, was die Plattform schon hat: Tab-Bar (NativeTabs), Navigationsleisten, Toggles, Chevrons, Plus, Kamera, Teilen, Löschen, Einstellungen. Vorteil: Dynamic Type, Gewichte, Rendering Modes, Liquid-Glass-Verhalten, kostenlose A11y.
- **Eigene Icons nur dort, wo møni-Domäne ist** und SF Symbols entweder fehlen oder nach „irgendeiner Fitness-App“ aussehen: Mahlzeiten-Typen, die drei Makros, Kalorien-Ring-Zeichen, Workout-Bonus, Etikett-Scan. Bonus: die Makro-Glyphen sind die Basis für farbcodierte Makro-Balken.
- **Konvention:** 24×24, Strich 2, `round`/`round`, keine Füllung, `currentColor`. Auf iOS-SF-Symbol-Größen abgestimmt (Regular-Gewicht ≈ 2 px bei 24).

### 5.2 Set (12 Icons, `assets/icons/`)

| Icon            | Datei                     | Bedeutung / Idee                                                             |
| --------------- | ------------------------- | ---------------------------------------------------------------------------- |
| Frühstück       | `icon-meal-breakfast.svg` | Sonne über Horizont                                                          |
| Mittagessen     | `icon-meal-lunch.svg`     | Teller von oben (zwei Ringe)                                                 |
| Abendessen      | `icon-meal-dinner.svg`    | Mond                                                                         |
| Snack           | `icon-meal-snack.svg`     | Apfel (ein Blatt-Strich)                                                     |
| Protein         | `icon-macro-protein.svg`  | Drei Knoten, verbunden = Aminosäure-Molekül (nicht Fleisch-/Muskel-Klischee) |
| Kohlenhydrate   | `icon-macro-carbs.svg`    | Ähre                                                                         |
| Fett            | `icon-macro-fat.svg`      | Tropfen                                                                      |
| Kalorien        | `icon-kcal-ring.svg`      | Mini-Logo: Ring + Schnitt, auf 24 px lesbar; ersetzt das Flammen-Klischee    |
| Workout-Bonus   | `icon-workout-bonus.svg`  | Blitz = „zusätzliche Energie“ (Orange-Kontext)                               |
| Gewicht         | `icon-weight.svg`         | Waage (Quadrat mit Zeiger-Bogen)                                             |
| Etikett/Barcode | `icon-scan-label.svg`     | Rahmenecken + drei Balken                                                    |
| Foto-Mahlzeit   | `icon-photo-meal.svg`     | Kamera mit Ring-Linse                                                        |

**Farbcode Makros** (mit Visual-Designer abzustimmen): Protein = Ink-Variante des Accent, Carbs = Orange-Ton (nie `danger`), Fett = neutrales Grau-Blau. Die Glyphe trägt die Bedeutung, nicht nur die Farbe (Farbenblindheit).

---

## 6. Badges / Achievements

### 6.1 Formsprache

Rundes Siegel (r=54), Soft-Fläche, Mint-Rand 6, Motiv in Ink-Kontur 5, **ein** orangener Strich als Marken-Signatur. Noch nicht erreicht: komplett `currentColor` bei 20 % Deckkraft, Motiv als Umriss (Soft/Mint/Orange entfallen), gestrichelter Rand. Keine Medaillen, Kronen, Sterne, Pokale. Kein Rangsystem (Gold/Silber/Bronze), keine Zahlen außer wo das Motiv _ist_ (7). Names in Brand-Stimme: ruhig, konkret, ohne Ausrufezeichen.

### 6.2 Zehn Abzeichen

| #   | Name                    | Auslöser                                     | Motiv                                                         | Datei                     |
| --- | ----------------------- | -------------------------------------------- | ------------------------------------------------------------- | ------------------------- |
| 1   | **Erster Bissen**       | Erste Mahlzeit geloggt                       | Schüssel + Orange-Schnitt als Dampf                           | ✔ `badge-first-log.svg`   |
| 2   | **Sieben am Stück**     | 7 Tage in Folge geloggt                      | Ring aus 7 Punkten + gezeichnete „7“ mit Schnitt              | ✔ `badge-streak-7.svg`    |
| 3   | **Ring geschlossen**    | Tag im Zielbereich abgeschlossen             | Mint-Ring, Orange-Verschluss oben, Haken                      | ✔ `badge-ring-closed.svg` |
| 4   | **Erster Schritt raus** | Erstes Workout (auch aus Health)             | Ring mit Schnitt in „Bewegung“ (Schnitt wandert aus dem Ring) | Beschreibung              |
| 5   | **Etikettenleser**      | 10 Barcode-/Label-Scans                      | Rahmenecken um drei Balken                                    | Beschreibung              |
| 6   | **Gleichgewicht**       | 7 Tage Makro-Balance im Korridor             | Drei Tropfen/Ähre/Molekül auf einer Waagelinie                | Beschreibung              |
| 7   | **Ruhetag-Profi**       | Bewusst Ruhetag gesetzt und kcal im Korridor | Ø müde (`mascot-sleepy`-Variante als Siegel)                  | Beschreibung              |
| 8   | **Bonus verdient**      | Erstes Mal Workout-Bonus gegessen            | Blitz im Ring, Schnitt = Bonus                                | Beschreibung              |
| 9   | **Dreißig Tage dabei**  | 30 Tage Nutzung                              | Ring aus 30 Punkten in 3 Zehnerblöcken                        | Beschreibung              |
| 10  | **Neuer Pegel**         | Gewichtsziel erreicht (nur bei Nutzer-Ziel)  | Ring mit Horizontlinie + Sonne (Insel-Motiv)                  | Beschreibung              |

**Ton-Regel:** Badges feiern Verhalten (loggen, bewegen, regelmäßig sein), nie Zahlen auf der Waage und nie Verzicht.

---

## 7. Share-Cards

Format: 1080×1350 (4:5, für Stories zusätzlich 1080×1920 mit mehr Luft oben/unten). Export per `react-native-view-shot` oder Skia `makeImageSnapshot`. Immer **ruhige Fläche + 1 Zahl + Ring**. Kein Foto, keine Namen/Gewicht (Privacy-Default: aus).

**A) Wochenrückblick**

- Hintergrund: Ink-dunkel (`#071513`) oder Hell (`#FFFFFF`) je nach Systemmodus, darüber Pattern „Hero“ (Mint, 0.14, nach unten ausgeblendet).
- Oben links: Wortmarke 120 px breit. Oben rechts: Datumsbereich in SF Rounded Semibold 28 pt, `secondaryLabel`.
- Mitte: **Sieben Mini-Ringe** (Mo–So) auf einer Linie, Ringfüllung = Tagesstand, heutiger/best Tag mit Orange-Schnitt. Darunter eine große Zahl („6 von 7 Tagen im Korridor“, SF Rounded Heavy 96 pt), eine Zeile Kontext („Ø 2 140 kcal, 3 Workouts“), maximal.
- Unten: Lockup klein, `logo-mark-mono` bei 50 % Deckkraft. Kein Link, kein QR.

**B) Workout-Summary**

- Fläche wie A, aber Pattern _Share-Variante_ (große Zellen, Orange-Anteil 0.3).
- Oben: Workout-Name. Mitte: großer Ring (Dauer als Bogenlänge 0–90 min), darin die Hauptzahl (kcal verbrannt) und darunter Dauer. Der Orange-Schnitt läuft durch den Ring (= „Bonus verdient“: „+ 320 kcal für heute“).
- Unten: 3 Chips (Sätze, Volumen kg, Dauer) ohne Icons, nur Zahl + Label.
- Unten: Mark mono.

**C) Meilenstein (Badge)**: Badge zentriert groß (480 px), Name darunter, Pattern ruhig. Kein Zusatztext.

---

## 8. Technische Umsetzung

### 8.1 Bestand (geprüft)

- `npm ls react-native-svg` → leer; `node_modules/react-native-svg` fehlt.
- `@shopify/react-native-skia` 2.6.2 vorhanden, Skia kann SVG-Pfade (`Skia.Path.MakeFromSVGString`) und ganze SVGs (`Skia.SVG.MakeFromString` + `<ImageSVG>`).
- `react-native-reanimated` 4.5.1, NativeWind (Layout only).

### 8.2 Empfehlung: `react-native-svg` ergänzen (statt Skia für Statik)

| Option                                                          | Vorteil                                                                                                                                     | Nachteil                                                                       |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **A: `react-native-svg`** (`npx expo install react-native-svg`) | Native Views, ideal für viele kleine Instanzen (Listen, Zeilen), `currentColor`/Props, A11y, SVGR-Workflow, gleiche Pfade wie in den Assets | Neues natives Modul → **neuer Dev-Build nötig** (Owner), kleine Bundle-Zunahme |
| B: Skia `ImageSVG`                                              | keine neue Dep, Variablen funktionieren nicht (`var()`/`currentColor` werden nicht aufgelöst; Zeichenkette vorher ersetzen)                 | jede Instanz ist eine GPU-Canvas: teuer in Listen; schlechter für A11y-Labels  |
| C: Skia `Canvas` + `Path` je Asset                              | volle Kontrolle, animierbar (Ring füllt sich, Schnitt fährt ein)                                                                            | Boilerplate pro Asset                                                          |

**Entscheidung:** **A für alle statischen Brand-Elemente** (Logo, Wortmarke, Illustrationen, Icons, Badges), **C nur für animierte/generative Stellen** (Launch-/Onboarding-Mark, Ring-Feld mit Parallax). Das ist die gleiche Aufteilung wie bei den Charts (Skia für Daten-Grafik, RN-Views für Layout).

**SVG → TSX:** per `npx @svgr/cli --native --typescript` oder von Hand (die Assets sind klein, 3–8 Elemente). Ersetzungsregeln beim Konvertieren:

- `style="stroke:var(--moni-accent,#00C8B3)"` → `stroke={accent}`
- `style="fill:var(--moni-soft,#D6F5F0)"` → `fill={soft}`
- `style="fill:var(--moni-bonus,#FF8D28);stroke:var(--moni-bonus,#FF8D28)"` → `fill={bonus} stroke={bonus}`
- `currentColor` → `color`-Prop (Standard `PlatformColor('label')` bzw. `useThemeHex`)

Skia kann kein `PlatformColor` (CLAUDE.md: Skia-Canvas nimmt nur konkrete Farben); darum liefert `useThemeHex()` die Werte, die auch in react-native-svg sicher funktionieren (SVG kann `PlatformColor` ebenfalls nicht in jedem Attribut, deshalb immer Hex aus `useThemeHex`).

### 8.3 Dateiplan (`src/components/brand/`, wird von der Umsetzung angelegt, nicht von diesem Dokument)

```
src/components/brand/
  index.ts                  // Barrel
  palette.ts                // useBrandPalette(): { ink, accent, bonus, soft, danger } via useThemeHex + useColorScheme
  Logo.tsx                  // <LogoMark size mono? />, <Wordmark width mono? />, <Lockup … />
  Illustration.tsx          // <Illustration name="empty-meals" size? accessibilityLabel? />
  illustrations/*.tsx       // je ein Pfad-Set pro SVG, nehmen Palette-Props
  Mascot.tsx                // <Mascot mood="neutral|happy|sleepy|worried|pumped" size? animated? />
  Badge.tsx                 // <Badge name locked? size? />
  BrandIcon.tsx             // <BrandIcon name="macro-protein" size color />
  RingFieldPattern.tsx      // Skia-Variante (animierbar) + statische Variante
```

Skizze der API:

```tsx
// src/components/brand/Logo.tsx (Vorschlag, Beispiel)
import Svg, { Path } from 'react-native-svg';
import { useBrandPalette } from './palette';

export function LogoMark({
  size = 64,
  mono = false,
}: {
  size?: number;
  mono?: boolean;
}) {
  const p = useBrandPalette();
  const ring = mono ? p.ink : p.accent;
  const cut = mono ? p.ink : p.bonus;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      strokeLinecap="round"
      strokeWidth={11}
      accessibilityRole="image"
      accessibilityLabel="møni"
    >
      <Path
        d="M93.6 47.1A36 36 0 0 1 47.1 93.6M26.4 72.9A36 36 0 0 1 72.9 26.4"
        stroke={ring}
      />
      <Path d="M24.6 95.4L95.4 24.6" stroke={cut} />
    </Svg>
  );
}
```

```tsx
// Illustration.tsx: eine Komponente, die Props wie bei EmptyState nimmt (ersetzt PlaceholderScreen-Illustrationen)
type Props = { name: IllustrationName; width?: number; title?: string }; // viewBox 160×120
```

Regeln: Komponenten zeichnen **nur** aus den hier abgelegten Pfaden (Quelle der Wahrheit: `docs/identity/assets/*.svg`, bei Änderungen beide Orte pflegen); keine Zahlen/Texte im SVG; Labels kommen von `t('…')`; i18n-Keys für Alt-Texte neu in `de.json`/`en.json` (Harte Regel 2).

### 8.4 App-Icon / Splash / LaunchScreen aktualisieren

| Thema                                      | Wer                                              | Schritt                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------ | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `assets/moni.icon` (Icon Composer)         | **nur Owner** (GUI, Icon Composer aus Xcode 26+) | Wie 1.6. Zwei Ebenen, Appearances Default/Dark/Clear/Tinted prüfen, speichern, Datei ersetzen. Kein CLI-Weg zum Erzeugen der `.icon`-Metadaten für Liquid Glass; Hand-Editieren von `icon.json` ist möglich (Format ist JSON, wie im Repo), aber Variantenprüfung braucht die GUI.                                                                                                                                                                        |
| `assets/icon.png` (Flat-Fallback)          | Owner oder Umsetzung                             | Aus `app-icon-1024-light.svg` auf 1024×1024 exportieren (Figma/Sketch/Browser-Screenshot), sRGB, ohne Alpha.                                                                                                                                                                                                                                                                                                                                              |
| `splash-icon.png` / `splash-icon-dark.png` | Umsetzung                                        | Transparente PNG des Zeichens (Ring `#00C8B3`/`#00DAC3`, Schnitt `#FF8D28`/`#FF9230`) ~ 288×288 pt @3x. Plugin-Config in `app.config.ts` (Splash-Plugin) behält Backgroundfarbe.                                                                                                                                                                                                                                                                          |
| `launch-arm.png`                           | Umsetzung                                        | **Ersetzen** durch `launch-mark.png` (Zeichen als **Template-PNG, weiß/schwarz auf transparent**, weil `LaunchScreen.tsx` `tintColor` einfärbt: dann wäre der Schnitt nicht orange). Besser: `LaunchScreen` auf `<LogoMark>` (react-native-svg) umstellen, dann entfällt die PNG, beide Farben bleiben, die Puls-Animation (Reanimated) bleibt. Splash (nativ) und LaunchScreen (JS) müssen dasselbe Bild an derselben Stelle zeigen, sonst „springt“ es. |
| `app.config.ts`                            | Umsetzung                                        | Keine Pfadänderung nötig (`icon`, `ios.icon` bleiben). Neue Splash-PNGs unter gleichem Namen ablegen.                                                                                                                                                                                                                                                                                                                                                     |
| Native Rebuild                             | Owner                                            | Icon/Splash/`react-native-svg` brauchen einen neuen Dev-Build (`npx expo prebuild --clean` + `run:ios`, siehe CLAUDE.md).                                                                                                                                                                                                                                                                                                                                 |

### 8.5 Test / Abnahme

- Jedes Asset in Light **und** Dark prüfen (Ink wechselt, Mint/Orange via `useThemeHex`).
- Mindestgrößen aus 1.5 im Simulator ablesen (16 pt Mono, 24 pt farbig).
- A11y: Logo `accessibilityLabel="møni"`; Illustrationen dekorativ (`accessible={false}`), außer sie tragen allein die Bedeutung.
- Dynamic Type: Illustrationen skalieren **nicht** mit Dynamic Type (feste Breite), Text darunter schon.

---

## 9. Offene Punkte für den Owner

1. **Entwurf A freigeben** (oder B/C als Alternative).
2. Wortmarke: gezeichnete Linienschrift ok oder doch eine Schrift (SF Rounded Heavy) gewünscht? (Gezeichnet ist ownable, aber weniger flexibel bei Sonderzeichen.)
3. Maskottchen **Ø**: ja/nein. Wenn nein, tragen stattdessen **Ring-Zustände + Schnitt-Animation** die Persönlichkeit (z. B. der Schnitt „zuckt“ bei neuem Bonus, der Ring „atmet“ im Leerlauf), und die Mascot-Dateien entfallen.
4. Icon Composer: Neues `.icon` im GUI erstellen und `assets/moni.icon` ersetzen.
5. Entscheidung `react-native-svg` ergänzen (neuer Dev-Build), sonst nur Skia-Pfade (Variante C).

## 10. Dateiübersicht (`docs/identity/assets/`)

- Zeichen: `logo-mark.svg`, `logo-mark-mono.svg`, `logo-wordmark.svg`, `logo-wordmark-mono.svg`, `logo-lockup-horizontal.svg`, `mark-draft-a-slash-ring.svg`, `mark-draft-b-progress.svg`, `mark-draft-c-m-ring.svg`
- App-Icon: `app-icon-1024-light.svg`, `app-icon-1024-dark.svg`, `app-icon-layer-foreground.svg`
- Illustrationen (9): `ill-empty-meals`, `ill-empty-workout`, `ill-no-data`, `ill-offline`, `ill-error`, `ill-goal-reached`, `ill-streak`, `ill-notifications`, `ill-health-primer` (`.svg`)
- Maskottchen (5): `mascot-neutral`, `mascot-happy`, `mascot-sleepy`, `mascot-worried`, `mascot-pumped` (`.svg`)
- Badges (3): `badge-first-log`, `badge-streak-7`, `badge-ring-closed` (`.svg`)
- Pattern: `pattern-ring-field.svg`
- Icons (12, `icons/`): `icon-meal-breakfast`, `icon-meal-lunch`, `icon-meal-dinner`, `icon-meal-snack`, `icon-macro-protein`, `icon-macro-carbs`, `icon-macro-fat`, `icon-kcal-ring`, `icon-workout-bonus`, `icon-weight`, `icon-scan-label`, `icon-photo-meal` (`.svg`)
