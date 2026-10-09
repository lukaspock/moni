# møni – Visuelles System (Farbe, Typografie, Flächen, Layout)

> Rolle: Visual Designer im Identity-Team. Stand: 2026-10-09. Dieses Dokument ist ein **Vorschlag**, es ändert keinen App-Code. Alle Hex-Werte sind per WCAG-Skript geprüft (Abschnitt 2.7). Entscheidungen sind jeweils mit „Warum“ begründet, damit das Team sie gegen die Arbeit von Brand, Motion, Mark und UX abgleichen kann.

---

## 0. Kurzfassung (die 8 Entscheidungen)

1. **Leitidee „Nachtschicht im Fjord“**: tiefes Waldgrün-Schwarz, warmes Papier, ein einziger grell-lebendiger Lime-Akzent, ein Glutorange für alles, was Training/Bonus ist. Kein Mint, kein iOS-Blau, kein Kaltgrau mehr.
2. **Primärfarbe ist zweigeteilt**: Dark = **Lime `#C6F135`** (Fläche, Ring, Button), Light = **Forest `#1D6B47`** (weil Lime auf Papier nur 1,2:1 hat). Gleicher Charakter, unterschiedliche Aufgabe.
3. **Der „Hero-Block“ ist in beiden Modi dunkel** (Forest-Verlauf `#1D4F3B` → `#0F2A20`). Dadurch dürfen alle Skia-Grafiken (Kcal-Ring) feste Hex-Werte nutzen, ohne Dark-Mode-Problem, und Today bekommt in Light Mode trotzdem einen kräftigen Anker.
4. **Makrofarben**: Protein **Violett** `#A18BFF`, Kohlenhydrate **Honig** `#FFCB3D`, Fett **Cyan** `#4CCBF2` (Light: `#6A4FE0` / `#B87A00` / `#0B7FA8`). Zusätzlich Buchstaben-/Formcodierung für Farbenblinde.
5. **Neutrale sind warm** (Papier/Tinte statt Systemgrau). Dafür werden Hintergründe/Labels aus **benannten Asset-Catalog-Farben** gebaut (`PlatformColor('MoniSurface1')`), nicht mehr aus `systemBackground`. Bleibt nativ-dynamisch, keine Hard-Rule-Verletzung.
6. **Schrift**: Display = **Bricolage Grotesque** (`@expo-google-fonts/bricolage-grotesque`, 600/700/800), Text/UI = **SF Pro (System)** bleibt. Zahlen immer tabular.
7. **Formsprache**: große, weiche, „continuous“ Radien (Karten 24, Hero 32, Pills voll), dicke Ringe (22 pt), keine Schatten im Dark Mode (Tiefe über Flächenstufen + 1-px-Innenlinie), warme Schatten im Light Mode.
8. **Dark ist die Hauptbühne** (getönte Tiefe, kein reines OLED-Schwarz außer als Basis `#0C0F0D`), Light ist das „Papier-Tagebuch“.

---

## 1. Visuelle Leitidee und Stimmung

### 1.1 Idee: „Nachtschicht im Fjord“

møni (das ø!) ist nordisch-skandinavisch gelesen: ruhig, klar, ein bisschen rau, nie klinisch. Das Gefühl: _Du kommst abends müde-zufrieden vom Training in eine warme Küche. Draußen Nacht und Wald, drinnen Licht._ Das App-Design zeigt dieses Licht: sehr dunkle, grün getönte Tiefe, in der **eine** Farbe (Lime) wie eine Leuchtreklame / ein Kaminfunke aufleuchtet, wenn etwas Wichtiges passiert (Ring füllt sich, Ziel erreicht, Streak).

Das Gegenteil zur heutigen App: Heute ist alles gleich laut (grau, grau, mint). Künftig gilt **ein Hero pro Screen, ein leuchtender Moment pro Hero, alles andere ruhig und warm**.

### 1.2 Moodboard in Worten – drei Referenzwelten

| Welt                                                                                             | Was wir davon nehmen                                                                     | Konkret im UI                                                                    |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **A. Nordische Nacht / Waldhütte** (Dunkelgrün, Birkenrinde, Kerzenlicht, Kaminglut)             | Getönte Dunkelheit statt Schwarz, warmes Weiß für Text, Glut-Orange als Wärmepunkt       | Surfaces `#0C0F0D` → `#272F2A`, Text `#F5F2EA`, Bonus-Glut `#FF8A3D`             |
| **B. Sport-Hardware & Telemetrie** (Garmin/Whoop-Nachtmodus, Rennstrecken-Timing, Leuchtziffern) | Große Zahlen als Held, Neon-Leuchtfarbe auf Dunkel, tabellarische Präzision, dicke Ringe | Numeric-Hero 64 pt Bricolage ExtraBold, Lime-Ring mit Glow, tabular-nums überall |
| **C. Papier & Küchenzettel** (Notizbuch, Risograph-Druck, Brotpapier, Einkaufszettel)            | Warmes Cremeweiß, leicht gesättigte Pastell-Tints, haptische Ruhe, Handwerk              | Light Mode Papier `#F5F1E8`, Soft-Tints (12 % Farbe auf Weiß), warme Schatten    |

### 1.3 Was møni NICHT aussieht

- **Kein Standard-iOS-Look** (blaue Links, graue Gruppentabellen, `systemMint`).
- **Kein „Wellness-Spa“**: kein Pastell-Verlauf-Brei, keine Glasmorphismus-Fakes, keine Blattsymbole.
- **Kein „Gym-Bro“**: kein Schwarz-Rot-Aggro, keine Flammen, keine Kantigkeit, keine Verbotsschilder bei Überschreitung.
- **Kein Diät-Klinik-Look**: kein steriles Weiß/Türkis, keine Waage-Ikonografie, keine roten Warnungen als Standardreaktion auf „zu viel gegessen“ (Over-Limit ist ein ruhiges Korall-Rot, nie Alarm).
- **Keine Regenbogen-Dashboards**: Farbe bedeutet immer etwas (Lime = Fortschritt/Aktion, Glut = Training/Bonus, Violett/Honig/Cyan = Makros, Rot = nur Überschreitung/Löschen).

### 1.4 Tonalität der Farbe (Regeln)

1. **Pro Screen maximal eine Leuchtfläche** (Lime-gefüllt) – Primär-Button _oder_ Ring. Nicht beides prominent.
2. Lime ist **nie Text auf hellem Grund**. In Light Mode ist Text-Akzent immer Forest.
3. Glutorange (Ember) taucht **nur** bei Training/Workout-Bonus/Energie auf.
4. Makrofarben tauchen **nur** bei Makros auf (nie als Deko, nie für Buttons).
5. Rot nur für Over-Limit, Fehler, destruktive Aktion.

---

## 2. Farbsystem

### 2.1 Primär: Lime / Forest (Zwei-Gesichter-Prinzip)

| Rolle                                                         | Dark                     | Light                    | Warum                                                                                                                                                                                       |
| ------------------------------------------------------------- | ------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **accent** (Fläche, Button, Tint, Ring-Basis auf Normalgrund) | `#C6F135` Lime           | `#1D6B47` Forest         | Lime auf Dunkel: 14,7:1 (extrem lebendig, unverwechselbar, in der Fitness-App-Welt nicht abgenutzt wie Mint/Blau/Orange). Lime auf Papier: nur 1,16:1, also unbrauchbar → Forest hat 5,7:1. |
| **onAccent** (Text/Icon auf accent-Fläche)                    | `#0C0F0D` (Tinte) 14,7:1 | `#F5F1E8` (Papier) 5,7:1 | Dark: Tinte auf Lime wirkt wie ein Leuchtschild.                                                                                                                                            |
| **accentSoft** (Chip-/Badge-Hintergrund)                      | `#313C1C`                | `#E4EBE3`                | 12–16 % Akzent über Surface.                                                                                                                                                                |
| **lime** (fix, mode-unabhängig)                               | `#C6F135`                | `#C6F135`                | Nur auf dunklen Flächen (Hero, Splash, Icon). Skia-tauglich.                                                                                                                                |
| **forest** (fix, Hero-Basis)                                  | `#183F31`                | `#14352A`                | Anker-Farbe der Marke.                                                                                                                                                                      |

Lime-Rampe (für Gradienten/Glow, nicht als Tokens im UI nötig):
`#E9FF9E` (Highlight) · `#D4F55A` (Ring-Kopf) · **`#C6F135`** (Primär) · `#9BE564` (Ring-Anfang, grünstichig) · `#5EE6A0` (Glow-Ende, minzig, nur in Gradient).

Forest-Rampe:
`#2A6B50` (Rand-Highlight) · `#1D4F3B` (Hero oben) · `#183F31` · `#14352A` · `#0F2A20` (Hero unten) · `#0C0F0D` (Basis).

### 2.2 Sekundär und Tertiär

| Rolle                               | Dark                  | Light     | Verwendung                                                                                                                                   |
| ----------------------------------- | --------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **ember** (Workout, Bonus, Energie) | `#FF8A3D`             | `#C2410C` | Bonus-Segment im Ring, Training-Hero, Trainings-Chips, Streak-Flamme-Ersatz (kein Flammen-Icon). Light ist abgedunkelt für 4,6:1 auf Papier. |
| **emberSoft**                       | `#3A2C1D`             | `#F8E6DC` | Chips, Kartentönung Training                                                                                                                 |
| **ember Verlauf** (fix)             | `#FF8A3D` → `#FF5C3A` | gleich    | Training-Hero-Karte, aktiver Workout-Timer                                                                                                   |

Es gibt bewusst **keine dritte Marken-Farbe** (Kein Blau). Die Makrofarben sind Datenfarben, keine Markenfarben.

### 2.3 Makrofarben (eigenständig, harmonisch, farbenblind-tauglich)

