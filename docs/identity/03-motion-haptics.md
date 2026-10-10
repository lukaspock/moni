# møni – Motion & Haptics (03)

> Status: Entwurf des Motion-&-Haptics-Designers. Eigenständig lesbar, Teil der Identity-Serie `docs/identity/`. Kein App-Code wurde geändert.
> Alle Zahlen sind coding-fertig für Reanimated 4.5 / Skia 2.6 / expo-haptics 57. Zeiten in ms, Winkel in Grad, Skalen als Faktor.

---

## 0. Ist-Stand (Bestandsaufnahme)

Geprüft im Repo (Stand `main`, ee087d5):

| Thema                    | Befund                                                                                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reanimated               | `react-native-reanimated 4.5.1` + `react-native-worklets 0.10.1` installiert. Genutzt: `withTiming`, `withSpring`, `withSequence`, `FadeInDown`, `useReducedMotion`.                                                                              |
| Skia                     | `@shopify/react-native-skia 2.6.2` installiert (inkl. `Skia.RuntimeEffect`, also SkSL-Shader möglich, noch ungenutzt). Genutzt in `KcalRing`, `WeightProjectionChart`. Skia nimmt kein `PlatformColor` -> `useThemeHex()`.                        |
| Haptik                   | `expo-haptics ~57.0.3`, 34 Aufrufe direkt über `Haptics.*` in 15 Dateien (OptionCard, GlassActionButton, Today, food-review, workout/active, calculating, Onboarding-Screens). **Kein zentraler Wrapper, kein Settings-Toggle, kein Rate-Limit.** |
| Gesten                   | `react-native-gesture-handler ~2.32` installiert.                                                                                                                                                                                                 |
| Sound / Lottie / Battery | **nicht installiert** (`expo-audio`, `lottie-react-native`, `expo-battery` fehlen).                                                                                                                                                               |
| Zahlen                   | `CountUpText` animiert über `requestAnimationFrame` + `setState` pro Frame -> **JS-Thread-Animation, 60 re-renders pro Sekunde**. Muss durch UI-Thread-Lösung ersetzt werden (Abschnitt 7).                                                       |
| Ring                     | `KcalRing`: `withTiming(700, out(cubic))`, eine Farbe, kein Glow, kein Überschwingen, kein Wert-Änderungs-Verhalten (Wert springt einfach).                                                                                                       |
| Sheets/Tabs              | Native (`formSheet`, `NativeTabs`) – Übergänge gehören iOS, wir fassen sie nicht an (Hard Rule #1 Native first).                                                                                                                                  |
| Reduce Motion            | `ReduceMotion.System` ist Default bei Entering/Layout-Animationen; manuell via `useReducedMotion()` in Ring/CountUp/Chart.                                                                                                                        |

Konsequenz: Das System unten ersetzt verstreute Magic Numbers (700, 900, 70, damping 12 …) durch Tokens und ergänzt, was „generisch“ wirkt: **Charakter in Zahlen, Ring und Feier-Momenten**, nicht in Übergangs-Gimmicks.

---

## 1. Bewegungsphilosophie – Leitmetapher: **GLUT**

### 1.1 Warum Glut (und nicht „Atmen“ oder „Gezeiten“)

- **Atmen** ist hübsch, aber passiv und zu Wellness-App (Calm). møni ist Fitness + Kalorien: Energie, Verbrennung, Aufladen.
- **Gezeiten** sind zu langsam und kollektiv; Training ist kurz, punktuell, persönlich.
- **Glut** trägt Namen und Produktlogik zugleich:
  - **Kalorien sind buchstäblich Brennwert.** Essen = Brennstoff nachlegen, Training = Feuer anfachen (Workout-Bonus!), Limit = Gefäß, das die Glut hält.
  - Glut hat eine **charakteristische Zeitkurve**: schnelles Anfachen (kurzer, kräftiger Attack), langes, warmes Nachglimmen (weicher Decay). Das ist genau die Asymmetrie, die Bewegung „hochwertig“ statt „mechanisch“ macht.
  - Glut ist **warm**: der mint Akzent bekommt durch orange Bonus-Glut + goldenen Funken eine zweite, wärmere Temperatur. (Farbpalette liegt bei Visual Designer; wir referenzieren nur `accent`, `bonus`, `danger` aus `theme.config.js`.)
  - Glut ist **ruhig, wenn nichts passiert**: Idle-Zustand = ein kaum wahrnehmbares Glimmen, kein Dauer-Gezappel.

### 1.2 Die fünf Glut-Prinzipien (Regeln für jede Animation)

1. **Anfachen (Kindle)** – Eintritte/Zustandswechsel starten schnell (Attack ≤ 25 % der Gesamtdauer) und verlangsamen weich. Easing: `out`-Kurven, Spring mit hohem damping. Nie linear.
2. **Nachglimmen (Afterglow)** – Nach dem Höhepunkt klingt es länger aus, als es aufgebaut wurde (Glow-Decay 1.5–2.5x Attack). Beispiel: Ring-Glow steigt in 180 ms, fällt in 600 ms.
3. **Wärme statt Wackeln** – Kein Wobble, kein Rubber-Banding in Standard-UI. Überschwingen (Bounce) ist ein **seltenes Privileg** für Belohnungen („Funke“), nicht für normale Taps.
4. **Abkühlen (Cool-down) ist schneller als Anfachen** – Ausgänge (Dismiss, Fade-out, Entfernen) dauern ~65 % der Eingangszeit. Der Nutzer wird nie warten gelassen.
5. **Funken sind selten** – Es gibt drei Intensitätsstufen: **Glimmen** (immer da, subtil), **Aufflammen** (bei jeder Aktion: Mahlzeit, Satz), **Funkenflug** (nur Meilensteine: Tagesziel, PR, Streak, Workout fertig). Wer jeden Tap feiert, entwertet die Feier.

### 1.3 Anwendung auf die Kernobjekte

| Objekt           | Glut-Übersetzung                                                                                                                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Kalorienring** | Der Ring ist das Feuer-Gefäß. Füllung = Glut-Linie mit „Kopf“ (heller Punkt am Ende, der mitläuft und nachglimmt). Idle: Kopf pulsiert minimal (Opacity 0.85 <-> 1.0, 3.2 s). Bonus = orange Glut, die von hinten in den Ring „einströmt“. |
| **Zahlen**       | Ziffern „rollen“ (Odometer) mit einem kurzen Aufleuchten des geänderten Werts (Farbe -> `accent` -> zurück zu `label`, 600 ms Afterglow).                                                                                                  |
| **Übergänge**    | Elemente tauchen aus „Wärme“ auf: Opacity + 8 pt Aufstieg (`translateY` von +8 -> 0), nie Slide-Ins von weit weg.                                                                                                                          |
| **Taps**         | Pressed = leichtes Eindrücken (Scale 0.97), Release = warmes Zurückfedern (settle spring).                                                                                                                                                 |
| **Feier**        | Funkenflug in Skia: kleine Partikel steigen auf, verlangsamen (Luftwiderstand), verblassen nach oben (Rauch/Asche-Verhalten, **nicht** Konfetti!). Das unterscheidet møni sofort von jeder Standard-Fitness-App.                           |
| **Laden**        | Kein Spinner: „Glut-Atem“ – ein Skia-Ring/Flamme-Kern, der heller/dunkler glimmt, plus aufsteigende Funken.                                                                                                                                |

### 1.4 Tonalität in einem Satz

> Ruhig, warm, präzise – wie Glut im Kamin: wenig Bewegung, aber jede hat Gewicht und Nachhall.

---

## 2. Motion Tokens

Datei-Entwurf `src/theme/motion.ts`. Alles reine Konstanten (worklet-sicher: `as const`, nur Zahlen/Arrays, keine Funktionen mit Closures über RN-Objekte).

### 2.1 Dauern

| Token        | ms   | Einsatz                                                     |
| ------------ | ---- | ----------------------------------------------------------- |
| `instant`    | 90   | Pressed-Down, Selection-Highlight, Toggle-Knopf             |
| `fast`       | 160  | Fades kleiner Elemente, Chip-Wechsel, Checkmark             |
| `base`       | 280  | Standard-Reveal, Karten-Eintritt, Farbwechsel               |
| `slow`       | 520  | Ring-Wertänderung, Zahlenroll, Chart-Teilstrecken           |
| `hero`       | 900  | Erst-Füllung des Rings, Projektionskurve, Onboarding-Result |
| `ambient`    | 3200 | Idle-Glimmen (Loop-Periode)                                 |
| `exitFactor` | 0.65 | Multiplikator für Ausgänge (Prinzip 4)                      |

### 2.2 Easings (Bezier, `Easing.bezier(x1,y1,x2,y2)`)

| Token        | Bezier                | Charakter / Einsatz                                                                                                                |
| ------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `kindle`     | `0.16, 1, 0.30, 1`    | „Anfachen“: sehr steiler Start, langes weiches Auslaufen (entspricht easeOutExpo-nah). **Default für alles, was erscheint/füllt.** |
| `ember`      | `0.22, 0.61, 0.36, 1` | Weicher als kindle, für Ring-Delta-Änderungen und Farbübergänge.                                                                   |
| `cool`       | `0.4, 0, 0.9, 0.6`    | Abkühlen: leicht beschleunigend, für Ausgänge (ease-in-ish).                                                                       |
| `smooth`     | `0.45, 0, 0.25, 1`    | Symmetrisch, nur für Loop-Atmen (Ambient).                                                                                         |
| `linearGlow` | `Easing.linear`       | Ausschließlich für kontinuierliche Rotation/Shader-Zeit.                                                                           |

### 2.3 Spring-Presets (Reanimated `withSpring`, **Physics-based** Parameter)

| Preset   | damping | stiffness | mass | Zusatz                     | Einsatz / Gefühl                                                                              |
| -------- | ------- | --------- | ---- | -------------------------- | --------------------------------------------------------------------------------------------- |
| `tap`    | 22      | 420       | 0.8  | `overshootClamping: false` | Pressed-Release von Buttons/Cards; knackig, kaum Überschwingen (~2 %).                        |
| `settle` | 18      | 180       | 1    | –                          | Standard-Rückkehr: Elemente rasten ein (Sheets-Inhalte, Reorder, Karten). Überschwingen ~4 %. |
| `bouncy` | 11      | 240       | 0.9  | –                          | Belohnungen: Häkchen, Badge „poppt“, Streak-Flamme. Überschwingen ~15–18 %.                   |
| `heavy`  | 26      | 120       | 1.6  | –                          | Schwere Objekte: Ring-Zahl landet, PR-Medaille, Summary-Karte. Langsam, ohne Wippen.          |

Zusatzparameter global: `restDisplacementThreshold: 0.01`, `restSpeedThreshold: 2` (Reanimated 4 nutzt `energyThreshold`; Default belassen, aber bei Zahlen-Springs `clamp` nicht nötig).

### 2.4 Stagger

| Token          | ms  | Einsatz                                                                                                  |
| -------------- | --- | -------------------------------------------------------------------------------------------------------- |
| `staggerTight` | 30  | Liste von Zeilen (Meal-Einträge), Ziffernspalten                                                         |
| `staggerBase`  | 55  | Karten, OptionCards (aktuell 45 -> auf 55 vereinheitlichen)                                              |
| `staggerWide`  | 90  | Hero-Sequenzen (Summary-Kennzahlen)                                                                      |
| `staggerMax`   | 400 | Cap: Gesamtverzögerung (index * stagger) nie über 400 ms, danach alle gleichzeitig (Listen > 8 Einträge) |

### 2.5 Pressed-State-Skalierung

| Token          | Scale | Opacity | Einsatz                                                                        |
| -------------- | ----- | ------- | ------------------------------------------------------------------------------ |
| `pressSubtle`  | 0.985 | 1       | Große Karten/Listenzeilen (Card, Row)                                          |
| `pressDefault` | 0.97  | 0.92    | Buttons, OptionCards, Chips                                                    |
| `pressStrong`  | 0.94  | 0.9     | Kleine Icon-Buttons (FAB, Stepper +/-)                                         |
| `pressHero`    | 0.92  | 1       | GlassActionButton („Add meal“) – braucht haptisches Gegenstück (Impact medium) |

Press-in: `withTiming(scale, { duration: instant(90), easing: kindle })`. Release: `withSpring(1, spring.tap)`.

### 2.6 TypeScript-Entwurf `src/theme/motion.ts`

```ts
import { Easing, ReduceMotion } from 'react-native-reanimated';

export const duration = {
  instant: 90,
  fast: 160,
  base: 280,
  slow: 520,
  hero: 900,
  ambient: 3200,
} as const;

/** Ausgänge sind kürzer als Eingänge (Glut-Prinzip 4). */
export const EXIT_FACTOR = 0.65;
export const exit = (ms: number) => Math.round(ms * EXIT_FACTOR);

export const bezier = {
  kindle: [0.16, 1, 0.3, 1],
  ember: [0.22, 0.61, 0.36, 1],
  cool: [0.4, 0, 0.9, 0.6],
  smooth: [0.45, 0, 0.25, 1],
} as const;

// Easing.bezier gibt ein Worklet-taugliches Objekt zurück; einmal auf Modulebene erzeugen.
export const easing = {
  kindle: Easing.bezier(...bezier.kindle),
  ember: Easing.bezier(...bezier.ember),
  cool: Easing.bezier(...bezier.cool),
  smooth: Easing.bezier(...bezier.smooth),
  linear: Easing.linear,
} as const;

export const spring = {
  tap: { damping: 22, stiffness: 420, mass: 0.8 },
  settle: { damping: 18, stiffness: 180, mass: 1 },
  bouncy: { damping: 11, stiffness: 240, mass: 0.9 },
  heavy: { damping: 26, stiffness: 120, mass: 1.6 },
} as const;

export const stagger = { tight: 30, base: 55, wide: 90, max: 400 } as const;
/** Verzögerung für Element `i`, nie über stagger.max. */
export const staggerDelay = (i: number, step: number = stagger.base) =>
  Math.min(i * step, stagger.max);

export const press = {
  subtle: { scale: 0.985, opacity: 1 },
  default: { scale: 0.97, opacity: 0.92 },
  strong: { scale: 0.94, opacity: 0.9 },
  hero: { scale: 0.92, opacity: 1 },
} as const;

/** Reveal: Aufstieg in pt (Glut: steigt auf, rutscht nicht seitlich). */
export const reveal = { rise: 8, scaleFrom: 0.98 } as const;

/** Reduced Motion: überall gleiche Policy. */
export const REDUCE = ReduceMotion.System;

/** Glow-Asymmetrie (Prinzip 2). */
export const glow = {
  attack: 180,
  decay: 600,
  idlePeriod: duration.ambient,
} as const;

export type SpringName = keyof typeof spring;
export type DurationName = keyof typeof duration;
```

Hinweis: Springs und Timings immer mit `reduceMotion: REDUCE` (bzw. `ReduceMotion.System`) als letztem Config-Feld durchreichen, damit der Systemschalter auch UI-Thread-Animationen greift. Zusätzlich im JS-Code `useReducedMotion()` nutzen, wo ganze Sequenzen durch statische Zustände ersetzt werden.

---

## 3. Signature-Momente

Notation: `t=0` = Auslöser. Alle Reduced-Motion-Varianten (**RM**) behalten **die Information** (Wert/Farbe/Zustand), entfernen Bewegung, Partikel und Loops; Haptik bleibt (eigener Schalter, siehe 4).

### 3.1 Kalorienring

**Geometrie-Bezug:** `KcalRing`, `STROKE_WIDTH = 20`, `size = 240`. Neue Layer in Reihenfolge: Track -> Bonus-Vorschau -> Glow (Blur) -> Füllung -> Kopf-Punkt.

#### a) Erst-Füllung (Screen erscheint)

- Auslöser: Today-Tab zum ersten Mal pro App-Start sichtbar (nicht bei jedem Tab-Wechsel – Flag im Memory-Store, `hasPlayedRingIntro`).
- Ablauf:
  - t=0: Track fade-in 0 -> 1 (`fast`).
  - t=120: Füllung `0 -> fillShare` mit `withTiming(hero 900, kindle)`.
  - t=120–1020: Kopf-Punkt (r = 10, Farbe `accent` heller +12 % L) folgt `end`; Glow-Radius 8 -> 14 während Füllung (Blur-Sigma 8 -> 14, Opacity 0.0 -> 0.55).
  - t=1020: Glow decay `opacity 0.55 -> 0.18` über 600 ms (`ember`).
  - Mittelzahl rollt parallel (3.3) mit 150 ms Delay.
- Danach Idle: Kopf-Opacity 1.0 <-> 0.85 (`smooth`, Periode 3200, Loop, `withRepeat(…, -1, true)`).
- **RM:** Füllung sofort auf Zielwert, kein Glow-Loop, Glow statisch 0.18.

#### b) Wert ändert sich (Mahlzeit hinzu/entfernt)

- Auslöser: `eatenKcal` ändert sich.
- Vorwärts (mehr gegessen): `withTiming(newShare, { duration: slow 520 (+ min(Δshare*600, 280) → 520–800), easing: ember })`. Am Ende (t=dauer): kurzer „Puls“ — Strichstärke 20 -> 22 -> 20 über 220 ms (`tap`-Spring, nur wenn Δ ≥ 3 % des Limits), Glow-Peak 0.55 -> 0.18 (decay 600).
- Rückwärts (Eintrag gelöscht): `withTiming(newShare, { duration: exit(slow) = 340, easing: cool })`, kein Puls, kein Glow-Peak (Abkühlen).
- Parameter Dauer: `dur = clamp(380 + |Δshare| * 900, 380, 900)`.
- **RM:** direkter Sprung, Farbe wechselt ohne Übergang.

#### c) Limit überschritten

- Auslöser: `eatenKcal` kreuzt `limitKcal` (einmalig pro Kreuzung und Tag; Flag, damit es nicht bei jeder weiteren Mahlzeit erneut triggert).
- Ablauf:
  - t=0: Füllung läuft bis 1.0 (wie b).
  - t=0–260: Farbe `accent` -> `danger` interpolieren (`interpolateColor`, `ember`), **nicht** springen.
  - t=260: Ring „wärmt sich“: Glow Farbe `danger`, Opacity 0 -> 0.4 -> 0.12 (attack 160, decay 600).
  - Überschuss-Segment: Fortsetzung des Rings in zweiter Runde, 6 pt schmaler (Strichstärke 14), `danger` mit 0.9 Opacity — füllt mit `slow`, kein Bounce.
  - Mittelzahl wechselt Label „übrig“ -> „drüber“: Crossfade `fast` (Zahl rollt von +0 hoch, nicht negativ).
- **Ton:** nie bestrafend. Keine Schüttel-Animation, kein Blinken. Haptik: **Warning (einmal)**.
- **RM:** Farbe wechselt sofort, kein Glow.

#### d) Workout-Bonus kommt dazu

- Auslöser: Health-Import oder fertiges Workout erhöht `bonusKcal`.
- Ablauf (Gesamt 1100 ms):
  - t=0: Bonus-Segment (Bereich `baseShare..1`) erscheint: Opacity 0 -> 0.4 (`base`), **strömt ein**: Trim `start` animiert von `baseShare` aus, `end` 1.0 gewachsen mit `withTiming(slow, kindle)` (das Gefäß vergrößert sich visuell: neuer Teil des Rings wächst in Orange).
  - t=0–520: Gesamtkreis bleibt fix; stattdessen verschiebt sich der Anteil `baseShare` (Übergang Mint/Orange) von altem -> neuem Wert (`ember`, 520).
  - t=300: kleine Funken (6 Partikel, siehe 6.2) steigen am Übergangspunkt auf, Lebensdauer 700 ms, Farbe `bonus`.
  - t=520: Bonus-Zahl „+212 kcal“ (Label über dem Ring) Reveal: Opacity + `translateY 8 -> 0` (`settle`), bleibt 1800 ms, Exit `exit(base)=182` nach oben fade.
  - Mittelzahl rollt (3.3) zum neuen „übrig“-Wert, Digit-Glow orange (`bonus`) statt mint.
- Haptik: Impact medium + 120 ms später Impact soft (siehe 4).
- **RM:** Bonus-Segment sofort sichtbar, Label statisch 1800 ms, keine Funken.

### 3.2 Mahlzeit gespeichert – Zahl „fliegt“ in den Ring

- Auslöser: Save in `food-review` (Sheet schließt, Today ist sichtbar). Braucht Übergabe der Kcal-Zahl + Startposition über einen kleinen Store (`mealFlightStore`: `{ kcal, fromRect }`), da Sheet und Ring in verschiedenen Screens liegen.
- Ablauf (Gesamt ~850 ms, Start nach Sheet-Dismiss, `delay 120`):
  - t=0: Chip „+520“ (Pill, `accent` 16 % Hintergrund, Text `label`, 15 pt semibold) erscheint am Fußende der Mahlzeitenliste (neue Zeile) mit Scale 0.8 -> 1 (`bouncy`, 240 ms).
  - t=180–620: Chip bewegt sich auf einer Bezier-Kurve zum Ring-Mittelpunkt (Control-Punkt 40 pt oberhalb der Mitte der Strecke → leichter Bogen, Glut steigt nach oben). Position über `useAnimatedStyle` (translateX linear `kindle`, translateY mit separatem Bogen-Offset `sin(π·p)·-28`). Dabei Scale 1 -> 0.6, Opacity 1 -> 0.85.
  - t=620: Chip verschwindet im Ring (Opacity 0 in 90 ms); gleichzeitig startet Ring-Wertänderung (3.1b) und Zahlenroll (3.3).
  - t=640: Ring-Puls (3.1b).
- **Fallback, falls Rect unbekannt:** Chip faded direkt über dem Ring ein (`kindle`, base) und wird eingesogen (Scale 1 -> 0.6, Opacity -> 0, 260 ms).
- **RM:** kein Flug. Ring + Zahl wechseln direkt, die neue Mahlzeitenzeile bekommt 600 ms lang `accent`-Hintergrund 12 % (Fade-out) als Bestätigung.

### 3.3 Zahlen: Count-up und Roll-Ziffern (`RollingNumber`)

Zwei Modi, ein Token-Satz:

**Modus `roll` (Today, Ring-Mitte, Makros, Gewicht):** Odometer-Ziffern.

- Jede Ziffernstelle ist ein vertikaler Streifen 0–9 (Höhe = lineHeight, `overflow: hidden`), per `translateY = -digit * lineHeight` positioniert. Aktive Ziffer wechselt: `withSpring(target, spring.settle)` (bei Δ ≤ 9 Stellen) bzw. `withTiming(slow, ember)` (große Sprünge, damit nicht wild geschleudert wird).
- Rechts nach links Stagger: niedrigste Stelle zuerst (`stagger.tight` 30 ms * Index von rechts) → wirkt wie mechanisches Zählwerk.
- Beim Wertzuwachs: Ziffern laufen **nach oben** (neue Zahl kommt von unten), beim Abnehmen nach unten.
- Neue Stellen (99 -> 100): neue Spalte wächst `width 0 -> w` (`settle`), Rest rückt (`LinearTransition`/animated `width`).
- Tabular-Nums verpflichtend (`fontVariant: ['tabular-nums']`) damit Breite stabil bleibt.
- Afterglow: Farbe der geänderten Ziffern `accent` (bei Bonus `bonus`, bei Überschreitung `danger`) dann zurück zu Textfarbe mit `glow.decay 600`.

**Modus `count` (Onboarding-Result, Summary, große einmalige Werte):** Wert interpoliert linear im UI-Thread.

- `useSharedValue(from)` -> `withTiming(to, { duration: slow..hero, easing: ember })`.
- Text via `useAnimatedProps({ text })` auf `TextInput`-Trick (`editable={false}`) oder Skia `Text` mit `useDerivedValue(() => format(sv.value))` — **kein setState pro Frame**.
- Rundung im Worklet (`Math.round`), Formatierung (Tausendertrenner) per vorberechneter Funktion, die als Worklet markiert ist (`'worklet'`), oder `Intl` nicht im Worklet verfügbar → manuell `toString` + Gruppierung.

**RM (beide):** Zahl springt direkt, nur die Farbe des Afterglow bleibt (300 ms Fade).

### 3.4 Tagesziel erreicht

Definition (Abstimmung mit Domain/UX nötig): Kcal innerhalb des Zielkorridors UND Tag abgeschlossen oder Protein-Ziel erreicht — Trigger-Regel liegt bei UX/Gamification; hier nur die Inszenierung (**Stufe Funkenflug**, max. 1x pro Tag).

- Ablauf (1600 ms):
  - t=0: Ring-Füllung auf 100 % abgeschlossen (3.1b).
  - t=0: Haptik-Doppelpuls (siehe 4).
  - t=100: Ring „zündet“: Glow-Opacity 0 -> 0.7 in 180 (`kindle`), dann decay -> 0.2 in 900 (`ember`); Strichstärke 20 -> 24 -> 20 (`bouncy`).
  - t=150: Funkenflug (6.2): 28 Partikel aus dem Ring-Kopf-Punkt, Radius 2–4 pt, Aufstieg 80–160 pt, Lebensdauer 900–1300 ms, Farbe Mischung `accent` / Gold-Funke (`#F5C26B`-Richtung, Visual Designer final).
  - t=200: Mittelzahl rollt zu „0 übrig“ → Label tauscht in „Ziel erreicht“ (Crossfade `base`, Check-SF-Symbol `checkmark.circle.fill` poppt `bouncy` scale 0.4 -> 1).
  - t=1600: alles beruhigt sich, Ring bleibt im Idle-Glimmen mit leicht höherem Glow-Baseline (0.28) bis Tagesende.
- **RM:** Check erscheint per Fade (`fast`), keine Partikel, Glow statisch.

### 3.5 Streak-Meilenstein

Meilensteine: 3, 7, 14, 30, 50, 100, 200, 365 Tage (Werte final bei UX). Normale Streak-Tage (kein Meilenstein): nur kleiner Zähler-Roll, **keine** Feier.

- Darstellung: Sheet-/Overlay-Moment (`FULL_SHEET`-unabhängig, kleines Overlay über Today, Dauer 2400 ms oder bis Tap).
- Ablauf:
  - t=0: Backdrop dimmt 0 -> 0.45 (`base`).
  - t=60: Flammen-/Glut-Symbol (Illustration/Mark – Platzhalter SF Symbol `flame.fill`, 96 pt) skaliert 0.3 -> 1 (`bouncy`) und steigt 12 pt auf; Glow dahinter pulsiert einmal (opacity 0 -> 0.8 -> 0.35).
  - t=240: Zahl „7“ rollt hoch von 0 (Modus `roll`, Stagger von rechts), Label „Tage in Folge“ Reveal.
  - t=300–1700: Funkenflug (Stärke abhängig vom Meilenstein: 3/7: 16 Partikel; 14/30: 28; ≥ 50: 48 + zweite Welle bei t=700).
  - t=2400: Exit `exit(base)=182`: Opacity 0, Scale 0.96, Backdrop zurück.
- **RM:** Overlay erscheint per Fade `fast`, Zahl statisch, keine Partikel, Overlay-Dauer 1800 ms.

### 3.6 Workout: Satz abgehakt

Kontext `app/workout/active.tsx`; Häufigstes Ereignis, daher **Stufe Aufflammen**, muss super schnell sein (Training mit schwitzigen Händen, kein Wait).

- Ablauf (320 ms):
  - t=0: Checkmark-Kreis füllt sich: Hintergrund `accent` Scale 0 -> 1 (`tap` spring, 160 ms), Check-Pfad zeichnet sich (Skia/SVG-Stroke `end 0 -> 1`, 140 ms, `kindle`), 40 ms Delay.
  - t=0: Zeile pulsiert: Hintergrund-Highlight `accent` 14 % -> 0 (`glow.decay` 600 ms).
  - t=0: Gewicht×Wiederholungen-Text bekommt Gewicht 600 -> 700 nur visuell (Farbwechsel `secondaryLabel` -> `label`, `fast`).
  - Falls Rest-Timer startet: Timer-Pille gleitet von unten ein (Reveal `settle`, rise 8).
- Satz zurücknehmen (Undo): `exit(fast)=104` ms Fade-Out des Checks, kein Spring, Haptik nur selection.
- **RM:** Check + Farbwechsel sofort (kein Pfadzeichnen), Highlight statisch 300 ms.

### 3.7 Workout fertig – Summary-Feier

- Auslöser: `finishActiveWorkout` -> Summary-Screen/Sheet.
- Ablauf (Gesamt ~2200 ms, gestaffelt):
  - t=0: Sheet kommt nativ; Inhalt startet nach Sheet-Settle (+120 ms Delay), damit nicht gegen die Systemanimation gearbeitet wird.
  - t=120: Headline („Stark.“ o. Ä., Copy bei Brand Strategist) Reveal `kindle` base, rise 8.
  - t=260: Kennzahlen-Karten (Dauer, Volumen kg, Sätze, kcal) mit `staggerWide` (90): jede `Reveal` + Zahl im Modus `count` (`slow 520`, `ember`), Volumen-Zahl zuletzt (längster Count 900).
  - t=800: Wenn Bonus-kcal entstehen: Orange Bonus-Chip „+310 kcal erlaubt“ poppt (`bouncy`), Funken ×8 (`bonus`).
  - t=1100: Falls PR(s) enthalten: PR-Zeilen ploppen nacheinander (3.8).
  - t=1400: CTA „Fertig“ (GlassActionButton) Reveal `settle`.
- **Funkenflug nur, wenn** Workout mindestens 1 Satz hatte; sonst nur ruhiger Eintritt.
- **RM:** Karten per Fade-Cascade 40 ms Stagger, Zahlen statisch, keine Funken.

### 3.8 PR (Personal Record)

Höchste Feierstufe im Training, aber bewusst kompakt (Satz-Ebene live, Zusammenfassung am Ende).

- **Live (beim Abhaken des Satzes):**
  - Check-Moment (3.6) wird ersetzt durch „Glut-Check“: Kreis in `bonus`-Orange -> Gold-Verlauf, Scale 0 -> 1.18 -> 1 (`bouncy`), Ring-Glow um den Kreis (r +10, opacity 0.6 -> 0, 700 ms), 10 Funken radial (nicht aufsteigend, Radius 28–46 pt, 500 ms).
  - Badge „PR“ (Pille) rutscht rechts neben den Satz: `scaleX 0.6 -> 1`, `opacity`, `bouncy`, bleibt dauerhaft in der Satzzeile.
- **Summary:** PR-Medaille (Illustration des Mark-Designers; Platzhalter SF Symbol `trophy.fill`) landet mit `heavy` spring (translateY -28 -> 0, scale 1.25 -> 1), beim Aufsetzen: Schockring (Kreis r 24 -> 80, Opacity 0.5 -> 0, 500 ms `kindle`) + 14 Funken. Wert-Differenz (+2.5 kg) rollt (`roll`).
- Haptik: Heavy-Impact + Success (siehe 4).
- **RM:** Badge Fade, Medaille statisch mit Fade, keine Ringe/Funken.

### 3.9 Gewicht geloggt

Ruhig (Gewicht ist emotional neutral; kein Konfetti bei Zunahme!). Stufe Aufflammen, in neutraler Farbe.

- Ablauf (700 ms):
  - Sheet schließt (nativ). Im Insights-/Verlauf-Chart:
  - t=0: neuer Datenpunkt „tropft ein“: Kreis r 0 -> 6 (`settle`), Linie verlängert sich vom letzten Punkt (Trim `end` letztes Segment, `slow 520`, `ember`).
  - t=200: Wert-Label rollt zum neuen Gewicht (`roll`).
  - t=300: Delta-Chip (z. B. „−0,4 kg“): Farbe neutral `secondaryLabel`; **keine** Rot/Grün-Wertung bei Zunahme/Abnahme (zielabhängig, UX). Reveal `fast`.
  - Optional bei Trend zum Ziel: der Trendlinien-Endpunkt bekommt einmal Glow-Puls (opacity 0 -> 0.4 -> 0, 700).
- **RM:** Punkt + Label erscheinen sofort, Delta-Chip Fade.

### 3.10 KI-Analyse läuft – Markenträger statt Spinner (`GlutLoader`)

Konzept: **„Es glüht“.** Ein Skia-Element: kleiner Glutkern (Radialverlauf `accent` -> `bonus` -> transparent), der atmet und dessen Rand von einem dünnen rotierenden Bogen umkreist wird; aufsteigende Mini-Funken.

- Layer (Größe 96 pt für Inline, 160 pt für Vollbild-Analyse):
  1. **Kern-Glow:** Kreis r = 0.32·size, `RadialGradient` (center → edge: `accent` 0.9 → `accent` 0.0). Atmen: Radius-Scale 0.92 <-> 1.08, Periode 1800 ms, `smooth`, `withRepeat(-1, reverse)`.
  2. **Orbit-Bogen:** Pfad-Kreis r = 0.42·size, sichtbarer Bogen 90° (trim `start 0, end 0.25`), Rotation 360° in 1600 ms linear, `StrokeCap round`, StrokeWidth 3, Farbe `accent`, Schweif per `SweepGradient`.
  3. **Funken:** 3–5 gleichzeitige Partikel, Spawn alle 380 ms am Kern, steigen 40–64 pt auf, Lebensdauer 1200 ms, Opacity 0.8 -> 0, Größe 2 -> 1 pt.
- Textphasen (Status unter dem Loader, Crossfade `fast`, alle 2,2 s): „Ich schaue hin …“ → „Zutaten erkennen …“ → „Kalorien rechnen …“ (Copy: Brand Strategist). Letzter Text bleibt stehen bis Ergebnis.
- Ergebnis kommt: Loader „verglüht“ in 260 ms (Scale 1 -> 1.15, Opacity -> 0, `cool`), Ergebnisliste Reveal mit `staggerBase`; Haptik Success.
- Fehler: Glow wechselt in `secondaryLabel`/gedimmt (Opacity 0.35, 300 ms), Orbit stoppt, kein Rot-Schreien; Haptik Warning (nicht Error).
- Nach 8 s zusätzlich „Dauert etwas länger …“ (Text-Crossfade), keine Beschleunigung der Animation.
- **RM:** Kein Orbit, keine Funken; nur Kern-Glow, der in Opacity 0.55 <-> 1.0 langsam (2400 ms, ohne Skalierung) atmet — oder noch strenger bei aktivem System-RM: statisches Symbol (`sparkles` SF Symbol) + Textphasen.

### 3.11 Onboarding-Result: Projektionskurve zeichnet sich

Bestand: `WeightProjectionChart`, Linie `end` 0 -> 1 in 900 ms nach 150 ms Delay. Upgrade:

- t=0: Achsen/Baseline Fade `fast`.
- t=150: Linie zeichnet sich mit `hero 900`, `kindle`. **Zusatz:** Kopf-Punkt (r 5) folgt der Linienspitze, Glow-Halo r 12, Opacity 0.35.
- Gradient-Fläche unter der Kurve: Opacity folgt `progress` (0 -> 0.22), dadurch „füllt sich der Bereich mit Wärme“.
- t=1050: Ziel-Punkt (Zielgewicht) „zündet“: Scale 0 -> 1 (`bouncy`), Halo-Puls (r 12 -> 26, Opacity 0.5 -> 0, 700 ms). Zielgewicht-Label rollt (`count`, `slow`).
- t=1250: Datums-Chip („ca. 14. Jan“) Reveal `settle`, Haptik Success (einmalig, schon in `calculating` genutzt – hier nur Soft-Impact zum Zeitpunkt „Ziel zündet“, damit nicht doppelt Success).
- **RM:** Kurve komplett sichtbar, Zielpunkt ohne Puls.

### 3.12 Pull-to-Refresh

Nativ `RefreshControl` bleibt (Hard Rule #1; Systemgefühl). Ergänzungen:

- Haptik: Nativ gibt iOS selbst ein Tick-Feedback beim Auslösen; **wir fügen keins hinzu**.
- Nach Abschluss mit Datenänderung: betroffene Zahlen laufen über `roll` (nur wenn Wert sich geändert hat), keine Gesamt-Reveal-Animation.
- Zeitstempel „Aktualisiert 14:32“ Crossfade `fast`.
- **RM:** unverändert nativ.

### 3.13 Sheet öffnen/schließen

Sheets sind native `formSheet` → **Systemanimation bleibt unangetastet**.

- Inhalt: Erst-Reveal des Sheet-Inhalts nur bei Sheets mit Listen/Kennzahlen, **nicht** bei Formularen (Formular wirkt sofort bereit). Reveal-Delay 80 ms nach Present (damit das Sheet schon sitzt), Stagger `tight` 30.
- Dismiss per Swipe: nichts zusätzlich. Dismiss per Button: Haptik Soft-Impact bei Tap, sonst nichts.
- Detent-Wechsel (0.75 -> 1): selection-Haptik wird vom System geliefert, nicht duplizieren.
- Workout-Fullscreen-Modal (`fullScreenModal`): Eintritt nativ; Inhalte starten sofort ohne Reveal (Zeit ist beim Training Gold).

### 3.14 Tab-Wechsel

`NativeTabs` → System-Haptik/-Animation bleibt. Wir ergänzen:

- Beim Tab-Fokus **kein** komplettes Neu-Reveal. Nur bei Erstbesuch pro App-Start spielen die Inhalte ihren Reveal (Flag pro Tab).
- Re-Tap des aktiven Tabs (Scroll-to-top): kein Extra.
- Ring-Re-Entry: Wenn Today wieder fokussiert wird und sich Daten geändert haben (z. B. im Hintergrund Health-Import), läuft Ring-Delta (3.1b/d), sonst nichts.

### 3.15 Skeleton / Loading

- Skeleton-Blöcke: Hintergrund `fill` mit **Wärme-Shimmer**: ein diagonaler Lichtstreifen (Breite 40 % der Blockbreite, `accent` Opacity 0.0 -> 0.10 -> 0.0, Winkel 20°) wandert in 1400 ms (`smooth`) von links nach rechts, Pause 400 ms, Loop. Alle Skeletons auf dem Screen teilen **eine** `useSharedValue`-Phase (Synchronität, ein Worklet).
- Skeleton → Content: Crossfade `base`, Content hat rise 4 (kleiner als Reveal).
- Mindestanzeigedauer: 250 ms (verhindert Flackern); Skeleton erscheint erst nach 150 ms Verzögerung (schnelle Ladungen zeigen nie ein Skeleton).
- **RM:** Kein Shimmer; statische Blöcke mit Opacity-Atmen 0.5 <-> 0.7 in 2000 ms, sonst bei RM komplett statisch (Opacity 0.6).

### 3.16 Empty-State-Idle-Animationen

Prinzip: **Glimmen**, nie Springen. Leerer Zustand soll einladen, nicht nerven.

- Today ohne Mahlzeiten: Ring leer, Kopf-Punkt am Startpunkt (12 Uhr) „glimmt“ (Opacity 0.4 <-> 1.0, Periode 3200, `smooth`). Darunter Hinweis; der „Add meal“-Button hat alle 12 s ein einmaliges Aufglimmen (Glow-Overlay 0 -> 0.25 -> 0 in 900 ms), nur wenn Screen 6 s ohne Touch.
- Leere Liste (Training/Verlauf): Illustration (Mark-Designer) mit Idle: sanftes Aufsteigen eines einzelnen Funkens alle 4 s (Lebensdauer 2000 ms, 30 pt Aufstieg, Opacity 0.6 -> 0). Max. ein Partikel.
- Alle Idle-Loops pausieren, wenn: Screen nicht fokussiert (`useIsFocused`), App im Hintergrund, Low-Power-Mode (Abschnitt 7).
- **RM:** Alles statisch.

---

## 4. Haptik-Choreografie

### 4.1 Grundprinzipien

- **Haptik bestätigt, sie dekoriert nicht.** Jede Haptik hat einen Anlass (Aktion abgeschlossen, Wert verändert, Grenze).
- Pro Nutzeraktion **höchstens ein Haptik-Ereignis** (Muster zählt als eines). Ausnahme: Muster aus der Tabelle.
- Visuelle Stufen (Glimmen / Aufflammen / Funkenflug) ≈ Haptik-Stufen (nichts / leicht / Muster).
- Reihenfolge auf Zeitachse: Haptik **~0–30 ms vor** dem visuellen Peak (Haptik wird früher wahrgenommen).
- Native Komponenten (NativeTabs, Picker, DatePicker, Sheet-Detents, Toggle, Pull-to-Refresh) liefern ihre Haptik selbst → **nicht doppeln**.

### 4.2 Zentraler Wrapper `src/lib/haptics.ts`

- `haptic(event: HapticEvent)` ist die einzige Stelle, die `expo-haptics` importiert. Alle 34 bestehenden Direktaufrufe werden darauf migriert.
- Prüft: Settings-Toggle (MMKV `haptics:enabled`, Default `true`), Plattform (iOS), Rate-Limit, Low-Power-Mode-Flag.
- Fire-and-forget: `void`, Fehler schlucken (try/catch), nie `await` in UI-Pfaden.

### 4.3 Regeln (Spam-Schutz)

| Regel                                                 | Wert                                                                                                                                           |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Globales Mindestintervall zwischen zwei Einzelhaptiks | 40 ms                                                                                                                                          |
| Selection-Haptik beim Scrubbing/Picker/Stepper        | max. 1 pro 60 ms (≈ 16/s), bei Drag nur auf Wertänderung                                                                                       |
| Gleiche Event-ID innerhalb 250 ms                     | verworfen (Debounce, z. B. Doppeltap)                                                                                                          |
| Muster (mehrere Pulse)                                | laufen exklusiv; während ein Muster läuft, werden Einzel-Events mit Priorität < Muster verworfen                                               |
| Prioritäten                                           | `milestone` (3) > `reward` (2) > `confirm` (1) > `ui` (0)                                                                                      |
| Timer-/Loop-Haptik                                    | max. 1x pro Sekunde, nie im Hintergrund                                                                                                        |
| Settings-Toggle „Haptik“                              | Profil -> Einstellungen: Schalter (Default an). Aus = alle `haptic()` No-Op.                                                                   |
| Reduce Motion                                         | beeinflusst Haptik **nicht** (eigener Schalter); Systemeinstellung „System Haptics“ von iOS wird respektiert (iOS ignoriert Calls automatisch) |
| Low-Power-Mode                                        | Muster mit ≥ 3 Pulsen werden auf den ersten Puls reduziert                                                                                     |
| Fehler-Haptik                                         | `Error` nur bei harter Blockade (z. B. Netzwerk-Speichern endgültig gescheitert); sonst `Warning`                                              |

### 4.4 Ereignis-Mapping (≥ 25)

Legende: **I**=`impactAsync(style)`, **N**=`notificationAsync(type)`, **S**=`selectionAsync()`. Zeiten relativ zum Ereignis (t=0). Priorität: ui/confirm/reward/milestone.

| #   | Ereignis                                                 | Haptik                         | Zeiten                              | Prio      | Bemerkung                                                                             |
| --- | -------------------------------------------------------- | ------------------------------ | ----------------------------------- | --------- | ------------------------------------------------------------------------------------- |
| 1   | Button-Tap (Standard, Glass-CTA „Add meal“)              | I Medium                       | t=0                                 | ui        | Bestand `GlassActionButton`                                                           |
| 2   | Sekundär-/Text-Button, Chip-Tap                          | I Light                        | t=0                                 | ui        |                                                                                       |
| 3   | OptionCard / Segment / Single-Choice wählen              | S                              | t=0                                 | ui        | Bestand                                                                               |
| 4   | Toggle ein/aus (eigene, nicht native)                    | I Soft                         | t=0                                 | ui        | Native Switch liefert System-Haptik, nicht doppeln                                    |
| 5   | Stepper/Picker-Wertwechsel, Scrubbing                    | S                              | pro Schritt, ≥ 60 ms Abstand        | ui        |                                                                                       |
| 6   | Mahlzeit gespeichert                                     | N Success                      | t=0                                 | confirm   | Bestand food-review                                                                   |
| 7   | Mahlzeit per One-Tap-Quick-Log gespeichert               | I Medium -> I Soft             | t=0, t=90                           | confirm   | „Klick-Einrasten“                                                                     |
| 8   | Mahlzeit gelöscht                                        | I Rigid (gedämpft)             | t=0                                 | confirm   | kein Success; Rigid kurz = „weg“                                                      |
| 9   | Barcode erkannt                                          | I Medium                       | t=0                                 | confirm   | Scanner                                                                               |
| 10  | Barcode nicht gefunden                                   | N Warning                      | t=0                                 | confirm   |                                                                                       |
| 11  | KI-Analyse startet                                       | I Light                        | t=0                                 | ui        | Beim Tap auf „Analysieren“                                                            |
| 12  | KI-Analyse fertig                                        | N Success                      | t=0                                 | confirm   | Zeitgleich mit „Verglühen“ des Loaders                                                |
| 13  | KI-Analyse Fehler                                        | N Warning                      | t=0                                 | confirm   | nicht Error                                                                           |
| 14  | Kalorienring Wertänderung (nur wenn Δ ≥ 3 % Limit)       | I Soft                         | am Ende der Füllung                 | confirm   | max. 1 pro Speichern, ersetzt nicht Nr. 6 (wird verworfen, wenn Nr. 6 < 400 ms zuvor) |
| 15  | Workout-Bonus kommt dazu                                 | I Medium -> I Soft             | t=0, t=120                          | reward    |                                                                                       |
| 16  | Limit überschritten (einmalig/Tag)                       | N Warning                      | t=0                                 | confirm   |                                                                                       |
| 17  | Tagesziel erreicht                                       | I Medium -> I Heavy            | t=0, t=110                          | milestone | Doppelpuls (Anschlag + Nachhall)                                                      |
| 18  | Streak-Meilenstein                                       | I Light -> I Medium -> I Heavy | t=0, 90, 190                        | milestone | Aufbauendes Crescendo                                                                 |
| 19  | Streak-Tag ohne Meilenstein                              | –                              | –                                   | –         | bewusst keine Haptik                                                                  |
| 20  | Workout starten                                          | I Medium                       | t=0                                 | confirm   | Bestand `active.tsx:563`                                                              |
| 21  | Satz abgehakt                                            | I Light -> S                   | t=0, t=60                           | confirm   | „Tick-Klick“                                                                          |
| 22  | Satz abgehakt (PR)                                       | I Heavy -> N Success           | t=0, t=140                          | reward    |                                                                                       |
| 23  | Satz zurückgenommen                                      | I Soft                         | t=0                                 | ui        |                                                                                       |
| 24  | Satz hinzufügen / Übung hinzufügen                       | I Light                        | t=0                                 | ui        |                                                                                       |
| 25  | Rest-Timer abgelaufen (App im Vordergrund)               | N Success                      | t=0                                 | confirm   | Bestand `active.tsx:196`; zusätzlich Local Notification im Hintergrund (nicht Haptik) |
| 26  | Rest-Timer: letzte 3 Sekunden                            | S                              | t=-3000, -2000, -1000               | ui        | optional, schaltbar „Countdown-Haptik“ (Default aus)                                  |
| 27  | Workout fertig (Summary erscheint)                       | I Medium -> N Success          | t=0, t=180                          | reward    |                                                                                       |
| 28  | PR in Summary landet                                     | I Heavy                        | t=0 (Medaille-Aufsetzen, ca. t=520) | milestone | max. 1x pro Summary, auch bei mehreren PRs                                            |
| 29  | Gewicht geloggt                                          | I Soft                         | t=0                                 | confirm   | bewusst ruhig, kein Success                                                           |
| 30  | Onboarding: Berechnung Schritt                           | I Light                        | pro Schritt                         | ui        | Bestand `calculating`                                                                 |
| 31  | Onboarding: Result angezeigt / Ziel „zündet“             | N Success (einmal)             | t=0                                 | reward    | Bestand `calculating`; Zielpunkt-Puls (3.11) nur I Soft                               |
| 32  | Onboarding: Weiter (primärer CTA)                        | I Light                        | t=0                                 | ui        |                                                                                       |
| 33  | Löschen bestätigen (destruktiver Dialog)                 | N Warning                      | beim Öffnen                         | confirm   | nativ Alert liefert eigenes → nur bei eigenen Sheets                                  |
| 34  | Account angelegt / Paywall gekauft                       | N Success                      | t=0                                 | reward    | Käufe: RevenueCat-Callback                                                            |
| 35  | Fehlerhafte Eingabe (Validierung)                        | N Error                        | t=0                                 | confirm   | nur bei Submit-Versuch, nicht beim Tippen                                             |
| 36  | Pull-to-Refresh                                          | –                              | –                                   | –         | System liefert                                                                        |
| 37  | Tab-Wechsel / Sheet-Detents / Sheet-Dismiss              | –                              | –                                   | –         | System liefert                                                                        |
| 38  | Favorit setzen (Stern)                                   | I Light -> S                   | t=0, 70                             | ui        |                                                                                       |
| 39  | Health-Sync fertig (Import neuer Workouts)               | –                              | –                                   | –         | Hintergrundereignis → keine Haptik                                                    |
| 40  | Schieberegler (Gewicht/Dauer) Rasten bei „runden“ Werten | S                              | beim Einrasten                      | ui        | @expo/ui Slider liefert evtl. selbst, prüfen                                          |

### 4.5 API-Entwurf der Muster

```ts
type HapticEvent =
  | 'tap'
  | 'tapLight'
  | 'select'
  | 'toggle'
  | 'mealSaved'
  | 'mealQuickSaved'
  | 'mealDeleted'
  | 'scanHit'
  | 'scanMiss'
  | 'aiStart'
  | 'aiDone'
  | 'aiFail'
  | 'ringChanged'
  | 'bonusGained'
  | 'limitExceeded'
  | 'goalReached'
  | 'streakMilestone'
  | 'workoutStart'
  | 'setDone'
  | 'setDonePR'
  | 'setUndone'
  | 'restDone'
  | 'workoutFinished'
  | 'prLanded'
  | 'weightLogged'
  | 'onboardStep'
  | 'onboardResult'
  | 'validationError'
  | 'purchaseSuccess';
```

Muster als Tabelle `{ event: [{ at: 0, kind: 'impact', style: 'medium' }, { at: 110, … }], priority }`. Ausführung mit `setTimeout` (JS-Timer reicht: Haptik-Timing ±15 ms ist nicht wahrnehmbar), Timer-IDs merken, bei neuem höherpriorem Muster alte Timer löschen.

---

## 5. Sound (optional)

**Empfehlung: Ja, aber standardmäßig aus (Opt-in „Töne“ in den Einstellungen), und nur in drei Momenten.**

Begründung:

- Vorteil: Akustischer Anker für Marke und Belohnung (PR, Tagesziel), hilft beim Training (Rest-Timer-Ende, wenn Phone auf der Bank liegt).
- Nachteil: Fitnessstudio-Kontext, Kopfhörer/Musik laufen, soziale Peinlichkeit; zusätzliche Dependency (`expo-audio`), Assets pflegen. Daher: Opt-in, folgt dem iOS-Stummschalter (`playsInSilentMode: false`), mischt mit anderer Audio (`interruptionMode: 'mixWithOthers'`), Lautstärke leise (−18 LUFS-ish, Peak ≤ −6 dBFS).

Drei Mikro-Sounds (je < 700 ms, Mono/Stereo 44.1 kHz, `.m4a` oder `.caf`, < 30 KB):

1. **„Anfachen“ (Mahlzeit gespeichert / Satz abgehakt):** 120 ms, weicher, tiefer „Wump“ wie ein Holzscheit, das im Ofen einrastet + kurzes feines Knistern (2 hochfrequente Klicks bei 30 ms und 70 ms). Tonhöhe ~ 180 Hz Basis. Sehr leise.
2. **„Aufglimmen“ (Tagesziel erreicht / Streak):** 600 ms, zwei aufsteigende warme Sinus-/Glasharfen-Töne (Quint, z. B. G4 -> D5), Attack 8 ms, Release 450 ms, leichter Hall, darüber 3–4 hohe Funken-Pings. Wärmer als Standard-„Ding“.
3. **„Glut-Glocke“ (PR / Rest-Timer vorbei):** 700 ms, sehr kurzer metallischer Anschlag (Triangel/Kupferschale) mit weichem Nachklang, ein einzelner Ton ~ 880 Hz, Decay 600 ms. Funktioniert auch als Erinnerung bei Rest-Timer-Ende (zusätzlich zur Haptik).

Technik: `expo-audio` `createAudioPlayer` pro Sound vorladen (Pool 1 Instanz), `seekTo(0)` + `play()`. Nur im Vordergrund. Keine Sounds bei Reduce Motion nötig (RM betrifft Bewegung), aber global über Toggle.

---

## 6. Skia-/Shader-Ideen mit Machbarkeit

Legende: Aufwand S (≤ 0,5 Tag) / M (1–2 Tage) / L (3+ Tage); Perf-Risiko niedrig/mittel/hoch (auf iPhone 15, 60/120 Hz, ProMotion).

### 6.1 Übersicht

| #   | Idee                                                                                                                                                                                             | Aufwand | Perf-Risiko                                                                                                                                                    | Reduced-Motion-Fallback              | Priorität |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | --------- |
| 1   | **Ring-Kopf-Punkt + Glow** (BlurMask/`Blur` Filter um den Fill-Pfad + Kopf-Circle)                                                                                                               | S       | niedrig (ein Blur, statische Größe; Blur nur während Animation aktiv, danach gecachtes Layer via `<Group layer>`)                                              | statischer Glow, kein Loop           | P0        |
| 2   | **Funkenflug-Partikel** (CPU-simulierte Partikel in Reanimated-Worklet, Draw per `Atlas` oder `Circle` ×N, N ≤ 48)                                                                               | M       | mittel (Atlas: gut; Einzel-Circles bis 48 ok)                                                                                                                  | keine Partikel, nur Glow             | P0        |
| 3   | **GlutLoader** (Radial-Gradient + rotierender Pfad + 3–5 Funken)                                                                                                                                 | M       | niedrig                                                                                                                                                        | statisches Symbol                    | P0        |
| 4   | **Flüssiger Ring** (Füllende wellt leicht: Sinus-Verformung des Kopfes bzw. „Hitzeflimmern“ per Pfad mit 2 Kontrollpunkten)                                                                      | M       | mittel                                                                                                                                                         | Gerade Linie                         | P2        |
| 5   | **Ring-Verlauf mit Glut-Gradient** (`SweepGradient` entlang des Rings: dunkler Anfang -> hell am Kopf; dreht mit Füllung)                                                                        | S       | niedrig                                                                                                                                                        | derselbe Gradient statisch           | P0        |
| 6   | **Generativer Hintergrund „Glut-Grain“** (SkSL-Shader: weiches Rauschen, 2 Octaves Simplex, extrem langsame Zeit 0.03/s, Opacity 4–6 %, Farbe `accent`/`bonus`) für Today-Hero-Fläche/Onboarding | M       | mittel (Fragment-Shader Fullscreen; auf Hero-Bereich begrenzen ≤ 390×300, Auflösung halbieren per `<Group transform scale 2>`)                                 | statisches Einzelbild (Zeit fixiert) | P2        |
| 7   | **Hitzeflimmern bei Zielerreichung** (kurzer Distortion-Shader über Zahl/Ring: `RuntimeShader` mit Sinus-Offset, 500 ms)                                                                         | M–L     | mittel-hoch (Shader auf Image-Filter benötigt Layer/Snapshot)                                                                                                  | entfällt                             | P3        |
| 8   | **Zahlen als Skia-Text** (`RollingNumber` in Canvas statt RN-Text; ermöglicht Glow auf Ziffern)                                                                                                  | M       | niedrig (aber Font-Laden: `useFont` mit System-/Custom-Font; **Dynamic-Type/VoiceOver** geht verloren → nur dekorativ + versteckter RN-Text für Accessibility) | RN-Text                              | P2        |
| 9   | **Chart-Draw-on mit Kopf** (`WeightProjectionChart`, `WeightTrendChart`)                                                                                                                         | S       | niedrig                                                                                                                                                        | statisch                             | P1        |
| 10  | **Konfetti-frei: aufsteigende „Asche“-Partikel als Dauer-Ambient im Streak-Overlay**                                                                                                             | S       | niedrig (wenn Teil von #2)                                                                                                                                     | entfällt                             | P2        |
| 11  | **Mesh-/Glow-Hintergrund für Streak-/PR-Overlays** (2–3 weiche Radial-Gradients, die langsam driften, Opacity 0.35)                                                                              | S       | niedrig                                                                                                                                                        | statisch                             | P1        |
| 12  | **Makro-Balken mit Glut-Füllung** (Gradient + Kopf-Punkt wie Ring, `MacroBar`)                                                                                                                   | S       | niedrig                                                                                                                                                        | statisch                             | P1        |

### 6.2 Partikel-Spezifikation „Funkenflug“ (1:1 codierbar)

```ts
// Pro Partikel (zum Spawn im Worklet/JS zufällig, danach deterministisch pro Frame):
type Spark = {
  x0: number;
  y0: number; // Startpunkt (Ring-Kopf / Bonus-Übergang)
  vx: number; // px/s, uniform(-18, 18)
  vy: number; // px/s, uniform(-120, -60)  // nach oben (negativ y)
  drag: number; // 1/s, uniform(1.1, 1.8)    // Luftwiderstand: v *= exp(-drag·t)
  life: number; // ms, uniform(900, 1300)
  r0: number;
  r1: number; // Radius 3→0.8 pt
  hue: 'accent' | 'bonus' | 'gold';
};
// Position bei Zeit t (s), geschlossene Form, kein Integrieren pro Frame nötig:
//   k = 1 - exp(-drag·t) / drag
//   x = x0 + vx · k ;  y = y0 + vy · k + 8·t²  (leichte Auftriebs-Abschwächung)
// Alpha: p = t/life;  alpha = (1 - p)^1.4 · min(1, p/0.08)   // 8 % Fade-in, dann Fade-out
// Flackern: alpha *= 0.85 + 0.15·sin(t·38 + seed)
```

- Rendering: ein `Canvas`, `Group` mit `blendMode="plus"` (additiv, glüht), Partikel als `Circle` mit `BlurMask blur=2`. Bei > 24 Partikeln `Atlas` mit vorgerendertem 16×16-Glow-Sprite (`Skia.Surface` -> Image) nutzen.
- Zeitbasis: `useFrameCallback` (Reanimated) bzw. `useClock()` (Skia) → ein SharedValue `time`, alle Partikelpositionen als `useDerivedValue` aus `time`. Canvas wird nach `maxLife + 100 ms` unmounted (kein Dauer-Canvas).
- Canvas-Größe nur so groß wie nötig (Ring-Bounds + 160 pt oben), `pointerEvents="none"`.
- Budgets: ≤ 48 Partikel, ≤ 1 aktive Partikel-Canvas gleichzeitig (Queue).

### 6.3 Glow-Spezifikation

- Ring-Glow: zweite Kopie des Fill-Pfads, `strokeWidth 20 + 14`, `Blur` Sigma 10, Opacity 0.18 (Idle) bis 0.7 (Peak). Nicht pro Frame neu bauen: Blur-Filter einmal erzeugen, nur `opacity` animieren (billig).
- Fallback bei Low-Power: Glow Blur Sigma 5, keine Animation der Sigma.

---

## 7. Performance- & Accessibility-Regeln

### 7.1 Performance

1. **UI-Thread zuerst:** Alle fortlaufenden Animationen über Reanimated `SharedValue` + `useAnimatedStyle`/`useDerivedValue`/`useAnimatedProps`; Skia-Props direkt an SharedValues binden (kein `useState`).
2. **Kein `requestAnimationFrame` + `setState`** für Animation → `CountUpText` (Bestand) wird durch UI-Thread-Variante ersetzt (Implementierung `RollingNumber`, Modus `count`). Auch `Date.now()`-Ticks im JS-Thread vermeiden (Rest-Timer-Anzeige: 1x pro Sekunde `setState` ist ok, aber nicht für Ringe/Balken).
3. **Worklets:** Funktionen, die im UI-Thread laufen, mit `'worklet'` markieren (oder in Worklets/Reanimated-Callbacks inline). Keine Closures über große Objekte (Zustand, Query-Daten); nur Primitive und Tokens aus `motion.ts` capturen. Haptik-Aufrufe aus Animationen mit `runOnJS(haptic)(…)` (Reanimated 4 / Worklets 0.10: `scheduleOnRN(haptic, 'event')`).
4. **Frame-Budget:** 8,3 ms/Frame bei 120 Hz (ProMotion), 16,6 ms bei 60 Hz. Ziel: pro Frame < 4 ms Animationsarbeit. Maximal **eine Skia-Canvas mit Partikeln + ein Ring-Canvas** gleichzeitig aktiv.
5. **Layout-Animationen sparsam:** `entering`/`layout` nur für kleine Listen (≤ 12 Elemente); keine `LinearTransition` auf großen Listen (Verlauf). Bekannter Bug (Commit ee087d5: Layout-Transition auf Mahlzeitgruppen) → **keine Layout-Animation auf gruppierte Sektionen**; stattdessen opacity/translate auf Inhalt.
6. **Skia:** Paths/Paints in `useMemo` bauen, Größe stabil halten (nicht pro Frame neu erzeugen); Blur-Layer minimal; Off-Screen-Canvases unmounten; `Canvas` mit `opaque={false}` nur wo nötig.
7. **Offscreen/Hintergrund:** Loops (`withRepeat`) mit `cancelAnimation` stoppen, wenn Screen unfokussiert (`useFocusEffect`) oder App nicht `active` (`AppState`).
8. **Listen:** Reveal-Animationen nur beim ersten Erscheinen (Flag), nicht bei Recycling in `FlatList`/`FlashList`.
9. **Messen:** Debug-Overlay `Perf Monitor`; Zielwerte: UI-FPS ≥ 58 (60 Hz) bzw. ≥ 110 (120 Hz) beim Ring-Zünden mit Partikeln auf iPhone 15; Instruments „Core Animation“ + Skia-GPU-Zeit.
10. **Haptik** nie synchron im Render-Pfad.

### 7.2 Reduced Motion

- Systemschalter (`useReducedMotion()` / `ReduceMotion.System`) ist die Quelle; **keine App-eigene Parallel-Einstellung** (außer Haptik-Toggle).
- Policy je Elementklasse:
  - **Information transportierende Bewegung** (Ring-Füllung, Zahlenänderung) → ersetzen durch direkten Zustandswechsel + 200–300 ms Crossfade von Farbe/Opacity (Crossfade ist erlaubt).
  - **Dekorative Bewegung** (Partikel, Glow-Loops, Shimmer, Flug-Chip, Orbit, Idle-Funke) → entfernen.
  - **Skalierung** (Pressed-State 0.97) → bleibt (kleiner Effekt), aber Springs auf Timing `instant` ohne Überschwingen.
  - **Ortswechsel** (Reveal rise 8 pt) → nur Opacity.
- `useMotionPrefs()` Hook gibt `{ reduce: boolean }` zurück und kapselt `useReducedMotion()`.

### 7.3 Low-Power-Mode

- iOS „Low Power Mode“ erkennen: `expo-battery` `Battery.isLowPowerModeEnabledAsync()` + `addLowPowerModeListener` (**neue Dependency**; Alternative: `react-native-device-info` – schwerer).
- Auswirkungen: Glow-Blur reduziert, Partikelzahl ×0.4, **keine** Ambient-Loops (Idle-Glimmen, Shader-Grain), Skeleton-Shimmer aus. Signature-Momente (Ring-Füllung, Roll) bleiben, aber Dauer ×0.8.
- Wenn Dependency nicht gewünscht: Heuristik nicht verwenden; stattdessen nur Reduce Motion beachten (Fallback).

### 7.4 Accessibility (jenseits RM)

- VoiceOver: Animierte Zahlen haben `accessibilityLabel` mit **Endwert** (nicht Zwischenwerte); bei Wertänderung `AccessibilityInfo.announceForAccessibility("Noch 840 Kilokalorien übrig")` (gedrosselt, 1x pro Änderung, kein Spam beim Rollen).
- Feier-Overlays (Streak, PR) sind Dialoge mit Text; Fokus beim Erscheinen auf die Headline (`accessibilityViewIsModal`), per Tap/Zwei-Finger-Scrub schließbar; **auto-dismiss nicht bei aktivem VoiceOver** (`AccessibilityInfo.isScreenReaderEnabled()`).
- Skia-Canvas-Inhalte sind für VoiceOver unsichtbar → immer das RN-Wrapper-`View` mit `accessible` + Label (Bestand `KcalRing` macht das bereits, beibehalten).
- Kontrast: Glow/Partikel tragen keine Information; Information immer auch als Text/Symbol.
- Blitzen: nichts blinkt > 3x/s; kein Flackern der Partikel über 6 Hz (Flicker-Term oben 38 rad/s ≈ 6 Hz → Grenzwert; auf 28 rad/s ≈ 4,5 Hz senken, falls Photosensitivitäts-Bedenken).
- Dynamic Type: Roll-Ziffern bestimmen `lineHeight` aus `fontScale` (`PixelRatio.getFontScale()`), Odometer-Streifenhöhe daran koppeln.

---

## 8. Umsetzungsplan

### 8.1 Paket-Check (nur recherchiert, `npx expo install --check` nicht ausgeführt)

| Paket                                           | Status                | Version / Hinweis                                                                                                                       | Nötig?                                                  |
| ----------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `react-native-reanimated`                       | installiert `4.5.1`   | passt zu SDK 57; `scheduleOnRN`/`runOnJS` aus `react-native-worklets 0.10.1`                                                            | ja (vorhanden)                                          |
| `react-native-worklets`                         | installiert `0.10.1`  |                                                                                                                                         | vorhanden                                               |
| `@shopify/react-native-skia`                    | installiert `2.6.2`   | `RuntimeEffect`, `Atlas`, `useClock` verfügbar                                                                                          | vorhanden                                               |
| `expo-haptics`                                  | installiert `~57.0.3` |                                                                                                                                         | vorhanden                                               |
| `react-native-gesture-handler`                  | installiert `~2.32.0` | für optionales Press-Handling (Pressable reicht)                                                                                        | vorhanden                                               |
| `expo-symbols`, `expo-glass-effect`, `@expo/ui` | installiert           | Native Glass bleibt                                                                                                                     | vorhanden                                               |
| `react-native-mmkv` v4                          | installiert           | Haptik-/Intro-Flags                                                                                                                     | vorhanden                                               |
| **`expo-battery`**                              | fehlt                 | SDK-57-kompatible Version via `npx expo install expo-battery` (Expo-managed Paket, wird auf `~57.x` aufgelöst) – nur für Low-Power-Mode | **optional (P2)**; Native Rebuild (Dev Build) nötig     |
| **`expo-audio`**                                | fehlt                 | Expo-managed, `npx expo install expo-audio`; Nachfolger von `expo-av` (nicht verwenden)                                                 | **optional (nur wenn Sound, P3)**; Native Rebuild nötig |
| `lottie-react-native`                           | fehlt                 | **nicht empfohlen**: Skia deckt alles ab, vermeidet Doppel-Stack, Theme-Farben (Skia kann `useThemeHex`)                                | nein                                                    |
| `expo-blur`                                     | –                     | verboten (Hard Rule #1)                                                                                                                 | nein                                                    |

Neue Pakete minimal: **keines für P0/P1.** Optional: `expo-battery` (Low-Power) und `expo-audio` (Sound). Beide erfordern einen neuen Dev Build (Native-Module).

### 8.2 Dateien (neu / angepasst)

```
src/theme/motion.ts                       NEU    Tokens (Abschnitt 2.6)
src/lib/haptics.ts                        NEU    haptic(event), Settings-Store-Anbindung, Rate-Limit, Muster
src/features/settings/hapticsStore.ts     NEU    Zustand+MMKV: { enabled, countdown, sound }  (oder in bestehendem Profil-Settings-Store)
src/lib/motionPrefs.ts                    NEU    useMotionPrefs() (RM + Low-Power),
src/components/motion/
  index.ts                                NEU    Barrel
  PressableScale.tsx                      NEU
  Reveal.tsx                              NEU
  RollingNumber.tsx                       NEU
  GlowPulse.tsx                           NEU    (animierter Glow-Layer, Skia)
  Sparks.tsx                              NEU    Funkenflug (Skia)
  Celebration.tsx                         NEU    Orchestrator (Stufe, Haptik, Sparks, Backdrop)
  GlutLoader.tsx                          NEU    KI-Lade-Zustand
  SkeletonBlock.tsx                       NEU    Wärme-Shimmer, gemeinsame Phase
  CheckDraw.tsx                           NEU    Häkchen mit Pfadzeichnen
  MealFlight.tsx + mealFlightStore.ts     NEU    Chip-Flug in den Ring
src/components/charts/KcalRing.tsx        ÄNDERN Kopf+Glow, Wert-/Bonus-/Overflow-Animation, Rolling-Mitte
src/components/charts/MacroBar.tsx        ÄNDERN Glut-Füllung
src/components/charts/WeightTrendChart.tsx, WeightProjectionChart.tsx   ÄNDERN Kopf-Punkt, Glow, Ziel-Zünden
src/features/auth/components/CountUpText.tsx   ÄNDERN -> dünner Wrapper um RollingNumber(mode='count'), alte rAF-Logik entfernen
src/features/auth/components/OptionCard.tsx    ÄNDERN PressableScale + Reveal + haptic('select')
src/components/glass/GlassActionButton.tsx     ÄNDERN haptic('tap'), Press-Skala hero
app/(tabs)/index/index.tsx, app/food-review.tsx, app/workout/active.tsx, app/(onboarding)/*   ÄNDERN Direkte Haptics.* -> haptic(...)
app/(tabs)/profile/…                           ÄNDERN Settings: Schalter „Haptik“ (+ „Töne“ später)
src/i18n/locales/{de,en}.json                  ÄNDERN Texte für Haptik-Toggle, Lade-Phasen (Hard Rule #2: de+en)
CLAUDE.md                                      ÄNDERN Abschnitt „Motion & Haptics“ (kurz: Tokens, haptic() Pflicht, RM-Policy)
```

Hard-Rule-Check: Berechnungen (Ziel-Share, Meilenstein-Logik, PR-Erkennung) bleiben in `src/domain`; Motion-Komponenten bekommen nur fertige Werte. Neu in Domain (rein, mit Tests): `ringDeltaProfile(prevShare, nextShare)` (Dauer/Puls-Entscheidung aus 3.1b) und `streakMilestoneLevel(days)` (Funkenstufe) – Test-Dateien daneben.

### 8.3 Props-Entwürfe (TypeScript-Signaturen)

```ts
// PressableScale.tsx
export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  /** Skala/Opacity beim Drücken, Default press.default */
  preset?: keyof typeof press;
  /** Haptik beim Tap, Default 'tapLight'; false = keine */
  haptic?: HapticEvent | false;
  style?: StyleProp<ViewStyle>;
  /** Natives Glas darunter: Skala nur auf Wrapper, nicht auf GlassView anwenden */
  children: ReactNode;
}

// Reveal.tsx  (entering-Ersatz mit Tokens; Flag „nur beim ersten Mal“)
export interface RevealProps {
  index?: number; // Stagger-Position
  step?: number; // Default stagger.base
  delay?: number; // zusätzliche ms
  rise?: number; // Default reveal.rise (8)
  duration?: number; // Default duration.base
  once?: string; // Schlüssel: spielt nur einmal pro App-Start
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

// RollingNumber.tsx
export interface RollingNumberProps {
  value: number;
  mode?: 'roll' | 'count'; // Default 'roll'
  format?: (v: number) => string; // muss Worklet sein ('worklet') für mode='count'
  fractionDigits?: number; // Default 0
  fontSize: number;
  fontWeight?: TextStyle['fontWeight'];
  color?: string; // Textfarbe (Token-Klasse/Hex)
  glowColor?: string; // Afterglow-Farbe bei Änderung, Default accent
  duration?: number; // Default duration.slow
  startFrom?: number; // erster Render animiert von hier
  accessibilityLabel?: string; // Default format(value)
}

// GlowPulse.tsx (Skia-Child; in bestehende Canvas einhängbar)
export interface GlowPulseProps {
  trigger: number; // Inkrementieren löst Puls aus
  color: string; // Hex (Skia)
  peak?: number; // Default 0.55
  base?: number; // Idle-Level, Default 0.18
  attackMs?: number; // glow.attack 180
  decayMs?: number; // glow.decay 600
  children: ReactNode; // Pfad/Form, die glüht
}

// Sparks.tsx
export interface SparksProps {
  origin: { x: number; y: number };
  count?: number; // ≤ 48, Default 28
  colors?: string[]; // Hex
  spread?: number; // vx-Spreizung, Default 18
  riseMin?: number; // Default 60 px/s
  riseMax?: number; // Default 120 px/s
  lifeMin?: number; // 900
  lifeMax?: number; // 1300
  onDone?: () => void; // Unmount-Signal
  size?: { width: number; height: number };
}

// Celebration.tsx – deklarativer Auslöser für Signature-Momente
export type CelebrationKind =
  'goalReached' | 'streak' | 'pr' | 'workoutDone' | 'bonus';
export interface CelebrationProps {
  kind: CelebrationKind;
  level?: 1 | 2 | 3; // Intensität (Streak-Meilenstein)
  title?: string; // i18n-String von außen
  subtitle?: string;
  value?: number; // z. B. Streak-Tage
  origin?: { x: number; y: number };
  onDismiss?: () => void;
  /** Ausgelöste Haptik überschreiben, Default aus kind abgeleitet */
  haptic?: HapticEvent | false;
}
export function useCelebration(): {
  play: (props: CelebrationProps) => void; // Imperativ, Queue (max. 1 aktiv)
};

// GlutLoader.tsx
export interface GlutLoaderProps {
  size?: number; // Default 96
  phase?: 'loading' | 'done' | 'error';
  onDoneAnimationEnd?: () => void;
  messages?: string[]; // rotierende Textphasen (i18n von außen)
  messageIntervalMs?: number; // Default 2200
}

// SkeletonBlock.tsx
export interface SkeletonBlockProps {
  width: number | `${number}%`;
  height: number;
  radius?: number; // Default 12
  delayMs?: number; // Default 150 (erst anzeigen, wenn Laden länger dauert)
}

// MealFlight.tsx
export function useMealFlight(): {
  launch: (args: { kcal: number; from?: Rect }) => void;
};
// KcalRing (zusätzliche Props)
export interface KcalRingProps /* erweitert */ {
  // bestehend: eatenKcal, baseKcal, bonusKcal, size
  playIntro?: boolean; // Erst-Füllung (Default: nur beim ersten Mount pro Start)
  onGoalReached?: () => void; // Callback für Celebration + Haptik
  onLimitExceeded?: () => void;
  onBonusGained?: (bonusKcal: number) => void;
}

// haptics.ts
export function haptic(event: HapticEvent): void;
export function useHapticsEnabled(): [boolean, (v: boolean) => void];
```

### 8.4 Reihenfolge & Abhängigkeiten

**Phase A – Fundament (1 Tag, keine neuen Pakete)**

1. `src/theme/motion.ts` (Tokens) – keine Abhängigkeit.
2. `src/lib/haptics.ts` + Settings-Store + Toggle im Profil – abhängig von Store-Muster (Zustand+MMKV, vorhanden). Migration aller 34 Direktaufrufe.
3. `src/lib/motionPrefs.ts` (nur RM zunächst).
4. `PressableScale`, `Reveal` – abhängig von 1–3. `OptionCard`, `GlassActionButton`, Cards/Listen umstellen.

**Phase B – Zahlen & Ring (2–3 Tage)** 5. `RollingNumber` (`count` zuerst, ersetzt `CountUpText`-rAF; danach `roll`). 6. `KcalRing`-Upgrade: Gradient + Kopf + Glow (`GlowPulse`), Wert-/Overflow-/Bonus-Logik, Domain-Helper `ringDeltaProfile` + Tests. 7. Mitte des Rings auf `RollingNumber`.

**Phase C – Feier (2–3 Tage)** – abhängig von 4–6 8. `Sparks` (Spec 6.2), `CheckDraw`, `Celebration`/`useCelebration`. 9. Integration: Satz abgehakt (3.6), Workout fertig (3.7), PR (3.8), Tagesziel (3.4), Streak (3.5; setzt UX-Regeln der Meilensteine voraus – Domain-Helper `streakMilestoneLevel`). 10. `MealFlight` (3.2), Gewicht-Moment (3.9).

**Phase D – Marken-Lade-Zustand & Polish (1–2 Tage)** 11. `GlutLoader` in `log-food`/Analyse-Flow (`useFoodAnalysis`), Fehlerzustand. 12. `SkeletonBlock` (gemeinsame Phase), Empty-State-Idle (3.16). 13. Chart-Upgrades (Kopf-Punkt, Zielzünden).

**Phase E – Optional** 14. `expo-battery` -> Low-Power in `motionPrefs`. 15. Shader-Grain / Hitzeflimmern (6.1 #6, #7) nach Performance-Messung. 16. `expo-audio` + drei Sounds (Abschnitt 5), Toggle „Töne“.

**Abhängigkeiten zu Parallelarbeit des Teams:** Farben (Gold-Funke, Glow-Töne) kommen vom Visual Designer → in `theme.config.js` als Tokens (z. B. `spark`) ergänzen; Mark/Illustration liefert Flammen-/Medaillen-Assets (Platzhalter SF Symbols bis dahin); UX/Gamification liefert Meilenstein-Liste, Ziel-erreicht-Definition und Streak-Regeln; Brand Strategist liefert Copy für Ladephasen und Feier-Titel.

### 8.5 Abnahmekriterien (Definition of Done je Moment)

- Läuft ohne JS-Thread-Last (Perf-Monitor: JS-FPS bleibt ≥ 55 während der Animation).
- Mit aktivem System-„Bewegung reduzieren“ keine Partikel/Loops/Flüge, Information bleibt sichtbar.
- Haptik-Toggle aus -> absolute Stille, keine Fehler.
- Zahlen: VoiceOver liest Endwert; kein Layout-Springen (tabular nums).
- Texte via `t()` in de+en (Hard Rule #2); Berechnung in `src/domain` mit Tests (#3).
- Kurzer Simulator-/Device-Check der Kernflows (Hard Rule #8): Mahlzeit speichern -> Ring; Workout-Satz -> Summary; Onboarding-Result.