| Makro             | Dark (auf Surface 0–3 und Hero) | Light (auf Papier/Weiß) | Soft Dark | Soft Light | Kürzel/Form                      |
| ----------------- | ------------------------------- | ----------------------- | --------- | ---------- | -------------------------------- |
| **Protein**       | `#A18BFF` Violett               | `#6A4FE0`               | `#2B2C3C` | `#EDE8F5`  | **P**, Punkt ●                   |
| **Kohlenhydrate** | `#FFCB3D` Honig                 | `#B87A00`               | `#3A361D` | `#F6EDDA`  | **K** (de) / **C** (en), Raute ◆ |
| **Fett**          | `#4CCBF2` Cyan                  | `#0B7FA8`               | `#1E363A` | `#E2EEEE`  | **F**, Quadrat ■                 |

Warum diese drei:

- **Hue-Abstand 90–120°** (Violett 255°, Honig 45°, Cyan 195°): klar getrennt, keine Ampel (kein Rot/Grün), kollidiert nicht mit Lime (75°) oder Ember (25°). Honig (45°) vs. Ember (25°) trennt zusätzlich der Kontext (Balken vs. Ring) und die Luminanz (Honig `#FFCB3D` L≈0,64 vs. Ember `#FF8A3D` L≈0,42).
- **Luminanz gestaffelt** (Dark: Violett 0,32 · Cyan 0,50 · Honig 0,64): bei Protanopie/Deuteranopie bleiben Violett (wirkt blau-dunkel), Cyan (hellblau-grau), Honig (gelb-hell) über Helligkeit _und_ Gelb-Blau-Achse unterscheidbar; die Gelb-Blau-Achse bleibt bei Rot-Grün-Schwäche intakt.
- **Redundante Codierung** (Pflicht, nicht optional): immer Buchstabe oder Form-Marker neben der Farbe (Legende „● P 142 g“). Makro-Balken tragen den Buchstaben in einem 20-pt-Badge links. Segmentierte Makro-Leiste trennt Segmente mit 2-pt-Lücken (nie ineinanderlaufende Farben).
- Kontrast jeweils ≥ 3:1 als Grafik auf Surface 0–3 (siehe 2.7). Text daneben ist immer `label`, nie in Makrofarbe (Light-Honig `#B87A00` hat nur 3,2:1 → nur als Fläche/Linie).

### 2.4 Semantik: Danger / Warn / Success

| Rolle                                         | Dark      | Light     | Notiz                                                                                                                                                       |
| --------------------------------------------- | --------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **danger** (Over-Limit-Ring, Fehler, Löschen) | `#FF5C66` | `#C62F3A` | Warmes Korallrot, 6,4:1 / 4,8:1. Bewusst rosiger als Ember (Hue 355° vs 25°), damit Bonus und Überschreitung nicht verwechselt werden. Immer mit Icon/Text. |
| **warning**                                   | `#FFB020` | `#9A6700` | Nur für „Offline/Sync-Problem/Limit fast erreicht“. 10,5:1 / 4,3:1 (Light nur für große Texte/Icons mit Label daneben).                                     |
| **success**                                   | `#6EE08A` | `#2F7D3A` | Abgeschlossen, Sync ok. Grünstichiger als Lime (Hue 135° vs 75°), damit „fertig“ nicht wie „Marken-Akzent“ aussieht.                                        |

### 2.5 Neutrale Palette (warm statt kalt)

Entscheidung: **warm**. Die Grautöne haben einen leichten Gelb-/Grünstich (Papier / Waldschatten). Warum: Kalte Systemgrautöne sind der Haupt-Grund für „generisch iOS“; warme Neutrale tragen die Marke in jede Fläche, ohne dass eine Farbe sichtbar „gesetzt“ werden muss.

**Surfaces (Hintergrund-Tiefen)**

| Stufe  | Name            | Dark      | Light     | Einsatz                                                   |
| ------ | --------------- | --------- | --------- | --------------------------------------------------------- |
| **S0** | `bg`            | `#0C0F0D` | `#F5F1E8` | Screen-Hintergrund                                        |
| **S1** | `surface`       | `#151A17` | `#FFFDF8` | Karten, Listen-Gruppen                                    |
| **S2** | `surfaceRaised` | `#1D2420` | `#ECE7DA` | Karte in Karte, Input-Felder, Segment-Track, Chip inaktiv |
| **S3** | `surfaceHigh`   | `#272F2A` | `#E1DBCB` | gedrückt/aktiv, Tooltips, Popover, Sheet-Griff-Bereich    |

Hinweis Light: Karten sind **heller** als der Hintergrund (S1 > S0), wie Papierblätter auf dem Tisch; S2/S3 werden dunkler. Dark: höher = heller (klassische Elevation).

**Text**

| Token            | Dark      | Light     | Kontrast auf S0 (D / L) | Zweck                                                                             |
| ---------------- | --------- | --------- | ----------------------- | --------------------------------------------------------------------------------- |
| `label`          | `#F5F2EA` | `#1B1A16` | 17,2 / 15,5             | Haupttext, Zahlen                                                                 |
| `labelSecondary` | `#A8A69B` | `#5B574D` | 7,9 / 6,4               | Beschreibungen, Einheiten                                                         |
| `labelTertiary`  | `#82857B` | `#6F6A5E` | 5,1 / 4,8               | Placeholder, Metadaten (noch AA, auf S2 aber nur 4,2/4,4 → dort `labelSecondary`) |

**Linien**: `separator` Dark `#2A302C` / Light `#E2DDD0` (hairline 1 px = `StyleSheet.hairlineWidth`); `border` (Karten-Innenlinie) Dark `rgba(245,242,234,0.08)` / Light `rgba(27,26,22,0.06)`.

**Hero-Textfarben (fix, immer auf dunklem Hero)**: `heroLabel #F5F2EA`, `heroLabelSecondary #A9C7B8` (7,1:1 auf `#14382B`, leicht grünstichig), `heroTrack rgba(245,242,234,0.12)`.

### 2.6 Gradienten

Winkel in CSS-Konvention (0° = nach oben, 90° = nach rechts, 180° = nach unten). Umsetzung mit `expo-linear-gradient` (`start`/`end`-Punkte) oder Skia `LinearGradient`.

| Name                             | Start → Ende                                                  | Winkel                                  | Einsatz                                                                                 |
| -------------------------------- | ------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------- |
| **heroForest**                   | `#1D4F3B` → `#0F2A20`                                         | 160° (oben links → unten rechts)        | Today-Hero-Karte, Onboarding-Result, Insights-Hero (beide Modi)                         |
| **heroGlow**                     | Radial `rgba(198,241,53,0.20)` → `rgba(198,241,53,0)`         | Zentrum Ring, Radius 0,9 × Kartenbreite | Hintergrundleuchten hinter dem Ring (sehr subtil)                                       |
| **ringLime**                     | Sweep: `#9BE564` (0 %) → `#D4F55A` (85 %) → `#E9FF9E` (100 %) | Sweep ab 12 Uhr                         | Ring-Fortschritt; der Kopf ist am hellsten                                              |
| **ringEmber**                    | Sweep: `#FF8A3D` → `#FFB066`                                  | Sweep                                   | Bonus-Segment                                                                           |
| **emberHero**                    | `#FF8A3D` → `#FF5C3A`                                         | 135°                                    | Training-Hero „Workout starten“, laufender Workout-Banner                               |
| **nightWash** (Bg-Verlauf Dark)  | `#101713` → `#0C0F0D`                                         | 180°                                    | Screen-Hintergrund oben (nur obere 320 pt, sonst flach S0)                              |
| **paperWash** (Bg-Verlauf Light) | `#FBF8F0` → `#F5F1E8`                                         | 180°                                    | dito                                                                                    |
| **limeButtonSheen**              | `#D4F55A` → `#C6F135`                                         | 180°                                    | optional, Primärbutton-Füllung, sehr subtil (nur wenn Glass-Tint das nicht übersteuert) |

Gradient-Regeln: nie mehr als **zwei** Gradient-Flächen pro Screen sichtbar; nie Gradient auf Text; keine Regenbogen-Verläufe; Lime-Verläufe bleiben im Bereich Hue 75°–150°.

**Tageszeit-Stimmung (optional, Phase 2)**: ein 280 pt hoher Farbschleier hinter dem Header, 3 Zustände. Dark: Morgen (05–11) `rgba(255,203,61,0.10)` → transparent; Tag (11–17) keiner; Abend (17–05) `rgba(161,139,255,0.10)` → transparent. Light: Morgen `#FBEFD0`, Abend `#EDE9F7`. Sehr dezent, Reduce-Motion-neutral (kein Animationsbedarf, Wechsel ohne Blend beim Tabwechsel).

### 2.7 Kontrastprüfung (WCAG 2.x, berechnet)

Text ≥ 4,5:1 (AA normal), große Schrift ≥ 18 pt bzw. 14 pt bold ≥ 3:1, Grafik ≥ 3:1.

| Paar                                                                                 | Kontrast                    | Urteil                                                                 |
| ------------------------------------------------------------------------------------ | --------------------------- | ---------------------------------------------------------------------- |
| Light `label` `#1B1A16` auf S0 `#F5F1E8` / S1 / S2 / S3                              | 15,5 / 17,1 / 14,1 / 12,6   | AAA                                                                    |
| Light `labelSecondary` `#5B574D` auf S0 / S1 / S2 / S3                               | 6,4 / 7,1 / 5,8 / 5,2       | AA                                                                     |
| Light `labelTertiary` `#6F6A5E` auf S0 / S2                                          | 4,8 / 4,4                   | AA auf S0, auf S2 nur für große Schrift                                |
| Light `accent` Forest `#1D6B47` auf S0 / S1 / S2 / S3 (Text)                         | 5,7 / 6,4 / 5,2 / 4,7       | AA                                                                     |
| Light `onAccent` `#F5F1E8` auf Forest                                                | 5,7                         | AA                                                                     |
| Light `ember` `#C2410C` auf S0 / S1 / S2                                             | 4,6 / 5,1 / 4,2             | AA S0/S1, auf S2 nur Grafik/Large                                      |
| Light `danger` `#C62F3A` auf S0 / S1                                                 | 4,8 / 5,3                   | AA                                                                     |
| Light `success` `#2F7D3A` / `warning` `#9A6700` auf S0                               | 4,5 / 4,3                   | success AA, warning nur Large/Icon mit Label                           |
| Light Makros als Grafik: Violett `#6A4FE0` / Honig `#B87A00` / Cyan `#0B7FA8` auf S0 | 4,9 / 3,2 / 4,0             | ≥ 3:1 (Grafik OK); Text daneben `label`                                |
| Dark `label` `#F5F2EA` auf S0 / S1 / S2 / S3                                         | 17,2 / 15,8 / 14,2 / 12,3   | AAA                                                                    |
| Dark `labelSecondary` `#A8A69B` auf S0 / S1 / S2 / S3                                | 7,9 / 7,2 / 6,5 / 5,6       | AA                                                                     |
| Dark `labelTertiary` `#82857B` auf S0 / S2                                           | 5,1 / 4,2                   | AA auf S0, auf S2 nur Large                                            |
| Dark `accent` Lime `#C6F135` auf S0 / S1 / S2 / S3                                   | 14,7 / 13,5 / 12,1 / 10,5   | AAA                                                                    |
| Dark `onAccent` `#0C0F0D` auf Lime                                                   | 14,7                        | AAA                                                                    |
| Dark Ember `#FF8A3D` auf S0 / S3                                                     | 8,2 / 5,9                   | AA                                                                     |
| Dark Danger `#FF5C66` auf S0 / S3                                                    | 6,4 / 4,6                   | AA                                                                     |
| Dark Makros Violett `#A18BFF` / Honig `#FFCB3D` / Cyan `#4CCBF2` auf S0              | 7,0 / 12,7 / 10,2           | AAA                                                                    |
| Dark Makros auf S3 `#272F2A`                                                         | 5,0 / 9,1 / 7,3             | AA                                                                     |
| Hero: `heroLabel` auf `#1B4A38`                                                      | 9,0                         | AAA                                                                    |
| Hero: `heroLabelSecondary` `#A9C7B8` auf `#14382B` / `#0F2A20`                       | 7,1 / 8,4                   | AA                                                                     |
| Hero: Lime auf `#1B4A38`                                                             | 7,7                         | AAA                                                                    |
| Hero: Violett / Honig / Cyan / Ember / Danger auf `#14352A`                          | 4,9 / 8,8 / 7,1 / 5,7 / 4,4 | Grafik OK; Danger-Text auf Hero → Zahl in `heroLabel`, Rot nur am Ring |

Verbindliche Regel: **Nie Makrofarbe oder Ember/Danger als Fließtext in Light**, immer `label` mit farbigem Marker daneben.

### 2.8 Bezug zu iOS-Semantics – was bleibt PlatformColor, was wird eigener Hex

| Bereich                                                                                                                 | Entscheidung                                                                                                                                                                                                 | Warum                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Surfaces, Labels, Separator, Brand, Makros                                                                              | **Eigene Farben, aber als benannte Asset-Catalog-Colorsets** (`MoniBg`, `MoniSurface1`, `MoniLabel`, `MoniAccent` …), in RN via `PlatformColor('MoniSurface1')` / NativeWind `platformColor('MoniSurface1')` | Dynamisch Light/Dark ohne JS-Re-Render, native Controls (SwiftUI via @expo/ui, UIKit-Alerts, NativeTabs) sehen dieselben Werte. Erfüllt Hard Rule „Farben nur über theme.config.js“. |
| `AccentColor` (App-weiter Tint)                                                                                         | Bleibt das bestehende `withAccentColor`-Plugin: Light `#1D6B47`, Dark `#C6F135`                                                                                                                              | Slider/Toggle/Stepper/Tab-Tint folgen automatisch.                                                                                                                                   |
| Native Systemelemente ohne Eigenfarbe (Statusbar, Alert-Text, Tastatur, Share-Sheet, Systemlabels in `@expo/ui`-Picker) | Bleiben System                                                                                                                                                                                               | Nicht überschreiben; Abweichung (kalt vs. warm) ist dort unkritisch.                                                                                                                 |
| `systemRed` für Swipe-to-Delete-Hintergrund                                                                             | Wird `danger` (`MoniDanger`)                                                                                                                                                                                 | Einheitlich.                                                                                                                                                                         |
| **Skia (Ring, Charts)**                                                                                                 | Nur Hex via `useThemeHex()`; Hero-Charts nutzen feste `hero*`-Hexwerte                                                                                                                                       | CLAUDE.md-Regel: Skia nimmt kein PlatformColor.                                                                                                                                      |
| Liquid Glass (GlassView / @expo/ui Button `glass*`)                                                                     | `tintColor` = accent (Lime bzw. Forest). Hintergrund dahinter muss kontrastreich bleiben                                                                                                                     | Nicht faken.                                                                                                                                                                         |

### 2.9 Fertiges Update-Proposal für `theme.config.js`

Abwärtskompatibel: die drei bestehenden Keys (`accent`, `bonus`, `danger`) bleiben (Typ `ThemeColorName` in `colors.ts` wächst nur). `platform` bleibt als **Fallback** (Jest, alte Builds); neu `asset` = Colorset-Name. `bonus` bleibt als Alias für `ember`.

```js
/**
 * møni brand tokens – single source of truth (v2 "Nachtschicht im Fjord").
 * asset    = Asset-Catalog colorset name (generated by plugins/withBrandColors.js),
 *            used via PlatformColor(asset) → dynamic light/dark, also for native controls.
 * platform = iOS semantic fallback (tests / builds without the colorsets).
 * light/dark = hex for Skia & the colorset generator.
 */
const c = (asset, platform, light, dark) => ({ asset, platform, light, dark });

module.exports = {
  // --- Brand ---
  accent: c('MoniAccent', 'systemGreen', '#1D6B47', '#C6F135'),
  onAccent: c('MoniOnAccent', 'systemBackground', '#F5F1E8', '#0C0F0D'),
  accentSoft: c(
    'MoniAccentSoft',
    'secondarySystemBackground',
    '#E4EBE3',
    '#313C1C',
  ),
  bonus: c('MoniEmber', 'systemOrange', '#C2410C', '#FF8A3D'), // alias: ember
  bonusSoft: c(
    'MoniEmberSoft',
    'secondarySystemBackground',
    '#F8E6DC',
    '#3A2C1D',
  ),
  danger: c('MoniDanger', 'systemRed', '#C62F3A', '#FF5C66'),
  dangerSoft: c(
    'MoniDangerSoft',
    'secondarySystemBackground',
    '#F8E4E1',
    '#3A2524',
  ),
  warning: c('MoniWarning', 'systemYellow', '#9A6700', '#FFB020'),
  success: c('MoniSuccess', 'systemGreen', '#2F7D3A', '#6EE08A'),

  // --- Macros (+ soft tints) ---
  protein: c('MoniProtein', 'systemPurple', '#6A4FE0', '#A18BFF'),
  proteinSoft: c(
    'MoniProteinSoft',
    'secondarySystemBackground',
    '#EDE8F5',
    '#2B2C3C',
  ),
  carbs: c('MoniCarbs', 'systemYellow', '#B87A00', '#FFCB3D'),
  carbsSoft: c(
    'MoniCarbsSoft',
    'secondarySystemBackground',
    '#F6EDDA',
    '#3A361D',
  ),
  fat: c('MoniFat', 'systemCyan', '#0B7FA8', '#4CCBF2'),
  fatSoft: c('MoniFatSoft', 'secondarySystemBackground', '#E2EEEE', '#1E363A'),

  // --- Surfaces (S0..S3) ---
  bg: c('MoniBg', 'systemBackground', '#F5F1E8', '#0C0F0D'),
  surface: c('MoniSurface1', 'secondarySystemBackground', '#FFFDF8', '#151A17'),
  surfaceRaised: c(
    'MoniSurface2',
    'tertiarySystemBackground',
    '#ECE7DA',
    '#1D2420',
  ),
  surfaceHigh: c('MoniSurface3', 'quaternarySystemFill', '#E1DBCB', '#272F2A'),
  separator: c('MoniSeparator', 'separator', '#E2DDD0', '#2A302C'),

  // --- Text ---
  label: c('MoniLabel', 'label', '#1B1A16', '#F5F2EA'),
  labelSecondary: c(
    'MoniLabelSecondary',
    'secondaryLabel',
    '#5B574D',
    '#A8A69B',
  ),
  labelTertiary: c('MoniLabelTertiary', 'tertiaryLabel', '#6F6A5E', '#82857B'),

  // --- Fixed (mode-independent) colors for the always-dark hero block & Skia ---
  fixed: {
    lime: '#C6F135',
    limeHead: '#E9FF9E',
    limeStart: '#9BE564',
    limeMid: '#D4F55A',
    limeGlow: '#5EE6A0',
    forestTop: '#1D4F3B',
    forestBot: '#0F2A20',
    ink: '#0C0F0D',
    heroLabel: '#F5F2EA',
    heroLabel2: '#A9C7B8',
    heroTrack: 'rgba(245,242,234,0.12)',
    ember: '#FF8A3D',
    emberHead: '#FFB066',
    emberHot: '#FF5C3A',
    protein: '#A18BFF',
    carbs: '#FFCB3D',
    fat: '#4CCBF2',
    danger: '#FF5C66',
  },
};
```

**Neue Tailwind-Token-Namen** (`tailwind.config.js`, alle über `platformColor(brand.X.asset)`; die alten Namen bleiben als Aliase, damit nichts bricht):

| Tailwind-Token                                 | Klassen-Beispiele                      | Mapping                                                                                                                                          |
| ---------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bg`                                           | `bg-bg`                                | `bg` (S0) – Alias `system-background` bleibt und zeigt künftig auf dasselbe                                                                      |
| `surface` / `surface-raised` / `surface-high`  | `bg-surface`, `bg-surface-raised`      | S1 / S2 / S3 – Aliase `secondary-system-background` → surface, `secondary-system-grouped-background` → surface, `system-grouped-background` → bg |
| `label` / `label-secondary` / `label-tertiary` | `text-label`, `text-label-secondary`   | Aliase `secondary-label`, `tertiary-label` bleiben                                                                                               |
| `line`                                         | `bg-line`, `border-line`               | separator (Alias `separator`)                                                                                                                    |
| `tint` (bleibt) / `on-tint` / `tint-soft`      | `bg-tint text-on-tint`, `bg-tint-soft` | accent / onAccent / accentSoft                                                                                                                   |
| `bonus` (bleibt) / `bonus-soft`                | `text-bonus`, `bg-bonus-soft`          | ember                                                                                                                                            |
| `destructive` (bleibt) / `destructive-soft`    |                                        | danger                                                                                                                                           |
| `warning`, `success`                           |                                        |                                                                                                                                                  |
| `protein`, `carbs`, `fat` (+ `-soft`)          | `bg-protein`, `bg-carbs-soft`          | Makros                                                                                                                                           |
| `hero-label`, `hero-label-2` (fix)             | `text-hero-label`                      | feste Hexwerte (kein PlatformColor nötig)                                                                                                        |

`src/theme/colors.ts`: `ThemeColorName = Exclude<keyof typeof theme, 'fixed'>`, `themeColor(name)` → `PlatformColor(theme[name].asset)`, `useThemeHex(name)` unverändert, neu `export const fixedColors = theme.fixed`.

---

## 3. Typografie

### 3.1 Schriftwahl

| Rolle                                                                   | Schrift                 | Paket (geprüft per `npm view`)                 | Weights                        |
| ----------------------------------------------------------------------- | ----------------------- | ---------------------------------------------- | ------------------------------ |
| **Display** (Zahlen, Titel, Hero, Onboarding-Headlines, Wortmarke-Nähe) | **Bricolage Grotesque** | `@expo-google-fonts/bricolage-grotesque@0.4.1` | 600, 700, 800 (+ optional 500) |
| **Text/UI** (Body, Listen, Buttons, Captions, Tab-Labels, Inputs)       | **SF Pro (System)**     | – (kein Paket)                                 | 400–700 über `fontWeight`      |

Warum:

- **Bricolage Grotesque** hat Charakter (leicht ausgestellte Kontraktion, „handgemachte“ Terminals, breite Fette), wirkt eigenständig und warm – passt zu „nordisches Handwerk trifft Telemetrie“ – ist aber ein sauberer Grotesk mit **tabular figures (`tnum`) und `lnum`** (per Font-Datei geprüft). Das ø/Ø, ä/ö/ü/ß, €, ·, – und → sind in den ttf-Dateien enthalten (per fontTools geprüft, keine fehlenden Glyphen). Als Variable-Font-Familie (statische Schnitte im Paket) pro Gewicht eine Datei: kleine Last (~3 × 100 KB).
- **SF Pro bleibt für UI**: Dynamic Type, korrekte Zahlen-/Datumsformate, Lesbarkeit bei 13–17 pt, native Controls (Picker, DatePicker, Alerts, NativeTabs) sehen ohnehin SF. Zwei Display-/Text-Welten prallen so nicht aufeinander, sondern **Display = Marke, Text = Plattform**. Spart außerdem eine zweite Webfont-Familie (Ladezeit, Glyph-Abdeckung für Zahlen in Systemformat).
- Alternative (nicht gewählt): Manrope für Text. Wäre eigenständiger, kostet aber Dynamic-Type-Nativität und Konsistenz zu SwiftUI-Controls. Falls UX später mehr Eigenständigkeit im Fließtext will, ist `@expo/google-fonts/manrope@0.4.2` (400/500/600/700) der Plan B.

### 3.2 Laden (expo-font)

Empfohlen: **Config-Plugin** (Fonts werden in die Binary eingebettet, kein Flash, kein Splash-Warten):

```ts
// app.config.ts → plugins
[
  'expo-font',
  {
    fonts: [
      './node_modules/@expo-google-fonts/bricolage-grotesque/600SemiBold/BricolageGrotesque_600SemiBold.ttf',
      './node_modules/@expo-google-fonts/bricolage-grotesque/700Bold/BricolageGrotesque_700Bold.ttf',
      './node_modules/@expo-google-fonts/bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf',
    ],
  },
],
```

Dann ist der `fontFamily`-Name der Dateiname ohne Endung (**nach erstem Build im Simulator verifizieren**, iOS nutzt den PostScript-Namen aus der Datei; bei Abweichung `fontFamily` anpassen). Fallback ohne Plugin (JS-Laden, Splash bleibt bis `loaded`):

```ts
import { useFonts } from 'expo-font';
import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';

const [loaded] = useFonts({
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
});
```

Installation: `npx expo install @expo-google-fonts/bricolage-grotesque expo-font` (expo-font ist bereits `~57.0.4`).

Tailwind (`fontFamily`, damit `font-display-bold` etc. funktioniert; **bei Custom-Fonts nie zusätzlich `font-bold` setzen**, iOS würde synthetisch fetten):

```js
fontFamily: {
  'display':        ['BricolageGrotesque_600SemiBold'],
  'display-bold':   ['BricolageGrotesque_700Bold'],
  'display-black':  ['BricolageGrotesque_800ExtraBold'],
},
```

**Fallback bei Ladefehler**: Display fällt automatisch auf System (`System`, `font-weight: 700`) zurück. Layout darf nie von Bricolage-Metriken abhängen: Zahlen-Container haben `minWidth` und `adjustsFontSizeToFit`.

### 3.3 Typografie-Skala

Alle Größen in pt (iOS). `lh` = Zeilenhöhe in pt, `ls` = letterSpacing in pt (RN rechnet px = pt). Display-Stile nutzen Bricolage (D), alle anderen SF Pro (S).

| Stil                         | Schrift | Größe / lh | Gewicht          | ls   | Case      | Verwendung                                                              |
| ---------------------------- | ------- | ---------- | ---------------- | ---- | --------- | ----------------------------------------------------------------------- |
| **Numeric-Hero**             | D 800   | 64 / 60    | ExtraBold        | −1,5 | –         | Kcal übrig im Ring (tabular)                                            |
| **Numeric-L**                | D 700   | 40 / 40    | Bold             | −0,8 | –         | Gewicht im Header, Result-Zahl im Onboarding (Onboarding-Result: 72/68) |
| **Numeric-M**                | D 700   | 24 / 28    | Bold             | −0,3 | –         | Kennzahlen in Karten (kcal gegessen, Satz-Gewicht)                      |
| **Numeric-S**                | D 600   | 17 / 22    | SemiBold         | 0    | –         | Zahl in Listenzeile (kcal rechts)                                       |
| **Display**                  | D 800   | 34 / 36    | ExtraBold        | −0,8 | Sentence  | Onboarding-Fragen, Screen-Hero-Titel                                    |
| **Title**                    | D 700   | 26 / 30    | Bold             | −0,4 | Sentence  | Sektionstitel groß („Übersicht“), Sheet-Titel                           |
| **Headline**                 | S       | 17 / 22    | Semibold (600)   | −0,2 | –         | Zeilentitel, Kartentitel                                                |
| **Body**                     | S       | 17 / 24    | Regular (400)    | −0,2 | –         | Fließtext                                                               |
| **Callout**                  | S       | 15 / 20    | Regular / Medium | −0,1 | –         | Sekundärtext, Beschreibungen                                            |
| **Caption**                  | S       | 13 / 17    | Medium (500)     | 0    | –         | Metadaten, Einheit hinter Zahl                                          |
| **Overline** (SectionHeader) | S       | 12 / 16    | Semibold         | +0,8 | UPPERCASE | Sektionslabel über Karten                                               |
| **Button**                   | S       | 17 / 22    | Semibold         | −0,2 | –         | Alle Buttons                                                            |
| **Tab-Label**                | System  | 10         | –                | –    | –         | nativ (NativeTabs), nicht anfassen                                      |

Hinweis: Bricolage hat ordentlich Zeichenbreite; -1,5 ls bei 64 pt entspricht ≈ −0,023 em und hält vierstellige Zahlen kompakt.

### 3.4 Tabular-Zahlen-Regeln

1. **Jede Zahl, die sich ändert oder in einer Spalte steht** (kcal, g, kg, Reps, Zeit, Datum-Tag): `style={{ fontVariant: ['tabular-nums'] }}` (RN) – für Bricolage-Stile fest im `Text`-Wrapper eingebaut, damit nie vergessen wird.
2. **Einheit ist immer kleiner und sekundär**: „2 140“ in Numeric-M + „kcal“ in Caption `labelSecondary`, Grundlinie bündig (`flex-row items-baseline gap-1`). Kein Leerzeichen-Tausender: schmales Leerzeichen/Locale via `Intl.NumberFormat`, nie Handformatierung.
3. **Dezimalstellen**: Gewicht 1 Nachkommastelle (`81,4 kg`), kcal 0, Gramm 0, Makros 0 (Zielwerte), Pace 1.
4. **Count-up-Animationen** (Onboarding, Ring-Zahl) laufen mit tabular-nums, damit die Breite nicht flackert.
5. **Vorzeichen**: Minus-Zeichen echtes „−“ (U+2212) bei Differenzen, Plus „+“ bei Bonus (`+320 kcal`).

### 3.5 Dynamic Type und Skalierung

- Text/UI (SF Pro): `allowFontScaling` an (Default), `maxFontSizeMultiplier={1.4}` global, damit Cards nicht brechen.
- Display-Zahlen (Numeric-Hero/-L): `maxFontSizeMultiplier={1.15}` + `adjustsFontSizeToFit` + `numberOfLines={1}` (Ring-Zentrum hat festen Platz). Sekundärtexte im Ring skalieren bis 1,3.
- Bricolage-Titel (Display/Title): bis 1,3, Umbruch erlaubt (max. 3 Zeilen), sonst `adjustsFontSizeToFit` mit `minimumFontScale={0.8}`.
- Ab Accessibility-Größen (Multiplier ≥ 1,6, per `PixelRatio.getFontScale()`): Zeilenlayouts (Label links / Wert rechts) stapeln vertikal; Ring bleibt 264 pt, Zahlen im Zentrum werden nicht größer als 56 pt.

---

## 4. Formsprache

### 4.1 Radius-System (alle mit `borderCurve: 'continuous'`)

| Element                                                      | Radius                  | Notiz                                 |
| ------------------------------------------------------------ | ----------------------- | ------------------------------------- |
| Hero-Karte                                                   | **32**                  | größter Radius der App, signaturstark |
| Karte (Standard), Banner                                     | **24**                  | ersetzt `rounded-2xl` (16)            |
| Innenkarte / Input / Segment-Track / Bild-Thumbnail          | **16**                  | „Radius der Karte − Padding/2“ Regel  |
| Kleine Elemente (Badge-Rechteck, Tooltip, Chart-Balken oben) | **8** (Balken: **6**)   |                                       |
| Chips, Pills, Buttons, Toggles                               | **voll (999)**          | Kapselform wie Liquid-Glass-Buttons   |
| Sheets                                                       | System (formSheet, ~38) | nicht überschreiben                   |

### 4.2 Strichstärken

- Ring: **22 pt** (Standard 264 pt Durchmesser), Mini-Ring 6 pt bei 44 pt Durchmesser; Makro-Ringe (optional) 10 pt bei 72 pt.
- Linien-Charts: **3 pt** Linie, runde Caps, Punkt-Marker 8 pt mit 2-pt Rand in Surface-Farbe.
- Hairline: `StyleSheet.hairlineWidth` für Separatoren; Karten-Innenlinie **1 pt** (`border`, 8 % Weiß/6 % Tinte).
- Fokus-/Auswahl-Rahmen (Option-Cards, Onboarding): **2 pt** `accent`.
- Fortschrittsbalken: Höhe **10 pt** (Makros), **4 pt** (Onboarding-Progress, dünn).

### 4.3 Schatten und Elevation

- **Dark: keine Drop-Shadows.** Tiefe entsteht über Surface-Stufen (S0 → S1 → S2) + 1-pt-Innenlinie `rgba(245,242,234,0.08)`. Hero-Karte zusätzlich ein farbiger Außenschein: `shadowColor #C6F135, shadowOpacity 0.12, shadowRadius 32, offset (0, 12)` (nur Hero, nur wenn Ziel nicht überschritten).
- **Light: warme, weiche Schatten**, nie Schwarz: Karte `shadowColor #2B2416, opacity 0.06, radius 16, offset (0, 4)`; Raised/Popover `opacity 0.10, radius 28, offset (0, 12)`; Hero `shadowColor #0F2A20, opacity 0.28, radius 32, offset (0, 16)`.
- Elevation-Namen: `flat` (nur Fläche), `raised` (Karte), `hero`, `overlay` (Toast, Popover).
- Glass (Tab-Bar, GlassActionButton) bekommt **nie** zusätzliche Schatten von uns.

### 4.4 Spacing-Skala (4-pt-Grid)

`2 · 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56 · 72`

| Verwendung                                                       | Wert                                                       |
| ---------------------------------------------------------------- | ---------------------------------------------------------- |
| Screen-Gutter horizontal                                         | **20** (vorher 16)                                         |
| Karten-Innenpadding                                              | **20** (Hero 24, Listenzeilen 16 horizontal / 14 vertikal) |
| Abstand zwischen Karten                                          | **16**                                                     |
| Abstand zwischen Sektionen (Header → Karte 8, Sektion → Sektion) | **32**                                                     |
| Chip-Padding                                                     | 12 horizontal / 8 vertikal                                 |
| Tap-Target                                                       | min. **44 × 44**, Buttons 56 hoch                          |
| Unterer Scroll-Inset                                             | 120 (Tab-Bar + GlassActionButton)                          |

### 4.5 Icon-Stil (SF Symbols)

- **Gewicht `semibold`** (Karten/Listen), `bold` für kleine Icons ≤ 14 pt, `regular` nur in Tab-Bar (nativ).
- **Rendering**: `hierarchical` für Karten- und Listenicons (Farbe = Token, sekundäre Ebenen automatisch abgestuft), `monochrome` für Tabs/Buttons, `palette` nur auf Hero (Lime + heroLabel).
- **Farbregeln**: Standardicon `labelSecondary`; Aktion/aktiv `accent`; Training-Icons `bonus`; Makro-Marker nutzen Form + Makrofarbe; Icon auf `accent`-Fläche `onAccent`; kein Icon in Rot außer destruktiv.
- **Icon-Container** (Listenzeilen, Option-Cards): 40 × 40, Radius 12, Hintergrund `*Soft` der Bedeutung (z. B. `accentSoft`), Icon 20 pt semibold. Das ersetzt nackte Icons und gibt Listen Rhythmus.
- Bevorzugte Symbole: `fork.knife`, `flame` **nicht** (Gym-Bro), stattdessen `bolt.fill`, `figure.strengthtraining.traditional`, `scalemass`, `chart.line.uptrend.xyaxis`, `circle.dotted`. (Die finale Ikonografie liegt beim Mark-Designer, Rendering-Regeln gelten trotzdem.)

---

## 5. Komponenten-Redesign-Spezifikation

### 5.1 Card

Eine Komponente, `variant` Prop, Ersatz für `Card.tsx` (heute: `bg-secondary-system-background rounded-2xl p-4 gap-3`).

| Variante                   | Fläche                                                               | Radius / Padding | Rand / Schatten                                                                                  | Einsatz                                                                |
| -------------------------- | -------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| **flat**                   | S1 (`bg-surface`)                                                    | 24 / 20          | Dark: 1-pt Innenlinie `border`; Light: keine                                                     | Standardgruppen, Listen                                                |
| **raised**                 | S1                                                                   | 24 / 20          | Light: Schatten „Karte“ (4.3); Dark: Innenlinie + oberer Highlight 1 pt `rgba(255,255,255,0.05)` | Karten mit Interaktion, antippbare Karten                              |
| **hero**                   | Gradient heroForest (beide Modi) + optional heroGlow                 | 32 / 24          | Außenschein/Schatten Hero (4.3); Innenlinie `rgba(245,242,234,0.10)`                             | Pro Screen genau eine: Today-Ring, Insights-Gewicht, Onboarding-Result |
| **tinted**                 | `*Soft` einer Bedeutung (`accentSoft`, `bonusSoft`, `proteinSoft` …) | 24 / 20          | kein Rand                                                                                        | Hinweise, Streak, Training-Heute, KI-Vorschlag                         |
| **inset** (Karte in Karte) | S2                                                                   | 16 / 12          | kein Rand                                                                                        | Inputs, verschachtelte Statistiken                                     |

Press-State: Scale 0,98 + Wechsel auf S2 (flat/raised) bzw. Highlight-Overlay `rgba(255,255,255,0.06)` (hero). Titel in Karte = Headline, Gap Titel → Inhalt 12.

### 5.2 SectionHeader

- Overline-Stil: 12 / 16, Semibold, +0,8 ls, UPPERCASE, `labelSecondary`; links 4 pt Einzug.
- Optionaler rechter Slot: Text-Link („Alle“, Callout 15 Semibold `accent`, Pfeil `chevron.right` 11 pt bold).
- Optionaler Marker links: 6-pt-Punkt in Bedeutungsfarbe (nur Makro/Training-Sektionen).
- Abstand: 32 zur vorherigen Sektion, 8 zur Karte darunter.
- Für große Bereichstitel (z. B. „Übersicht“): **Title**-Stil (Bricolage 26) statt Overline, genau einer pro Screen.

### 5.3 Chips / Pills

- Höhe 36, Padding 14 horizontal, Radius voll, Caption/Callout 14 Semibold.
- **Inaktiv**: Fläche S2, Text `labelSecondary`, kein Rand. **Aktiv**: Fläche `accent`, Text `onAccent` (Filter) – oder `accentSoft` + Text `accent` (leise, für Tags/Kategorien).
- **Status-Pill** (klein, 24 hoch, 10 horizontal, Caption 12 Semibold): `*Soft`-Fläche + Textfarbe der Bedeutung (Light-Variante der Farbe bei Light, volle bei Dark), z. B. „+320 kcal“ in `bonusSoft`/`bonus`.
- Icon vorne 14 pt semibold, Gap 6.
- Multi-Select-Gruppen: `flex-wrap`, Gap 8.

### 5.4 Listenzeile

- Höhe min. 60 (Icon-Container 40 + 10 vertikal Padding), Padding horizontal 16, Gap 12.
- Aufbau: [Icon-Container 40 / Thumbnail 48 Radius 12] [Titel Headline + Sub Caption `labelSecondary`] [rechts: Numeric-S + Einheit Caption] [optional `chevron.right` 13 pt bold `labelTertiary`].
- Separator: Hairline `separator`, Einzug links 68 (bündig zum Text, nicht zum Icon).
- Swipe-Delete: Hintergrund `danger`, Icon `trash.fill` weiß, Radius der Karte bleibt (Zeile clippt mit 24 nur an Ecken der Gruppe).
- Mahlzeit-Gruppen-Header = Zeile mit Mahlzeit-Icon-Container (Soft-Tint, je Mahlzeit eigene neutrale Tönung via `surfaceRaised`) + Summe rechts (Numeric-S).

### 5.5 Tab-Bar-Tint

- NativeTabs bleiben komplett nativ (Liquid Glass). `tintColor` / `iconColor.selected` = `themeColor('accent')` → via `AccentColor`-Asset: Dark Lime, Light Forest. Nicht-selektiert: System (grau); **nicht** manuell einfärben.
- Hintergrund: Glass bleibt; der Screen-Hintergrund dahinter ist S0 (dunkel-grün-getönt), damit die Glasfläche leicht grün schimmert (das ist die „nordische“ Note, ohne dass wir etwas faken).
- Badge (z. B. offene Sync-Einträge): `danger`-Fläche nativ.

### 5.6 Kcal-Ring (Hero-Komponente, Skia)

Ring liegt **immer auf der Hero-Karte** (dunkel) → feste Hexwerte aus `fixedColors`.

| Eigenschaft            | Wert                                                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Größe / Strich         | 264 pt / **22 pt** (heute 240 / 20), Round Caps                                                                                                                                             |
| Track                  | `rgba(245,242,234,0.12)` (kein Grau mehr)                                                                                                                                                   |
| Fortschritt            | SweepGradient `#9BE564 → #D4F55A → #E9FF9E` (Kopf am hellsten), Startwinkel 12 Uhr, rotiert −90°                                                                                            |
| Glow                   | `BlurMask` (blur 14, style `normal`) auf Kopf-Kappe, Lime `#C6F135` Alpha 0,45; zusätzlich Pfad-Duplikat mit blur 22 / Alpha 0,22. Nur wenn Fill > 2 %                                      |
| Bonus-Segment          | Bereich ab `baseShare` bis 1: Track-Tönung Ember Alpha 0,28 (`#FF8A3D`), Füllung SweepGradient `#FF8A3D → #FFB066`; Trennmarke bei `baseShare`: 2-pt-Lücke (weicher Punkt, 4 pt, `#0F2A20`) |
| Over-Limit             | Ring `#FF5C66` (Danger), Glow auf Danger Alpha 0,3, **kein** Flackern; Zahl bleibt `heroLabel`, Label „über“ in `#FF5C66`                                                                   |
| Zentrumszahl           | Numeric-Hero 64/60 Bricolage ExtraBold `heroLabel`, tabular, darunter „kcal übrig“ Callout 15 Medium `heroLabel2`, darunter „1 420 / 2 140“ Caption `heroLabel2` 80 % Alpha                 |
| Tick-Marken (optional) | 60 feine Striche außen, 1 pt, Länge 4, `rgba(245,242,234,0.10)`, bei 25/50/75 % 7 pt – gibt „Uhr/Instrument“-Anmutung                                                                       |
| A11y                   | Label wie heute; Farbe nie alleiniger Träger (Zahl + Label)                                                                                                                                 |

### 5.7 Makro-Balken

- Zeile: [Marker-Badge 20 × 20 Radius 6 mit Buchstabe P/K/F, Caption 11 Bold, Fläche `*Soft`, Text = Makrofarbe-Light/Dark] [Name Callout 15 Medium `label`] … [„86 / 140 g“ Numeric-S tabular, Einheit Caption].
- Balken: Höhe **10**, Radius voll, Track S2 (auf Karte) bzw. `heroTrack` (auf Hero), Füllung Makrofarbe voll (kein Verlauf), Kopfpunkt mit 2-pt Surface-Rand bei < 100 %.
- Protein hervorgehoben: Balken **14** hoch, Name Headline 17, Marker 24.
- Über Ziel: Füllung bleibt Makrofarbe, rechts erscheint ein 4-pt-Danger-Strich am Ende (kein Wechsel der Gesamtfarbe → Makro bleibt erkennbar).
- Zusammenfassung als **Segmentleiste** (Verteilung P/K/F des Tages): 12 hoch, drei Segmente, 2-pt-Lücken, Radius voll, Beschriftung mit Form-Markern darunter.

### 5.8 Charts

- **Wochenbalken** (heute `WeeklyBars`): Balkenbreite flexibel (max 28), Radius oben 6/unten 6, Track S2, Füllung `accent` (Lime/Forest); heutiger Tag Füllung + 2-pt-Ring `accent` außen; Zielwert als gestrichelte 1-pt-Linie `labelTertiary`. Zahl über Balken Caption 12 Semibold tabular; Wochentag unter dem Balken Overline-klein 11 `labelSecondary`, heutiger Tag `label` Bold. Kcal-Tage über Limit: Balken `danger`-Soft-Füllung mit `danger`-Oberkante 3 pt.
- **Kcal-Tagesbalken** (`DailyKcalBars`): wie oben; Bonus-Anteil als obere Segment-Kappe in `bonus`.
- **Gewichtskurve** (`WeightTrendChart`): Linie 3 pt `accent` (auf Hero: `fixed.lime`), geglättet (Catmull-Rom, Tension 0,5), Fläche darunter Verlauf `accent` Alpha 0,28 → 0 (180°), Rohmesswerte als 5-pt-Punkte `labelTertiary` (Tendenz-Linie vs. Rohwerte), aktueller Punkt 10 pt mit 3-pt-Surface-Ring und Glow (Dark). Zielgewichts-Linie gestrichelt `bonus`-frei: `labelSecondary` 1 pt, Label rechts „Ziel 78 kg“ Caption. Achsen: nur 3 y-Ticks, Caption 11 `labelTertiary`, keine vertikalen Gitter, horizontale Hairlines `separator`.
- Tooltips beim Scrubben: S3-Fläche, Radius 12, Numeric-S + Caption, Haptic-Tick durch Motion-Team.
- Chart-Farben auf Karten (S1) nutzen `useThemeHex()`; auf Hero `fixedColors`.

### 5.9 Buttons

- **Primary** = bestehender `GlassActionButton` (nativer Liquid-Glass-Pill, 56 hoch, 24-pt-Seitenrand), `tintColor` = accent (Dark Lime mit Tinten-Text `onAccent`, Light Forest mit Papier-Text). Text Button-Stil 17 Semibold. Icon 18 semibold vorne. Kein Gradient oben drauf (Hard Rule: Glass nicht faken). Press: nativ + Haptic (Motion-Team).
- **Secondary**: Glass `variant: 'secondary'` (nicht getönt, `glass`), Text `label`; bei fehlender Glass-Fähigkeit (`GlassView` Fallback): Fläche S2 + 1-pt Linie `border`, Radius voll, Text `label`.
- **Destructive**: Fläche `dangerSoft`, Text `danger`, Radius voll – nie volle Rotfläche (ruhig). Bestätigung im Alert rot nativ.
- **Tertiary / Text-Button**: Callout 15 Semibold `accent`, Hit-Slop 12.
- **Icon-Button** 44 × 44, Radius voll, Fläche S2, Icon 18 semibold `label`.
- **Disabled**: 40 % Alpha, nie Farbwechsel.
- Ember-Variante **„Workout starten“** (nur Training-Hero): Fläche emberHero-Gradient (kein Glass), Text `ink #0C0F0D`, Radius voll, 56 hoch – bewusst die einzige nicht-native Button-Fläche; Glas-Pflicht gilt nur für Liquid-Glass-Optik, ein flacher Farbbutton ist erlaubt (Hard Rule #1 verbietet Fakes, keine flachen Flächen).

### 5.10 Eingabefelder

- Höhe 56, Radius 16, Fläche S2, kein Rand im Ruhezustand, Text Body 17 `label`, Placeholder `labelTertiary`, Label oben Caption 13 Medium `labelSecondary` (Gap 6).
- **Fokus**: 2-pt-Rand `accent`, Fläche bleibt S2; Cursor/Selection `accent`.
- **Fehler**: 2-pt-Rand `danger` + Hinweistext Caption `danger` mit `exclamationmark.circle.fill` 14 pt.
- Zahlenfelder (Gewicht, Größe): Wert in **Numeric-M** (Bricolage 700 24 pt) rechtsbündig + Einheit Caption; große Onboarding-Zahleneingabe: Numeric-L 40 pt zentriert.
- Segment-Picker nativ (`@expo/ui` Picker segmented) – Tint accent.
- Suchfeld: Radius voll, Höhe 44, Lupe `labelSecondary`.

### 5.11 Sheets (Header-Muster)

- Native formSheet bleibt (Grabber sichtbar, Radius System). Hintergrund: S0 (`bg`) – nicht S1, damit Karten im Sheet (S1) sich abheben.
- Header-Muster: Grabber → 20 pt Abstand → **Titel zentriert in Title-Stil 22/26 Bricolage Bold** (statt 18 SF Semibold) → optionaler Untertitel Callout `labelSecondary` zentriert (Gap 4) → Inhalt, Gap 20, Padding 20.
- Primäraktion immer **unten** (sticky GlassActionButton), nie oben rechts als Textlink; Schließen = Swipe.
- Bei Sheets mit Hero-Charakter (Food-Review): Kopfkarte `tinted` mit dem Gesamtkcal in Numeric-L.

### 5.12 Toasts

- Position: oben unter der Dynamic Island (safe-area top + 8), Breite = Screen − 40, max 420.
- Fläche S3 (Dark) / `#1B1A16` invertiert (Light: dunkler Toast auf Papier für Kontrast), Radius voll (Kapsel) bei einzeiligem Text, 20 bei zwei Zeilen; Höhe min. 52, Padding 16 / 12.
- Icon links in Bedeutungsfarbe (Erfolg `success`, Fehler `danger`, Info `accent`) 20 pt, Text Callout 15 Medium, Aktion rechts Text-Button Semibold.
- Schatten Overlay (Light) / Innenlinie (Dark). Dauer 3 s, Haptik/Animation: Motion-Team.

### 5.13 Badges

- **Zähl-Badge**: Ø 20 (min), Fläche `accent`, Text `onAccent` Caption 12 Bold, Rand 2 pt in Hintergrundfarbe (cutout).
- **Streak/Tag-Badge** (Gamification): Kapsel 28 hoch, `bonusSoft` + `bonus`-Text + Icon `bolt.fill`; Meilenstein = Hero-Variante mit emberHero-Verlauf und Ink-Text.
- **Status-Dot**: 8 pt, Farbe Bedeutung, mit 2-pt-Cutout.
- **AI-Badge** („KI-Schätzung“): `accentSoft` + `accent`, Icon `sparkles` 12 pt.

---

## 6. Screen-Layout-Prinzipien

Grundregeln: **1 Hero pro Screen**, danach max. 3 Sektionen vor dem Fold, jeder Sektion ein Zweck. Raster: 20 pt Gutter, Karten volle Breite, Zweispaltige Kachelzeilen nur mit Gap 12 und gleichen Höhen. Weißraum: 32 zwischen Sektionen, Hero hat 24 Padding und 0 Konkurrenz im Sichtfeld. Der obere Screenbereich trägt nightWash/paperWash (280 pt), darunter flach S0.

### 6.1 Today

Hierarchie: **Datum/Begrüßung → Hero (Ring + Makros) → Mahlzeiten → Training-Hinweis**.

```
┌──────────────────────────────────────┐
│  Heute, Do 9. Okt.         ‹   ›     │  Header inline (Overline + Datum Title)
│                                      │
│ ╔══════════════════════════════════╗ │  HERO-Karte (heroForest, r32, pad 24)
│ ║           ╭──────────╮           ║ │
│ ║        ╭──┤  1 420   ├──╮        ║ │  Ring 264 pt, Lime-Sweep + Glow,
│ ║        │  │ kcal übrig│ │        ║ │  Zahl = Numeric-Hero 64
│ ║        ╰──┤ 720/2 140 ├──╯        ║ │  Bonus-Segment Ember am Ringende
│ ║           ╰──────────╯           ║ │
│ ║  +320 kcal Training  [Pill ember]║ │
│ ║  ─────────────────────────────── ║ │
│ ║  ● P 86/140g  ◆ K 190/240g  ■ F 31/70g║ │  3 Makro-Mini-Balken (Hero-Track)
│ ╚══════════════════════════════════╝ │
│                                      │
│  MAHLZEITEN                          │  Overline
│ ┌──────────────────────────────────┐ │  Karte flat
│ │ [🍳] Frühstück          420 kcal │ │  Icon-Container 40, Numeric-S
│ │──────────────────────────────────│ │
│ │ [🥗] Mittag             —   [＋] │ │  leere Mahlzeit = Plus-Button accentSoft
│ └──────────────────────────────────┘ │
│                                      │
│  ┌ tinted (bonusSoft) ───────────┐   │  Training-Hinweis (nur wenn heute)
│  │ ⚡ Push-Tag: 45 min  Starten › │   │
│  └───────────────────────────────┘   │
│                       ( ＋ Mahlzeit ) │  GlassActionButton (Lime/Forest), schwebend
└──────────────────────────────────────┘
```

- Hero **enthält** Ring und Makros (heute zwei getrennte Blöcke): ein Block, eine Aussage „Wie viel darf ich noch?“.
- Mahlzeiten als gruppierte Zeilen in einer flat-Karte, leere Mahlzeit als einladende Zeile (kein Leerraum-Loch).
- Datumswechsel: Swipe bleibt, zusätzlich zeigt der Header Pfeile `chevron.left/right` 17 semibold `labelSecondary`.

### 6.2 Training

- **Hero = „Heute“**: emberHero-Karte (Radius 32) mit Routine-Name (Display 34), Dauer/Übungen (Caption in Ink 70 %) und Button „Workout starten“ (Ink-Fläche, Papier-Text oder Ember-Variante wie 5.9). Kein Training heute → Hero wird `tinted` mit Vorschlag „Freies Training starten“.
- Darunter: Sektion **Routinen** (horizontale Karten-Karussell, 168 × 112, Radius 24, S1, Icon-Container oben links) → Sektion **Verlauf** (Zeilen mit Datum-Block links: Tag Numeric-M + Monat Caption, Volumen/kcal rechts) → importierte Health-Workouts mit kleinem Herz-Icon-Marker `heart.fill` 12 pt `bonus`.
- Während eines laufenden Workouts: schmaler Banner (emberHero, 56 hoch) über der Tab-Bar.

### 6.3 Insights

- **Hero = Gewichtskurve** auf heroForest (Linie Lime, aktueller Wert in Numeric-L oben links, Delta-Pill „−1,2 kg / 30 Tage“ in `success`-Soft). Zeitraum-Segment (7T/30T/90T) als Chips unterhalb des Hero, nicht darin.
- Danach 2-Spalten-Kacheln (Radius 24, flat): Ø kcal/Woche, Protein-Schnitt, Trainingstage (Wochenbalken), Adaptive-TDEE („Dein Verbrauch“ mit Info-Link). Maximal 4 Kacheln vor „Mehr“.
- Eine **Erkenntnis-Karte** (`tinted`, `accentSoft`) mit einem Satz Insight – Platz für Brand-Tonalität.

### 6.4 Profile

- Ruhig, kein Hero-Verlauf: **Kopf** = Avatar-Monogramm (Kreis 72, Fläche `accentSoft`, Initialen Bricolage 700 28 in `accent`) + Name (Title) + Ziel-Pill („Abnehmen · −0,5 kg/Woche“).
- Danach Listen-Gruppen (flat, Zeilen mit Icon-Containern in `*Soft`): Körper & Ziel, Ernährung, Gesundheit (Apple Health), Benachrichtigungen, Sprache/Einheiten, Konto. Destruktive Aktionen ganz unten, getrennt, `dangerSoft`.
- Keine Gamification-Dekoration hier außer einer schlanken Streak-/Mitglied-seit-Zeile.

### 6.5 Onboarding

Prinzip: **eine Frage, ein Gefühl pro Seite**. Hintergrund S0 mit nightWash; Titel Display 34 Bricolage (links, max. 3 Zeilen), darunter Callout `labelSecondary`; Auswahl als Option-Cards (Radius 20, S1, 2-pt-`accent`-Rand + `accentSoft`-Füllung bei Auswahl, Icon-Container links, SF-Symbol-Pop); unten GlassActionButton „Weiter“ (verschwindet bei Auto-Advance). Progress: 4-pt-Linie oben, `accent` auf `surfaceRaised`. Zahleneingaben (Gewicht/Größe) mit Numeric-L zentriert, Einheit-Toggle als Segment nativ.

**Result-Screen (Hero-Moment, volle Hero-Behandlung):**

```
┌──────────────────────────────────────┐
│  ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔  │  Fortschritt voll (Lime)
│                                      │
│    Dein Plan, Lukas.                 │  Display 34, label
│                                      │
│ ╔══════════════════════════════════╗ │  heroForest + heroGlow groß
│ ║     DEIN TAGESLIMIT              ║ │  Overline heroLabel2
│ ║        2 140                     ║ │  Numeric-Hero 72/68, Lime→Weiß-Textverlauf
│ ║          kcal / Tag              ║ │  (Zahl bleibt label-Farbe, Glow dahinter)
│ ║  ──────────────────────────────  ║ │
│ ║  ● P 140 g  ◆ K 240 g  ■ F 70 g  ║ │  3 Makro-Zellen, Soft-Tint-Boxen
│ ╚══════════════════════════════════╝ │
│                                      │
│  Ziel 78 kg · am 14. Feb. 2027       │  Weight-Projection-Chart (Lime-Linie)
│  ╭───────────────╮                   │
│  │     ╲___       │                   │
│  ╰───────────────╯                   │
│                                      │
│           ( Weiter )                 │  GlassActionButton
└──────────────────────────────────────┘
```

Count-up der Zahl (Motion), Ring/Chart zeichnen sich selbst; Farben bleiben ruhig, der Lime-Glow ist der einzige Leuchtpunkt.

---

## 7. App-Icon-Farbwelt und Splash

(Nur Farben/Gradienten; Form macht der Mark-Designer.)

**App-Icon (1024)**

- Hintergrund: Verlauf `#1D4F3B` (oben links) → `#0F2A20` (unten rechts), 160°, plus sehr dezenter radialer Glow `rgba(198,241,53,0.18)` hinter dem Mark (Mitte, Radius 55 %).
- Mark (ø): Lime `#C6F135`; der Schrägstrich/Slash des ø optional Papier `#F5F2EA`.
- Dark-Variante (iOS 26 Dark Icon): Hintergrund `#0C0F0D`, Mark Lime; Tinted-Variante: Graustufenmark auf `#0C0F0D`.
- Clear/Glass-Variante (`moni.icon` Icon Composer): Mark als Lime-Ebene, Hintergrundebene Forest-Verlauf; Specular nicht überschreiben.
- Kein Weiß als Hintergrund, kein Mint.

**Splash**

- Dark: Hintergrund `#0C0F0D` (nightWash-Ende), Mark Lime; Light: Hintergrund `#F5F1E8`, Mark Forest `#1D6B47`. Heute `#ffffff`/`#000000` in `app.config.ts` → ersetzen.
- Personalisierter Launch-Screen (existiert): Begrüßung in Bricolage 700, heroForest-Verlauf, Ring-Motiv in Lime.
- Statusleiste: auf Dark hell, auf Light dunkel (automatisch).

**Weitere Flächen**: Wortmarke „møni“ in Bricolage ExtraBold, Lime (Dark) / Forest (Light) / Papier auf Forest; Store-Screenshots auf `#0C0F0D` mit Lime-Headline.

---

## 8. Dark-Mode- und Light-Mode-Strategie

**Dark ist primär** (Marketing, Screenshots, Icon, Default-Entscheidungen werden dort zuerst getroffen).

- **Kein reines OLED-Schwarz als Fläche.** Basis `#0C0F0D` ist fast schwarz, aber grün getönt (Verhältnis Tiefe/Wärme). Karten S1 `#151A17`: Abstand zu S0 ≈ 1,07:1 (bewusst subtil) – deshalb zusätzlich 1-pt-Innenlinie, sonst verschwimmen Karten. Reines `#000` nur für Splash-Systemfallback.
- **Getönte Tiefe**: je höher die Ebene, desto heller **und** leicht grüner (`#151A17` → `#1D2420` → `#272F2A`). Kein Grau.
- Lime bekommt Dark-Mode-„Strahlen“ (Glow, 2.6) – nur dort. Schatten entfallen.
- Text nie reines Weiß (`#F5F2EA`), reduziert Halo auf OLED.

**Light = Papier-Tagebuch.**

- S0 ist Creme `#F5F1E8` (nicht Weiß), Karten heller als Grund (`#FFFDF8`). Kein reines Weiß, kein Schwarz (`#1B1A16`).
- Akzent wird **Forest** (ruhig, seriös), der „Wow“ kommt von den immer dunklen Hero-Karten – so bleibt Light kein verwaschener Kompromiss.
- Schatten warm und weich, Kontrast der Makrofarben-Leichtvarianten (dunkler, gesättigter).
- Hero-Karten werfen im Light Mode den stärksten Schatten der App → klarer Fokus.

**Umschalten**: `userInterfaceStyle: 'automatic'` (heute schon). Kein In-App-Theme-Toggle in Phase 1 (nativ-dynamisch via Asset-Catalog funktioniert ohne JS). Übergang beim Wechsel macht das System (keine eigene Animation nötig).

---

## 9. Umsetzungs-Hinweise

### 9.1 Dateien und Änderungen

| Datei                                                                               | Änderung                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `theme.config.js`                                                                   | Ersetzen durch Proposal 2.9 (alte Keys `accent`/`bonus`/`danger` bleiben, neu `asset` + viele Tokens + `fixed`)                                                                                                                                                                                                              |
| `plugins/withAccentColor.js` → erweitern zu `withBrandColors.js`                    | Schreibt **alle** Token als Colorsets (`MoniBg`, … je mit Light/Dark `appearances`), plus weiter `AccentColor` (accent). Gleiche Funktionen `colorsetContents()` wiederverwenden, Schleife über alle Token mit `asset`. Muss Alpha-Werte unterstützen (nur `border`, falls als Colorset gewünscht; sonst als RN-rgba direkt) |
| `tailwind.config.js`                                                                | Neue Token (2.9) via `platformColor(brand.X.asset)`; alte Namen als Aliase auf die neuen Werte; `fontFamily` (3.2); `borderRadius` erweitern (`card: 24`, `hero: 32`, `inner: 16`); `spacing`-Extras nicht nötig (4-pt Grid = Tailwind-Default)                                                                              |
| `src/theme/colors.ts`                                                               | `ThemeColorName` ohne `fixed`; `themeColor()` → `PlatformColor(theme[name].asset)`; `fixedColors`-Export; ggf. Hook `useBrandGradient(name)`                                                                                                                                                                                 |
| `app.config.ts`                                                                     | `expo-font`-Plugin mit Bricolage-ttf (3.2); Splash-Farben `#F5F1E8` / `#0C0F0D`; Plugin `withBrandColors` statt `withAccentColor`                                                                                                                                                                                            |
| `src/components/ui/Card.tsx`                                                        | Varianten (5.1), neue Radien, `borderCurve: 'continuous'`                                                                                                                                                                                                                                                                    |
| `src/components/ui/SectionHeader.tsx`                                               | Overline-Stil, optionaler rechter Slot/Marker                                                                                                                                                                                                                                                                                |
| `src/components/ui/SheetScreen.tsx`                                                 | Titel Bricolage 22, S0-Hintergrund, Subtitle-Slot                                                                                                                                                                                                                                                                            |
| `src/components/ui/` neu                                                            | `Text.tsx` (Varianten `numericHero`, `title`, … mit tabular-nums), `Chip.tsx`, `Badge.tsx`, `ListRow.tsx`, `IconTile.tsx`, `Toast.tsx`, `HeroCard.tsx`                                                                                                                                                                       |
| `src/components/charts/KcalRing.tsx`                                                | Gradient-Sweep, Glow (BlurMask), Track, Bonus-Segment gemäß 5.6; Farben aus `fixedColors` statt `useThemeHex` (Ring ist immer auf Hero)                                                                                                                                                                                      |
| `src/components/charts/MacroBar.tsx`                                                | `color` Prop → `'protein'                                                                                                                                                                                                                                                                                                    | 'carbs' | 'fat'`, Marker-Badge, neue Höhen |
| `src/components/charts/WeeklyBars.tsx`, `DailyKcalBars.tsx`, `WeightTrendChart.tsx` | Farben/Radien/Linien gemäß 5.8                                                                                                                                                                                                                                                                                               |
| `app/(tabs)/index/index.tsx`                                                        | Neues Layout 6.1 (Hero enthält Ring + Makros)                                                                                                                                                                                                                                                                                |
| `app/(onboarding)/*`, `src/features/auth/components/*`                              | Display/Numeric-Stile, Option-Card-Auswahlstil 2 pt `accent`, Result-Screen Hero                                                                                                                                                                                                                                             |
| `docs/design-system.md`                                                             | Nach Umsetzung aktualisieren (Hard Rule: Doc-Pflege), Tokenliste ersetzen                                                                                                                                                                                                                                                    |
| `CLAUDE.md`                                                                         | Abschnitt „Theme / brand colors“ aktualisieren (Asset-Catalog-Ansatz, neue Tokens, Schrift)                                                                                                                                                                                                                                  |

### 9.2 Reihenfolge

1. **Tokens & Plugin** (`theme.config.js`, `withBrandColors`, `tailwind.config.js`, `colors.ts`) – aliasgesichert, App sieht sofort neue Farben, nichts bricht. → **Prebuild/Native Rebuild nötig** (`npx expo prebuild --platform ios --clean` + Build, siehe CLAUDE.md „iOS build“).
2. **Fonts** (Paket installieren, expo-font-Plugin, Tailwind `fontFamily`, `Text`-Wrapper). Ebenfalls Rebuild (Fonts in der Binary).
3. **Basis-Komponenten**: Card, SectionHeader, Chip, ListRow, IconTile, SheetScreen.
4. **Hero & Charts**: HeroCard (+ `expo-linear-gradient` via `npx expo install expo-linear-gradient`, oder Skia-Gradient im Canvas), KcalRing, MacroBar, Wochen-/Gewichtscharts.
5. **Screens**: Today → Onboarding-Result/Option-Cards → Training → Insights → Profile.
6. **Splash/Icon-Farben** (mit Mark-Designer abstimmen, Prebuild).
7. Dokumente aktualisieren, in Simulator Light + Dark + Dynamic Type XXL + Reduce Motion prüfen (Hard Rule #8).

### 9.3 Risiken und Gegenmaßnahmen

| Risiko                                              | Auswirkung                                                                                            | Maßnahme                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Asset-Catalog-Colorsets brauchen Native-Rebuild** | Neue Farben erscheinen nicht per Metro-Reload; im Dev-Build alte Farben bis Rebuild                   | Fallback `platform` im Config; `themeColor()` prüft nicht zur Laufzeit (PlatformColor mit unbekanntem Namen = transparent/schwarz!) → **Erst Plugin + Rebuild, dann Tokens umschalten** (Schritt 1 als eigener PR). Alternativ CSS-Variablen (`global.css`, `@media (prefers-color-scheme: dark)`) als Plan B, dann verlieren native Controls die warmen Neutrale |
| **Liquid-Glass-Tint auf Lime**                      | Native Glass tönt Lime heller/blasser, Ink-Text kann an Kontrast verlieren (Glass mischt Hintergrund) | Im Simulator Dark + Light testen; Fallback `glassProminent` mit explizit `tint` bzw. Text-Farbe über `foregroundStyle`; Lime niemals über sehr hellen Content schweben lassen (Scroll-Inset + Gradient-Fade unter dem Button)                                                                                                                                     |
| **Light-Mode-Akzent Forest vs. Lime-Marke**         | Marke „wechselt Farbe“ je Modus                                                                       | Bewusst; Hero bleibt in beiden Modi dunkel mit Lime, App-Icon + Splash = Lime. Marketing zeigt beide                                                                                                                                                                                                                                                              |
| **PlatformColor in Skia**                           | Nicht möglich                                                                                         | Ring/Charts nur `fixedColors` (auf Hero) bzw. `useThemeHex()` (auf Karten)                                                                                                                                                                                                                                                                                        |
| **Font-Name-Mapping**                               | Falscher `fontFamily`-String → Fallback-System-Font, unbemerkt                                        | Nach erstem Build `Font.isLoaded`/Screenshot prüfen; Tailwind-Namen zentral halten                                                                                                                                                                                                                                                                                |
| **`font-bold` + Custom Font**                       | Doppelte/synthetische Fettung                                                                         | ESLint-Regel oder Convention: Bricolage-Stile nur über `Text`-Wrapper                                                                                                                                                                                                                                                                                             |
| **Kontrast Karten S1 vs S0 im Dark (1,07:1)**       | Karten verschwimmen auf dunklen Displays                                                              | 1-pt-Innenlinie Pflicht; Test bei niedriger Helligkeit                                                                                                                                                                                                                                                                                                            |
| **Makrofarben-Verwechslung Ember vs. Honig**        | Bonus-Segment vs. Kohlenhydrate-Balken                                                                | Beides nie im selben Chart; Kontext + Marker; im Zweifel Honig weiter Richtung Gelb (`#FFD43D`) verschieben                                                                                                                                                                                                                                                       |
| **Hero-Karten-Gradient + Performance**              | Zwei Skia-Canvases (Gradient + Ring) pro Screen                                                       | Gradient per `expo-linear-gradient` (nativ), nur Ring in Skia                                                                                                                                                                                                                                                                                                     |
| **Dynamic Type bei Display-Zahlen**                 | Überlauf im Ring                                                                                      | `adjustsFontSizeToFit`, `maxFontSizeMultiplier 1.15`                                                                                                                                                                                                                                                                                                              |
| **Dependabot/Expo-Pakete**                          | `@expo-google-fonts/*` sind nicht Expo-SDK-gekoppelt                                                  | Versionspin (`0.4.1`), kein Auto-Major                                                                                                                                                                                                                                                                                                                            |

### 9.4 Abnahmekriterien

- Light + Dark: alle Text/Fläche-Paare aus 2.7 gemessen eingehalten (Screenshot-Check Accessibility Inspector).
- Today nur mit Hero + Mahlzeiten lesbar; mit Dynamic Type XXL ohne Abschneiden.
- Makros in Graustufen-Screenshot noch unterscheidbar (Form-Marker + Luminanz).
- Keine Hex-Farben in Komponenten außerhalb `theme.config.js`/`fixedColors` (grep-Check), kein `systemBlue/Mint/Orange` mehr.
- Nach Umsetzung: `npm run lint && npm run typecheck && npm run format:check && npm test`.
