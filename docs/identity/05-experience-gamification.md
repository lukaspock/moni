# 05 – Experience, Rituale & Bindungssystem

> Rolle: UX- & Experience-Designerin im Identity-Team. Dieses Dokument liefert die **Erlebnisebene**: was passiert wo, wann und warum. Texte sind Absichten und Platzhalter, die finalen Formulierungen schreibt die Brand Strategist. Look, Motion und Illustration kleiden das später ein.
> Stand der Analyse: `main` (ee087d5), 2026-10-09. Gelesen: CLAUDE.md, PLAN.md, docs/design-system.md, docs/sprint-2.md, docs/sprint-3.md, alle Screens in `app/`, die Feature-Contracts in `src/features/*/index.ts`, `src/domain/*`, die Migration `20260927120500_views.sql`.
> Annahmen, die mit den anderen Rollen abzustimmen sind, sind mit **[Abstimmung]** markiert.

---

## 0. Ausgangslage: was die App heute hat und was fehlt

**Heute (verifiziert im Code):**

| Screen                                      | Inhalt heute                                                                                                                                                                                       | Wirkung                                                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Today (`app/(tabs)/index/index.tsx`)        | Titel (Heute/Gestern/Datum), `KcalRing`, 3 `MacroBar`s, Button „Mahlzeit hinzufügen“, 4 einklappbare Mahlzeit-Karten. **Kein Trainingsmodul**, keine Begrüßung im Screen selbst, kein Wochenbezug. | Korrektes Tabellenwerk. Nichts, was sagt: „Das bist du, das ist dein Tag“.                               |
| Workout-Summary (`app/workout/summary.tsx`) | Häkchen, 3 Zahlen (Dauer, Volumen, kcal), Bonus-Karte, PR-Liste.                                                                                                                                   | Funktional. Die Verbindung Training → Essen (der Kern der App) wird mit einer Textzeile erzählt.         |
| Insights                                    | Karten: Gewicht, kcal-Balken, Training pro Woche, Kraft, Korrelationen. `currentStreak` zählt Log-Tage am Stück.                                                                                   | Gute Daten, aber ein Archiv, kein Ritual. Der Streak ist die toxische Variante (ein verpasster Tag = 0). |
| Profile                                     | Einstellungsliste mit Limits/Körper/Ziele.                                                                                                                                                         | Verwaltung, keine Identität.                                                                             |
| Onboarding                                  | 19 Screens, lebendig (Count-up, Kurve, Haptik). Result-Screen mit Ruhetag- und Trainingstag-Karte.                                                                                                 | Stärkster Teil der App. Endet aber in einem leeren Today.                                                |
| Benachrichtigungen                          | 3 feste tägliche Essens-Erinnerungen (09:00/13:00/19:30).                                                                                                                                          | Hohe Frequenz, null Kontext.                                                                             |

**Was fehlt:** ein wiedererkennbares Bild des Tages, ein Gefühl von Fortschritt über Wochen, Momente der Freude, ein Grund, abends und am Sonntag wiederzukommen, und eine Art, mit Lücken umzugehen, ohne Schuldgefühl.

**Wichtiger Fund zu den Daten (beeinflusst das Bindungssystem):**
`v_daily_summary` ist als `FROM daily_targets d LEFT JOIN LATERAL (food_logs …)` gebaut, und `useUpsertDailyTargets` (`src/features/targets/index.ts`) schreibt `daily_targets` **nur für heute und nur wenn die App geöffnet wurde**. Folge: Tage, an denen die App nicht geöffnet wurde (oder die nachgetragen wurden), **fehlen in `useDailySummaries`** oder haben kein `target_kcal`. Für Rhythmus und Achievements darf deshalb **nicht** `v_daily_summary` die Quelle sein. Die Quelle sind die Basistabellen `food_logs`, `workouts`, `weight_logs` (siehe §2.0 „Ledger“). Das ist ohne Migration machbar.

---

## 1. Experience-Prinzipien (5 + 1 Leitplanke)

Abgeleitet aus: Training und Essen als **ein** Verständnis, kein Diät-Stress, Belohnung für Konsistenz statt Perfektion.

### P1 – Ein Körper, ein Tag

Essen und Training werden nie als zwei getrennte Welten gezeigt. Jede Hauptansicht (Today, Workout-Summary, Wochenrückblick) zeigt **beides in einem Bild**. Das Tageslimit ist „Basis + Training“, nicht „Kalorienbudget“. Wenn ein Workout endet, zeigt die App sofort, was es für den Teller bedeutet, und wenn eine Mahlzeit gespeichert wird, was sie für das Training bedeutet (Protein).
_Konsequenz:_ Das zentrale Bild der Marke ist ein Tages-Symbol, in dem Ring (Essen) und Strich (Training) zusammenkommen (§4.1, **[Abstimmung]** mit Mark/Illustration; die Idee entsteht aus dem „ø“ im Namen).

### P2 – Der Tag ist ein Kreis, kein Zeugnis

Es gibt keine „schlechten Tage“. Ein Tag ist **offen** oder **gehalten**. Überschreitung des Limits ist nie rot, nie ein Fehler, sondern neutral („etwas mehr heute“). Rot (`danger`) bleibt exklusiv für Löschen und echte Fehler (design-system.md).

### P3 – Rhythmus vor Perfektion

Fortschritt wird in **Wochen** gemessen, nicht in Tagen am Stück. Ruhetage sind Teil des Plans. Es gibt Gnade (automatisch), Pause (bewusst) und feierliche Rückkehr. Lebenszeit-Fortschritt (Stufen, Achievements) **geht nie verloren**. Nur der aktuelle Lauf kann enden, und selbst der mit Puffer.

### P4 – Zahlen erklären, statt zu richten

Jede wichtige Zahl bekommt ein „Warum“ in einem Satz („Dein Limit heute: 2.340 kcal = 2.020 Basis + 320 aus dem Training“). Kein Vergleich mit anderen Nutzern, keine Rangliste. Der Vergleichsmaßstab ist immer die eigene Vergangenheit.

### P5 – Wenige Rituale, jedes mit fester Form

Vier wiederkehrende Momente tragen die Beziehung: **Morgen** (Plan des Tages), **nach dem Training** (Brücke zum Essen), **Abend** (Tag schließen), **Sonntag** (Rückblick). Jedes hat eine feste visuelle Form, damit es sich wie „møni“ anfühlt. Überraschungen (Achievements, Monatscharakter) sind selten und dosiert.

### Leitplanke L – Fürsorge vor Fortschritt (nicht verhandelbar)

- Keine Belohnung, kein Achievement, keine Animation für „unter X kcal“, „Defizit gehalten“ oder „weniger gegessen“. Kalorien kommen in **keiner** Streak-/Rhythmus-/Achievement-Regel als Untergrenze vor, nur als zweiseitiger Korridor mit Mindestmenge („gut getankt“).
- Gewichtsbezogene Meilensteine feiern nur Bewegung **in Richtung des eigenen Ziels**, nur im gesunden BMI-Bereich (`src/domain/projection.ts` kennt die Grenzen) und nie mit absoluten Zahlen in Share-Cards.
- Ein stilles Fürsorge-Signal (§2.7) erkennt wiederholt sehr niedrige Aufnahme und ersetzt Feier-Momente durch einen ruhigen Hinweis.
- Alles ist abschaltbar: Rhythmus-Anzeige, Achievements, Benachrichtigungen („Ruhe-Modus“).

---

## 2. Fortschritts- und Bindungssystem: „Takt“

### Das Konzept in einem Absatz

møni misst nicht, wie lange du **perfekt** warst, sondern ob du **im Takt** bist. Jede Woche hat drei Ringe, den **Dreiklang**: **Essen** (Tage mit Protokoll), **Training** (Trainingstage) und **Protein** (Tage, an denen das Eiweißziel gut erreicht wurde). Sind in einer Woche mindestens zwei Ringe geschlossen, ist es eine **Takt-Woche**. Aufeinanderfolgende Takt-Wochen ergeben den **Rhythmus**. Gnade-Wochen und Pausen schützen ihn. Die Summe aller Takt-Wochen deines Lebens bestimmt deine **Stufe** (Titel), die nie sinkt. Jeder Tag ist ein kleines **Tages-ø** (Ring + Strich), jeder Monat ein **Monatsmuster** aus diesen Zeichen. Ergänzt durch **Achievements** (Stempel) und das **Wochen-Wrapped**.

Warum das zur App passt und nicht nach Duolingo klingt:

- Der Dreiklang bildet exakt den Produktkern ab (Essen + Training + Protein-Kopplung aus PLAN §6.6), nicht abstrakte „XP“.
- Wochen statt Tage passen zu Trainingsplänen (`workouts_per_week`) und zum adaptiven TDEE (der selbst in Wochen rechnet).
- Es gibt keine Währung, keine Herzen, keine Liga, keinen Verlust von Besitz.

### 2.0 Fundament: der Ledger (client-seitig, abgeleitet)

**Zweck:** ein kompakter Tagesindex, aus dem Rhythmus, Wochenringe, Monatsmuster, Wrapped und die meisten Achievements berechnet werden. Keine neue Tabelle.

**Quelle (nur vorhandene Tabellen, RLS greift):**

| Feld                                                                                               | Quelle                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `foodLogCount`, `kcalEaten`, `proteinG`, `meals` (Menge je `meal_type`), `firstLogHour`, `sources` | `food_logs` (`date`, `logged_at`, `meal_type`, `source`, `kcal`, `protein_g`)                                                                                                               |
| `workoutCount`, `workoutKcal`, `strength/cardio`-Flags                                             | `workouts` mit `ended_at is not null` (Datum = lokales Datum von `started_at`) plus Overlay der Outbox (`pendingUpsertsForTable('workouts')`) wie in `historyMerge.ts`                      |
| `setVolumeKg`                                                                                      | `v_exercise_progress.volume_kg` ist wöchentlich. Für Tagesvolumen: `workout_sets` joined `workouts` (`weight_kg*reps`), oder erst ab Release 2; Release 1 braucht nur wöchentliches Volumen |
| `weightLogged`                                                                                     | `weight_logs.date`                                                                                                                                                                          |
| `targetKcal`, `targetProteinG` (optional)                                                          | `daily_targets`, nur wo vorhanden; sonst Fallback auf das aktuelle Ziel (siehe unten)                                                                                                       |
| `restConfirmed`                                                                                    | MMKV (siehe §2.1)                                                                                                                                                                           |

**Abruf:** PostgREST liefert standardmäßig max. 1000 Zeilen pro Request. Deshalb **paginiert und inkrementell**:

1. Erstes Mal: seitenweise zurück bis zum Beginn (selten, wenige hundert Zeilen pro Monat).
2. Danach: nur ab `lastSyncedDate - 7 Tage` (Nachträge und Health-Import korrigieren Vergangenes).
3. Ergebnis als **kompakter Tagesdatensatz in MMKV** (`ledger:v1:<userId>`, Zustand-`persist` wie `onboardingStore`). Offline sofort verfügbar. Bei Verlust wird er aus dem Server neu gebaut.
4. Lebenszeit-Zähler (für Achievements) über `select count` mit `head: true` (`workouts`, `food_logs` nach `source`, `favorite_meals`, `exercises` mit `owner_id`, `weight_logs`). Kein Datenvolumen.

**Hook-Vorschlag:** neues Feature `src/features/progress/` mit `index.ts` als Contract: `useLedger()`, `useRhythm()`, `useWeekRings(weekStart)`, `useAchievements()`, `useWeeklyReview(weekStart)`, `useRituals()`. Importiert von `food`, `workout`, `targets`, `auth` nur deren `index.ts`.

**Zeit/Datum:** immer lokale `YYYY-MM-DD`-Strings (`src/lib/date.ts`). Wochenstart **Montag** (Locale-abhängig später möglich über Parameter `weekStartsOn`). Wochenarithmetik nur mit `shiftIsoDate` (kein `Date`-Gerechne, DST-sicher).

**Ledger-Typ (Domain, rein):**

```ts
// src/domain/rhythm.ts
export interface LedgerDay {
  date: string; // YYYY-MM-DD, lokal
  foodLogCount: number;
  kcalEaten: number;
  proteinG: number;
  targetKcal: number | null; // null = kein daily_targets-Eintrag für den Tag
  targetProteinG: number | null;
  workoutCount: number; // nur abgeschlossene
  workoutKcal: number;
  hadStrength: boolean;
  hadCardioOrSport: boolean;
  weightLogged: boolean;
  restConfirmed: boolean; // lokal, siehe 2.1
}
```

### 2.1 Element A – Tag halten und das Tages-ø

**Regel „Tag gehalten“ (`kept`)** – ein Tag zählt, wenn mindestens eins gilt:

- Training: ≥ 1 abgeschlossenes Workout (auch aus Apple Health importiert; `ended_at` gesetzt).
- Essen: ≥ 2 Einträge (z. B. Frühstück + Abendessen). Ein einzelner Kaffee zählt nicht, ein Barcode-Scan zählt wie jeder andere Eintrag.
- Geplanter Ruhetag (Wochentag nicht in `training_plan_days`): ≥ 1 Eintrag **oder** „Ruhetag genießen“ (ein Tap in der Today-Karte, schreibt `restConfirmed` lokal). Ruhe ist Teil des Plans und muss sich nicht verdient anfühlen.

**Tageszustände (`DayState`):** `kept` · `empty` (vergangen, nicht gehalten; UI-Wort „offen“, nie „verpasst“) · `open` (heute, noch nicht gehalten) · `future` · `paused`.

**Tages-ø (Darstellung, für Visual/Motion):** pro Tag ein Zeichen mit zwei Teilen: **Ring** gefüllt, wenn Essen gehalten, **Strich** gezeichnet, wenn Training. Beides = volles ø. Leerer Tag = dünner, nicht ausgefüllter Ring (kein Kreuz, kein Grau-Schock). Ruhetag gehalten = Ring mit kleinem Punkt/„Mond“ statt Strich **[Abstimmung Mark]**.

**Randfälle:**

- _Nachtragen_ (gestern loggen): zählt voll und ohne Hinweis, die Wochenringe rechnen neu. Kein Konfetti für Nachträge (Feier-Events nur, wenn das Datum ≤ 1 Tag her ist; sonst still).
- _Mehrere Workouts_: 1 Trainingstag, nicht 2.
- _Mitternacht_: Workout über Mitternacht zählt für den Starttag (`started_at` lokal).
- _Zeitzonenwechsel/Reisen_: Datum bleibt das Datum, das bei Erfassung galt (die DB speichert `food_logs.date` bereits so). Workouts: lokale Zeit zum Zeitpunkt der Berechnung; bei Reisen sind Tage dann eventuell um ±1 verschoben. Akzeptiert und dokumentiert.
- _Nur Gewicht gewogen_: zählt nicht als gehaltener Tag (verhindert Gaming mit minimalem Aufwand), zählt aber für Achievements Körper.
- _Auto-Import aus Health ohne Nutzerbeteiligung_: zählt für Training (Realität: er hat trainiert), aber nie für Essen.

```ts
export type DayState = 'kept' | 'empty' | 'open' | 'future' | 'paused';
export interface DayContext {
  today: string;
  isPlannedTrainingDay: boolean; // aus training_plan_days (Wochentag)
  pausedDates: ReadonlySet<string>;
}
export function classifyDay(
  day: LedgerDay | undefined,
  date: string,
  ctx: DayContext,
): DayState;
export function dayGlyph(day: LedgerDay | undefined): {
  ring: boolean;
  slash: boolean;
  rest: boolean;
};
```

### 2.2 Element B – Wochen-Dreiklang (Ringe)

| Ring         | Zählt                                                        | Standardziel pro Woche                                                                                                     | Herkunft des Ziels                                                                    |
| ------------ | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Essen**    | Tage mit ≥ 2 Einträgen                                       | 5 von 7                                                                                                                    | Konstante; änderbar (4–7)                                                             |
| **Training** | Tage mit ≥ 1 abgeschlossenem Workout                         | `clamp(profile.workouts_per_week, 1, 6)`, Anfänger (`training_experience = 'beginner'`) in den ersten 4 Wochen höchstens 3 | `profiles.workouts_per_week` aus dem Onboarding                                       |
| **Protein**  | Tage mit ≥ 2 Einträgen **und** Protein ≥ 85 % des Tagesziels | 4 von 7                                                                                                                    | Konstante; Tagesziel aus `daily_targets.protein_g`, sonst aktuelles Ziel als Fallback |

**Regeln:**

- Pausierte Tage verkleinern das Ziel proportional: `ceil(ziel × (7 − pausierteTage) / 7)`, mindestens 1 (außer die ganze Woche ist pausiert: Woche wird übersprungen).
- Ringe sind **nach oben offen**: Übererfüllung (4 statt 3 Trainings) wird nicht bestraft und erzeugt nur eine kleine „+1“-Notiz.
- Protein hat **keine Obergrenze** im Ring, aber der Ring feiert ab 85 %, nicht ab Maximum. Es gibt kein Lob für „mehr ist besser“.
- Hat jemand `workouts_per_week = 0`, wird der Trainingsring ausgeblendet; dann müssen beide anderen Ringe geschlossen sein.
- Zielanpassung statt Frust: schließt jemand zwei Wochen hintereinander den Trainingsring nicht, bietet die App in den Wrapped-Karten **einmalig** an, das Ziel um 1 zu senken („Passt dein Plan noch zu deinem Alltag?“). Umgekehrt nach 4 Wochen mit Übererfüllung ein Angebot für +1.
- Nicht-Datensituationen: Wer in der laufenden Woche noch nichts geloggt hat, sieht leere Ringe mit Ziel („0 von 5“), nie eine Warnung.

```ts
export interface WeekGoals {
  foodDays: number;
  trainingDays: number;
  proteinDays: number;
}
export interface WeekRings {
  weekStart: string;
  food: { done: number; goal: number; closed: boolean };
  training: { done: number; goal: number; closed: boolean } | null; // null = Ring aus
  protein: { done: number; goal: number; closed: boolean };
  closedCount: number; // 0..3
  isTakt: boolean; // closedCount >= 2 (oder beide, wenn Training aus)
  isFull: boolean; // alle sichtbaren Ringe geschlossen
  isComplete: boolean; // Woche ist vorbei
  isPaused: boolean; // ganze Woche pausiert
}
export function weekStartOf(isoDate: string, weekStartsOn?: 0 | 1): string;
export function defaultWeekGoals(p: {
  workoutsPerWeek: number | null;
  experience: TrainingExperience | null;
  weeksSinceStart: number;
}): WeekGoals;
export function computeWeekRings(
  days: readonly LedgerDay[],
  weekStart: string,
  goals: WeekGoals,
  ctx: DayContext,
): WeekRings;
```

### 2.3 Element C – Rhythmus (der flexible Streak)

**Definition:** Anzahl aufeinanderfolgender abgeschlossener Takt-Wochen, mit Gnade und Pause. Berechnung ist ein **deterministischer Replay** über alle Wochen vom ersten Ledger-Tag bis zur letzten abgeschlossenen Woche. Es muss nichts außer den Pausenbereichen gespeichert werden.

**Replay-Regeln:**

1. Start: `rhythm = 0`, `graceTokens = 1`.
2. Für jede abgeschlossene Woche in zeitlicher Reihenfolge:
   - Woche vollständig pausiert → überspringen (weder Plus noch Bruch).
   - `isTakt` → `rhythm += 1`; `lifetimeWeeks += 1`; alle 4 aufeinanderfolgende Takt-Wochen gibt es `+1` Gnade-Token (Maximum 2).
   - Sonst, wenn `graceTokens > 0` → Token verbrauchen, `rhythm` bleibt unverändert (Woche „geschützt“).
   - Sonst → `bestRhythm = max(bestRhythm, rhythm)`; `rhythm = 0`.
3. Die laufende Woche beeinflusst den Wert **nie rückwirkend**. Sie wird separat als Chip gezeigt: _im Takt_ (≥ 2 Ringe), _noch offen_ oder _Takt in Reichweite_ (mit den verbleibenden Tagen noch erreichbar).
4. Der Nutzer sieht niemals „0“. Bei `rhythm = 0` steht „Takt beginnt“ plus der Hinweis auf `bestRhythm` und `lifetimeWeeks`.

**Pause-Modus („Urlaub, krank, Pause“):**

- Aktivierbar im Profil oder über das Willkommen-zurück-Blatt: Zeitraum von 1 bis 21 Tagen, jederzeit auch rückwirkend bis zu 7 Tage (man merkt erst später, dass man krank war).
- Gespeichert als lokale Liste `{from, to}` in MMKV (`rhythm:pauses:<uid>`); überschneidungsfrei gehalten durch die Funktion.
- Maximal 42 Pausentage pro 12 Monate (verhindert dauerhaftes „Einfrieren“, ohne dass ein Limit im UI als Strafe wirkt: Erst beim Überschreiten erscheint der Hinweis „Mehr Pause? Setz dein Ziel auf ‚locker‘ “).
- Während einer Pause sind alle Nudges aus (§6).

**Nicht toxisch, konkret:**

- Gnade ist automatisch und sichtbar als Ruhe, nicht als Verlust („Gnade-Woche eingesetzt, dein Takt bleibt bei 7“). Wer sie nie braucht, sieht sie nicht.
- Kein Streak-Verlust-Alarm am Abend vor dem Bruch. Die einzige Erinnerung ist die einmalige Donnerstags-Chance (§6, Trigger 6), abschaltbar.
- Kein „Streak wiederherstellen für X“. Kein Kauf. Kein Teilen des Streaks als Druckmittel.
- Rückkehr nach Bruch wird gefeiert (Achievement „Zurück im Takt“).
- „Rhythmus“ lässt sich komplett ausblenden („Rhythmus-Anzeige“ in den Einstellungen); Ringe und Strip bleiben dann ohne Zahl.

```ts
export interface PauseRange {
  from: string;
  to: string;
}
export interface RhythmState {
  current: number; // abgeschlossene, aufeinanderfolgende Takt-Wochen
  best: number;
  lifetimeWeeks: number; // Summe aller Takt-Wochen (für Stufe)
  graceTokens: number; // 0..2
  lastWeekOutcome: 'takt' | 'grace' | 'broken' | 'paused' | 'none';
  thisWeek: 'in-takt' | 'in-reach' | 'open';
  weeksWithGrace: string[]; // weekStarts, für Wrapped-Hinweise
}
export function computeRhythm(args: {
  days: readonly LedgerDay[];
  today: string;
  plannedWeekdays: ReadonlySet<number>; // 0..6 aus training_plan_days
  goalsForWeek: (weekStart: string) => WeekGoals;
  pauses: readonly PauseRange[];
  weekStartsOn?: 0 | 1;
}): RhythmState;
export function addPause(
  pauses: readonly PauseRange[],
  range: PauseRange,
  today: string,
): PauseRange[]; // clamp, merge, 21d/42d-Regeln
```

**Erwartung in Zahlen (zur Plausibilisierung):** Eine Person, die 3× pro Woche trainiert und an 5 Tagen loggt, schließt Essen + Training; sie schafft den Takt auch mit einer schlechten Woche (z. B. nur 1 Training, 5 Essens-Tage, Protein ok). Das ist beabsichtigt: Takt ist erreichbar und soll sich nach „meistens dabei“ anfühlen.

### 2.4 Element D – Stufen (Titel, verlieren sich nie)

Basis: `lifetimeWeeks` (Summe aller Takt-Wochen, nicht aufeinanderfolgend).

| Stufe | Ab Takt-Wochen | DE            | EN           | Gefühl                             |
| ----- | -------------- | ------------- | ------------ | ---------------------------------- |
| 1     | 0              | Anlauf        | Warm-up      | Du bist unterwegs                  |
| 2     | 3              | Einklang      | In Tune      | Die ersten Gewohnheiten sitzen     |
| 3     | 8              | Gleichschritt | In Step      | Zwei Monate Verlässlichkeit        |
| 4     | 16             | Eingespielt   | In Sync      | Training und Essen laufen zusammen |
| 5     | 30             | Metronom      | Metronome    | Ein halbes Jahr Takt               |
| 6     | 52             | Original      | The Original | Ein Jahr møni (Namensanspielung)   |

- Titel erscheinen auf Profil, im Wrapped und in der Share-Card. Stufe-Aufstieg = ein Feier-Moment (§4.7, Rituale).
- Fortschritt zur nächsten Stufe wird als dünner Bogen um das Profil-Tages-ø gezeigt („noch 2 Takt-Wochen bis Gleichschritt“).
- Keine Punkte, kein XP, keine Level-Zahl. Titel statt Nummer.

```ts
export interface Stage {
  index: 1 | 2 | 3 | 4 | 5 | 6;
  key: 'warmup' | 'inTune' | 'inStep' | 'inSync' | 'metronome' | 'original';
  minWeeks: number;
}
export const STAGES: readonly Stage[];
export function stageForWeeks(lifetimeWeeks: number): {
  stage: Stage;
  next: Stage | null;
  weeksToNext: number | null;
  progress: number; /* 0..1 */
};
```

### 2.5 Element E – Monatsmuster und Monatscharakter (Sammeln + Saison)

**Monatsmuster:** Das Raster aller Tages-ø eines Kalendermonats (7 Spalten, Wochen als Zeilen). Am Monatsende wird es zur **Karte** und im Profil in der **Sammlung** abgelegt (Regal der Monatskarten, ein Fenster pro Monat, auch rückwirkend aus dem Ledger erzeugbar, daher ohne Speicher). Das Wort „Muster“ passt zum Konzept **[Abstimmung Brand]** (mögliche Etymologie von „møni“ bei der Brand Strategist klären, nicht von mir behauptet).

**Monatscharakter (Titel für den Monat, deterministisch aus Daten, fröhlich, nie wertend):**

| Charakter (DE / EN)                  | Regel (erste zutreffende von oben, sonst „Der Beständige“)        |
| ------------------------------------ | ----------------------------------------------------------------- |
| Der Eisenfreund / The Iron Friend    | ≥ 10 Krafttage im Monat                                           |
| Der Frühstücker / The Breakfast Club | ≥ 15 Tage mit Frühstückseintrag vor 10:00                         |
| Der Ausdauernde / The Long Hauler    | ≥ 6 Cardio-/Sport-Workouts                                        |
| Die Proteinliebe / The Protein Pal   | Protein-Ring in ≥ 3 Wochen geschlossen                            |
| Der Neustarter / The Fresh Starter   | Monat enthielt Pause oder Comeback-Woche und endet mit Takt-Woche |
| Der Allrounder / The All-Rounder     | Kraft + Cardio/Sport in ≥ 3 verschiedenen Wochen                  |
| Der Beständige / The Steady One      | Fallback: ≥ 3 Takt-Wochen                                         |
| Der ruhige Monat / The Quiet Month   | Fallback für den Rest. Text: „Auch das ist ein Monat.“            |

**Saison:** Release 1 bewusst **nicht**. Monate tragen die Saisonidee bereits. Quartals-„Saison“ mit Thema/Illustration wäre „später“ (§9).

```ts
export interface MonthPattern {
  month: string /* YYYY-MM */;
  cells: {
    date: string | null;
    glyph: ReturnType<typeof dayGlyph> | null;
    state: DayState;
  }[];
  keptDays: number;
  taktWeeks: number;
}
export function buildMonthPattern(
  days: readonly LedgerDay[],
  month: string,
  ctx: DayContext,
): MonthPattern;
export type MonthCharacterKey =
  | 'ironFriend'
  | 'breakfastClub'
  | 'longHauler'
  | 'proteinPal'
  | 'freshStarter'
  | 'allRounder'
  | 'steady'
  | 'quiet';
export function monthCharacter(
  days: readonly LedgerDay[],
  rings: readonly WeekRings[],
  month: string,
): MonthCharacterKey;
```

### 2.6 Element F – Achievements (Stempel)

Katalog in §3. Mechanik:

- **Rein abgeleitet.** Jeder Stempel ist eine Funktion von `AchievementFacts` (Ledger + Zähler). Keine Server-Tabelle in Release 1.
- **„Gesehen“-Status lokal** (`achv:seen:<uid>` = Set von IDs). Neu freigeschaltete Stempel (in Facts erfüllt, nicht in `seen`) lösen genau **einen** Feier-Moment aus, dann werden sie als gesehen markiert.
- **Neuinstallation/Geräte-Wechsel:** erster Lauf ohne `seen` markiert alles bereits Erfüllte still als gesehen und zeigt stattdessen **einen** Sammelhinweis („Wiedergefunden: 11 Stempel“). Kein Feuerwerk-Spam.
- **Feier-Drossel:** max. 1 Moment pro App-Öffnung, max. 2 pro Tag; weitere werden gestapelt und im Wrapped/Profil gezeigt.
- **Versteckte Stempel** (`hidden`): Name und Bedingung erst nach Freischaltung sichtbar. Anteil ≤ 25 % des Katalogs.
- **Kein Entzug:** einmal erfüllt bleibt erfüllt (Anzeige „freigeschaltet am …“ aus dem frühesten passenden Tag, soweit bestimmbar; sonst Datum der Erkennung).

Domain-Skizze:

```ts
export type AchievementCategory =
  'training' | 'nutrition' | 'consistency' | 'body' | 'explorer';
export type Rarity = 'common' | 'rare' | 'special';
export interface AchievementFacts {
  today: string;
  days: readonly LedgerDay[];
  rhythm: RhythmState;
  weeks: readonly WeekRings[];
  counts: {
    workouts: number;
    foodLogs: number;
    photoLogs: number;
    barcodeLogs: number;
    voiceLogs: number;
    labelLogs: number;
    favorites: number;
    customExercises: number;
    routines: number;
    weightLogs: number;
  };
  strength: {
    totalVolumeKg: number;
    bestOneRmGainPct: number | null;
    firstPrDate: string | null;
    bodyweightLiftDone: boolean;
  };
  body: {
    startWeightKg: number | null;
    trendWeightKg: number | null;
    targetWeightKg: number | null;
    goal: Goal | null;
    heightCm: number | null;
  };
  flags: {
    healthConnected: boolean;
    healthWorkoutImported: boolean;
    adaptiveTdeeAvailable: boolean;
    sharedCount: number;
    reviewsViewed: number;
    accountCreatedAt: string;
  };
}
export interface AchievementStatus {
  id: AchievementId;
  unlocked: boolean;
  unlockedOn: string | null;
  progress: { current: number; target: number } | null;
}
export function evaluateAchievements(
  facts: AchievementFacts,
): AchievementStatus[];
export function newlyUnlocked(
  prevSeen: ReadonlySet<string>,
  now: readonly AchievementStatus[],
): AchievementStatus[];
```

### 2.7 Element G – Fürsorge-Signal (Schutz)

Stille Regel, kein „Feature“: wenn an ≥ 5 der letzten 7 Tage mit ≥ 2 Einträgen die Aufnahme **unter 60 % des Basis-Limits** lag (und nicht Fasten-Tage mit 0 Einträgen), dann:

- keine Feier-Animation für das Ring-Füllen,
- Achievements mit Körperbezug werden zurückgehalten,
- eine einmalige ruhige Karte auf Today: „Du isst seit ein paar Tagen deutlich weniger, als dein Plan vorsieht. Das ist okay zu bemerken. Wenn du dich damit unwohl fühlst, sprich mit jemandem, dem du vertraust.“ plus Link auf Hilfe (Texte und Links: Brand/Legal). Kein Alarm, kein Roter Rahmen.

```ts
export function detectLowIntakePattern(
  days: readonly LedgerDay[],
  baseKcal: number,
  today: string,
): { flagged: boolean; daysConsidered: number };
```

**Risiko:** Medizinischer Anspruch. Daher: nur Hinweis, nie Diagnose; vor Release mit Legal/Disclaimer-Text abstimmen (siehe PLAN §10 „Gesundheit/Recht“).

### 2.8 Datenmodell-Bedarf, Übersicht

| Element                | Neue Tabelle/Spalte? | Lokaler Speicher (MMKV)                                          | Reine Funktionen                                      |
| ---------------------- | -------------------- | ---------------------------------------------------------------- | ----------------------------------------------------- |
| Ledger                 | nein                 | `ledger:v1:<uid>`                                                | `rhythm.ts` Typen                                     |
| Tag halten / Tages-ø   | nein                 | `rhythm:restDays:<uid>`                                          | `classifyDay`, `dayGlyph`                             |
| Wochenringe            | nein                 | Zielüberschreibung `rhythm:goals:<uid>`                          | `defaultWeekGoals`, `computeWeekRings`, `weekStartOf` |
| Rhythmus               | nein                 | `rhythm:pauses:<uid>`                                            | `computeRhythm`, `addPause`                           |
| Stufen                 | nein                 | nichts                                                           | `stageForWeeks`                                       |
| Monatsmuster/Charakter | nein                 | nichts                                                           | `buildMonthPattern`, `monthCharacter`                 |
| Achievements           | nein (Release 1)     | `achv:seen:<uid>`, `achv:events:<uid>` (Zähler Teilen/Rückblick) | `evaluateAchievements`, `newlyUnlocked`               |
| Wochen-Wrapped         | nein                 | `review:viewed:<uid>`                                            | `buildWeeklyReview`                                   |
| Rituale                | nein                 | `ritual:lastOpen`, `ritual:checkin:<date>`                       | `rituals.ts` (§5)                                     |
| Nudges                 | nein                 | `nudge:state`                                                    | `nudges.ts` (§6)                                      |
| Fürsorge               | nein                 | nichts                                                           | `detectLowIntakePattern`                              |

**Optional später (braucht Migration, siehe CLAUDE.md „Migrationen nur über Datei“):** Tabelle `user_achievements (user_id, achievement_id, unlocked_at, seen_at)` mit RLS wie bei den anderen Nutzertabellen (`(select auth.uid())`, getrennte Policies pro Befehl), sowie `user_checkins (user_id, date, energy smallint, note text)` und `user_pauses (id, user_id, from_date, to_date)` für geräteübergreifende Synchronisierung. Erst sinnvoll, wenn Geräte-Wechsel oder Server-Pushes wichtig werden. In Release 1 ist ein Verlust der lokalen Pausen/Rest-Bestätigungen verkraftbar (Tage werden dann aus dem Ledger neu bewertet; Gnade fängt ab).

**Hinweis zu PRs:** Die Bestleistungs-Zähler in `finish.ts` liegen heute nur in MMKV (`workout:bestOneRepMaxKg`), also pro Gerät. Für Achievements und Wrapped sind die PRs deshalb aus `v_exercise_progress` (serverseitig, wöchentlich) herzuleiten, die Live-Anzeige in der Summary bleibt wie sie ist.

---

## 3. Achievements / Meilensteine (43 Stück)

Seltenheit: **C** = häufig (die meisten schaffen es in den ersten Wochen), **R** = selten, **S** = besonders. Verteilung: überwiegend C und R, 8 S. `H` = versteckt. Feiertexte sind Platzhalter (Brand schreibt final, DE/EN). Alle Bedingungen sind aus Ledger, Zählern oder vorhandenen Views messbar. **Kein** Stempel hängt an einer kcal-Untergrenze.

### Training

| ID              | Name DE / EN                | Bedingung (messbar)                                                                                            | Selt. | Feiertext (Absicht)                                                    |
| --------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------- |
| `first_workout` | Erster Satz / First Rep     | ≥ 1 abgeschlossenes Workout (`workouts.ended_at`)                                                              | C     | „Der erste Strich im ø. Alles Weitere baut darauf auf.“                |
| `workouts_10`   | Zweistellig / Double Digits | 10 abgeschlossene Workouts                                                                                     | C     | „Zehn Mal hast du dich auf den Weg gemacht. Das ist keine Laune mehr.“ |
| `workouts_50`   | Stammgast / Regular         | 50 Workouts                                                                                                    | R     | „Fünfzig Einheiten. Die Hantel kennt dich beim Namen.“                 |
| `workouts_100`  | Hundertschaft / Centurion   | 100 Workouts                                                                                                   | S     | „Hundert Mal angetreten. Das macht dir niemand mehr nach.“             |
| `first_pr`      | Neue Bestmarke / New Best   | erster Wert in `v_exercise_progress`, bei dem `estimated_1rm_kg` eine frühere Woche derselben Übung übertrifft | C     | „Stärker als letzte Woche. Genau so fühlt sich Fortschritt an.“        |
| `volume_10t`    | Zehn Tonnen / Ten Tonnes    | Summe `volume_kg` aus `v_exercise_progress` ≥ 10.000 kg                                                        | R     | „Du hast zehn Tonnen bewegt. Etwa zwei Elefanten, die dir danken.“     |
| `plus_10`       | Plus zehn / Plus Ten        | geschätztes 1RM einer Übung ≥ 10 % über dem ersten Wert (mind. 4 Wochen Verlauf, `useExerciseTrends`)          | R     | „Zehn Prozent mehr als am Anfang. Das ist echte Arbeit.“               |
| `all_rounder`   | Allrounder / All-Rounder    | in einer Woche ≥ 1 Kraft- und ≥ 1 Cardio-/Sport-Workout                                                        | C     | „Kraft und Ausdauer in einer Woche. Abwechslung steht dir.“            |

### Ernährung

| ID                 | Name DE / EN                           | Bedingung                                                                                                               | Selt. | Feiertext                                                                |
| ------------------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------ |
| `first_meal`       | Erster Bissen / First Bite             | ≥ 1 Eintrag in `food_logs`                                                                                              | C     | „Die erste Mahlzeit steht. Ab jetzt hat dein Tag ein Gesicht.“           |
| `three_meals`      | Drei Mahlzeiten / Three Meals          | an einem Tag Einträge mit Frühstück, Mittag und Abend                                                                   | C     | „Alle drei Hauptmahlzeiten im Bild. Ein ganzer Tag.“                     |
| `meals_100`        | Hundert Teller / A Hundred Plates      | 100 Einträge                                                                                                            | C     | „Hundert Mahlzeiten festgehalten. Du kennst deinen Teller.“              |
| `meals_500`        | Fünfhundert / Five Hundred             | 500 Einträge                                                                                                            | R     | „Fünfhundert Mal hingeschaut. Das ist Wissen über dich selbst.“          |
| `well_fuelled`     | Gut getankt / Well Fuelled             | Trainingstag (Workout abgeschlossen) mit ≥ 3 Einträgen und Aufnahme zwischen 90 % und 115 % des Tageslimits inkl. Bonus | R     | „Du hast das Training aufgegessen. So wirst du stärker, nicht nur müde.“ |
| `protein_week`     | Eiweißwoche / Protein Week             | Protein-Ring einer Woche geschlossen (≥ 4 Tage ≥ 85 % des Ziels)                                                        | C     | „Eine Woche lang genug Protein. Deine Muskeln sagen danke.“              |
| `protein_streak_4` | Vier Eiweißwochen / Four Protein Weeks | Protein-Ring in 4 aufeinanderfolgenden Wochen                                                                           | R     | „Vier Wochen Eiweiß-Verlässlichkeit. Das ist Fundament.“                 |
| `bridge_day`       | Die Brücke / The Bridge                | Workout beendet und innerhalb von 3 Stunden danach ≥ 25 g Protein geloggt (Mahlzeit nach `ended_at`)                    | H, C  | „Training, dann Teller. Genau die Verbindung, für die møni gemacht ist.“ |

### Konsistenz

| ID               | Name DE / EN                        | Bedingung                                                                              | Selt. | Feiertext                                                      |
| ---------------- | ----------------------------------- | -------------------------------------------------------------------------------------- | ----- | -------------------------------------------------------------- |
| `first_takt`     | Erster Takt / First Beat            | erste abgeschlossene Takt-Woche                                                        | C     | „Die erste Woche im Takt. Der Rhythmus beginnt.“               |
| `rhythm_4`       | Vier im Takt / Four in Rhythm       | `rhythm.current ≥ 4` (oder `best ≥ 4`)                                                 | C     | „Vier Wochen in Folge. Aus Zufall wurde Gewohnheit.“           |
| `rhythm_12`      | Ein Quartal / A Quarter             | `best ≥ 12`                                                                            | S     | „Zwölf Wochen im Takt. Ein ganzes Quartal Verlässlichkeit.“    |
| `rhythm_26`      | Halbjahr / Half a Year              | `best ≥ 26`                                                                            | S     | „Ein halbes Jahr. Du bist nicht mehr dabei, du bist drin.“     |
| `full_week`      | Volle Woche / Full Week             | alle sichtbaren Ringe einer Woche geschlossen                                          | R     | „Essen, Training, Protein: alles in einer Woche. Rund.“        |
| `full_week_4`    | Vier volle Wochen / Four Full Weeks | 4 volle Wochen insgesamt                                                               | S     | „Vier runde Wochen. Das ø ist komplett.“                       |
| `comeback`       | Zurück im Takt / Back in Rhythm     | Takt-Woche nach ≥ 2 aufeinanderfolgenden Wochen ohne Takt                              | R     | „Du bist wieder da. Das zählt mehr als jeder Streak.“          |
| `good_pause`     | Gute Pause / Good Pause             | nach einer Pause (≥ 5 Tage) innerhalb von 3 Tagen wieder ≥ 2 Einträge oder ein Workout | C     | „Pause gemacht, zurückgekommen. So geht Rhythmus.“             |
| `weekend_keeper` | Wochenend-Halter / Weekend Keeper   | an 4 Wochenenden hintereinander Samstag und Sonntag gehalten                           | R     | „Vier Wochenenden im Takt. Das ist die schwierigste Strecke.“  |
| `full_month`     | Ganzer Monat / Whole Month          | Kalendermonat, in dem jede Woche (die ≥ 4 Tage im Monat hat) eine Takt-Woche ist       | S     | „Ein ganzer Monat im Takt. Dein Monatsmuster ist geschlossen.“ |

### Körper

| ID              | Name DE / EN                               | Bedingung                                                                                                         | Selt. | Feiertext                                                             |
| --------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------- |
| `first_weigh`   | Erste Waage / First Weigh-in               | ≥ 1 Eintrag in `weight_logs`                                                                                      | C     | „Der Startpunkt ist gesetzt. Jetzt zählt der Verlauf, nicht der Tag.“ |
| `trend_ready`   | Trend steht / Trend Unlocked               | ≥ 8 Gewichtseinträge in 4 Wochen (Voraussetzung adaptiver TDEE, PLAN §6.7)                                        | C     | „Genug Daten für einen echten Trend. Ab jetzt rechnet møni mit dir.“  |
| `adaptive_on`   | Dein Körper redet mit / Your Body Talks    | erster Eintrag in `tdee_estimates` für den Nutzer (Premium)                                                       | R     | „møni hat dein Limit an deinen echten Verbrauch angepasst.“           |
| `body_goal_2kg` | Zwei Kilo Richtung Ziel / Two Kilos Closer | Trendgewicht ≥ 2 kg in Zielrichtung (`goal`), nur wenn BMI nach Bewegung im gesunden Bereich                      | R     | „Zwei Kilo in die richtige Richtung. Ruhig und stetig.“               |
| `strong_as_you` | Eigengewicht gestemmt / Bodyweight Lift    | geschätztes 1RM einer Grundübung ≥ aktuelles Körpergewicht                                                        | R     | „Du bewegst dein eigenes Körpergewicht. Respekt.“                     |
| `goal_reached`  | Angekommen / Arrived                       | Trendgewicht innerhalb 0,3 kg des Zielgewichts (`target_weight_kg`), nur wenn gesunder BMI und Ziel `lose`/`gain` | S     | „Du bist da. Zeit, durchzuatmen und das Neue zu planen.“              |

_Hinweis:_ `goal_reached` löst zusätzlich eine Karte „Wie geht es weiter?“ aus (Halten / neues Ziel), kein Fanfarenstoß. Bei Zielgewicht unter gesundem BMI wird der Stempel gar nicht vergeben.

### Entdecker

| ID               | Name DE / EN                      | Bedingung                                                                          | Selt. | Feiertext                                                                        |
| ---------------- | --------------------------------- | ---------------------------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------- |
| `first_photo`    | Erster Schnappschuss / First Snap | erster Eintrag mit `source = 'photo'`                                              | C     | „Foto gemacht, Teller erkannt. Das geht jetzt immer so schnell.“                 |
| `first_voice`    | Gesprächig / Talkative            | erster Eintrag `source = 'voice'`                                                  | C     | „Sprechen statt tippen. Praktisch, oder?“                                        |
| `first_label`    | Kleingedrucktes / Fine Print      | erster Eintrag `source = 'label'`                                                  | C     | „Du liest Etiketten. Das haben nicht viele.“                                     |
| `scanner_25`     | Scanner / Scanner                 | 25 Einträge mit `source = 'barcode'`                                               | C     | „Fünfundzwanzig Scans. Du bist schneller als die Kasse.“                         |
| `first_favorite` | Lieblingsessen / Favourite        | erstes Element in `favorite_meals`                                                 | C     | „Dein erstes Lieblingsessen ist gespeichert. Nächstes Mal ein Tap.“              |
| `own_exercise`   | Eigene Übung / Own Move           | erste eigene Übung (`exercises.owner_id = user`)                                   | C     | „Eine Übung, die es nur bei dir gibt.“                                           |
| `health_linked`  | Verbunden / Connected             | Apple Health aktiv **und** ≥ 1 importiertes Workout (`kcal_source = 'healthkit'`)  | C     | „Dein Training aus Health ist im Tag angekommen.“                                |
| `pattern_found`  | Muster erkannt / Pattern Found    | erster Korrelations-Hinweis in Insights sichtbar (`MIN_CORRELATION_DAYS` erreicht) | R     | „Genug Tage für ein Muster. møni sieht, wie Essen und Training zusammenspielen.“ |
| `reviews_4`      | Rückblick-Leser / Review Reader   | 4 Wochenrückblicke bis zum Ende angesehen (`achv:events`)                          | C     | „Vier Mal zurückgeschaut. Wer reflektiert, bleibt dran.“                         |
| `shared_first`   | Weitergegeben / Passed It On      | erste geteilte Karte (Share-Sheet abgeschlossen)                                   | H, C  | „Du hast etwas Schönes geteilt. Danke.“                                          |
| `one_year`       | Ein Jahr møni / One Year          | Konto ≥ 365 Tage **und** in den letzten 30 Tagen ≥ 8 gehaltene Tage                | S     | „Ein Jahr. Dein ø hat Geschichte.“                                               |

**Nicht aufgenommen (bewusst):** „Tag unter Limit“, „Defizit-Woche“, „Gewichtsverlust-Tempo“, „Fastentage“, „nie Snacks“, „perfekter Tag“ (kcal-genau). Begründung siehe Leitplanke L.

---

## 4. Signature-Screens neu gedacht

Konvention in den Wireframes: `[ ]` = Bedienelement, `(ø)` = Tages-ø, `~` = animiert, `░` = ausgefüllter Bereich. Gesamtbreite ~ iPhone-Breite, Abstände nicht maßstäblich. Alle Elemente bleiben im vorhandenen Design-System: `Card`, `SectionHeader`, `GlassActionButton`, native Tab-Bar, Farb-Tokens (`tint`, `bonus`, `destructive`).

### 4.0 Das Bild-Prinzip: Tages-ø

Ein Kreis (Essen, der bestehende `KcalRing`) und ein diagonaler Strich durch ihn (Training). Es ist die **eine** Grafik, die in der ganzen App wiederkehrt: Today-Hero, Workout-Summary, Monatsmuster, Wochen-Wrapped, Share-Cards, Profil-Siegel, leere Zustände. Der Strich ist anfangs gestrichelt (Trainingstag geplant), wird beim Abschluss eines Workouts „gezeichnet“ und lässt das Bonus-Segment (`bonus`/Orange) in den Ring fließen. Ruhetag: kleiner Punkt statt Strich. **[Abstimmung]** Mark/Illustration entscheidet die Form; ich definiere nur die Zustände:

| Zustand              | Ring                         | Strich                            |
| -------------------- | ---------------------------- | --------------------------------- |
| Leer / neu           | Umriss, dünn                 | keiner                            |
| Essen läuft          | gefüllt nach kcal-Anteil     | keiner oder gestrichelt (geplant) |
| Trainingstag geplant | wie oben                     | gestrichelt                       |
| Training erledigt    | wie oben + Bonus-Segment     | durchgezogen, `bonus`-Farbe       |
| Ruhetag gehalten     | gefüllt                      | Punkt                             |
| Über dem Limit       | zweite Runde, weich, neutral | –                                 |

### 4.1 Today – der Hero

**Ziel:** In einer Sekunde sehen „Wo stehe ich heute, was ist als Nächstes sinnvoll?“, und ein Grund sein, die App mehrmals am Tag zu öffnen.

**Wireframe (neu):**

```
┌──────────────────────────────────────────┐
│  Heute                                   │  <- Titel bleibt (BUG-B dynamisch)
│                                          │
│  Guten Abend, Lena.                      │  <- Tageszeit-Begrüßung (§5.1)
│  Du hast heute stark trainiert.          │  <- "Tagessatz" (1 Zeile, kontextuell)
│                                          │
│            ╭───────────╮                 │
│           ╱   ░░░░░░    ╲   /            │
│          │  ░░ 1.640 ░░  │ /   <- Tages-ø│
│          │  ░░ noch  ░░  │/              │
│          │     700       /               │  Ring = Essen, Strich = Training
│           ╲   kcal    /╱                 │  Bonus +320 fließt orange in den Ring
│            ╰────────/──╯                 │
│        2.020 Basis + 320 Training  [i]   │  <- "Warum"-Zeile (P4), tippbar
│                                          │
│  Diese Woche                  Takt: 7    │
│  ◉ Mo ◉ Di ◌ Mi ◉ Do ◐ Fr  ·  ·          │  <- Takt-Streifen: 7 Tages-ø
│  Essen 4/5   Training 2/3   Protein 2/4  │  <- Dreiklang, 3 Mini-Ringe
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ NÄCHSTER SCHRITT                     │ │  <- "Next Best Step" (1 Karte)
│ │ Nach dem Training: 35 g Protein      │ │
│ │ [ Skyr mit Beeren – 1 Tap ] [ Anderes ]│ │
│ └──────────────────────────────────────┘ │
│                                          │
│  Ernährung    P ▓▓▓▓░ 96/150 g           │
│               K ▓▓▓░░ …    F ▓▓░░ …      │
│  Training heute: Push  ✓ 52 min          │  <- NEU: Trainingskarte (fehlt heute)
│  Frühstück · Mittag · Abend · Snack      │
│                                          │
│            [ + Mahlzeit hinzufügen ]     │  <- GlassActionButton (BUG-A klärt Lage)
└──────────────────────────────────────────┘
```

**Neue Elemente:**

1. **Begrüßung + Tagessatz** (zwei Zeilen). Der Tagessatz ist ein Satz, der **aus Daten** gewählt wird (§5.1), kein Zufall.
2. **Tages-ø als Hero.** Der bestehende `KcalRing` (Skia, `computeKcalRingModel`) bekommt den Strich und die Zentrumsinfo „noch X kcal“ (oder „X kcal drüber“ neutral). Antippen = Wechsel zur Erklärung („Basis + Training“) mit der Aufschlüsselung, die heute nur als Textzeile `includesBonus` existiert.
3. **Takt-Streifen + Dreiklang.** Sieben Mini-ø (Mo–So) + drei Zahlen. Antippen öffnet das **Woche-Blatt** (Formsheet, `FULL_SHEET_OPTIONS`): Ringe groß, Rhythmus, Gnade, Pause-Schalter.
4. **Nächster Schritt.** Genau **eine** Karte, die aus dem Zustand abgeleitet wird (§5.3). Ersetzt Dauer-Buttons. Beispiele: noch nichts geloggt am Vormittag → „Frühstück festhalten“; Training erledigt → Protein-Vorschlag aus Favoriten (PLAN §6.6, fehlt heute); Trainingstag ohne Workout → „Heute ist Trainingstag. Starten?“; abends → „Tag abschließen“.
5. **Trainingskarte** (fehlte): geplant / erledigt / Ruhetag. Daten: `usePlannedDay`, `useWorkoutsForDate` (Contract vorhanden).
6. **Ruhetag-Tap** auf Ruhetagen: Karte „Ruhetag. Auch das gehört dazu. [Ruhetag genießen]“.

**Was Today einzigartig møni macht:**

- **Das Tages-ø:** Training verändert sichtbar den Essens-Ring. Kein anderes Tracking-Produkt zeigt Essen und Training in **einer** Form, die man auch ohne Beschriftung versteht.
- **Der Satz des Tages:** jedes Mal eine Beobachtung aus den eigenen Daten, die die zwei Welten verbindet („Heute ist Trainingstag: Dein Limit ist um 320 kcal höher.“).

**Mikro-Interaktionen:**

- Mahlzeit speichern → Rückkehr auf Today: neues Ring-Segment wächst mit leichtem Federn (`Haptics.impact(light)`), dann kurzes Pulsieren der Protein-Leiste um den Beitrag.
- Protein-Ziel erreicht (erstes Mal an dem Tag): Protein-Leiste „rastet ein“ (kurzer Haptik-Klick, `selectionAsync`), kein Overlay.
- Workout beendet → Rückkehr: der Strich wird gezeichnet, Bonus-Segment fließt ein (Motion-Team definiert Dauer; Reduce Motion: sofort statt animiert).
- Ring-Antippen: Flip zwischen „noch X“ und „Basis + Training“.
- Swipe auf Tage (existiert): die Tagesinfo und der Streifen wechseln mit; vergangene Tage zeigen das fertige Tages-ø („so sah der Tag aus“) und keinen Tagessatz.
- Über dem Limit: Ring läuft weich weiter (zweite, dünnere Runde), Text neutral („etwas mehr heute, kann passieren“), keine Warnfarbe.

**Personality-Momente:** Tageszeit-Gruß, Wochentag-Variante (Montag „frisch“, Freitag „fast geschafft“, Sonntag „Rückblick wartet“), 1-mal pro Tag ein „Tagesfund“ (z. B. „Dein Frühstück liegt heute bei 28 g Protein“, optional).

**Daten:** alle bereits da – `useDailyTargets`, `useFoodTotals`, `useWorkoutsForDate`, `usePlannedDay`, `useProfile` (`display_name`); neu nur Ledger/Rhythmus (§2).

### 4.2 Onboarding-Result: „Dein Plan“

**Ziel:** Der Moment, in dem sich 19 Fragen auszahlen, und die **Einführung des Konzepts** (zwei Tagesformen, ein Plan). Der heutige Screen (`app/(onboarding)/result.tsx`) hat bereits Ruhetag-/Trainingstag-Karten mit Count-up und Prognosekurve; er erklärt aber nicht das Tages-ø, und er endet ohne Ritual.

**Wireframe:**

```
┌──────────────────────────────────────────┐
│  [Fortschritt voll]                       │
│                                           │
│  Dein Plan, Lena.                         │
│  Zwei Tage, ein System.                   │
│                                           │
│   ╭────╮                  ╭────╮          │
│   │ ø  │   Ruhetag        │ ø/ │ Training │  <- zwei Tages-ø, wachsen nacheinander
│   │    │   2.020 kcal     │    │ 2.340    │     ("Training" zeichnet den Strich)
│   ╰────╯   P 150 g        ╰────╯ +320     │
│                                           │
│  Dein Takt                                │  <- NEU: Wochenrhythmus-Vorschau
│  Essen 5 Tage · Training 3 · Protein 4    │     (aus Schedule/Onboarding vorbelegt)
│  [ − ] anpassen [ + ]                     │
│                                           │
│  ┌ Prognose ─────────────────────────┐   │
│  │ ⟋⟋⟋ Kurve (wie heute) → 12. Jan.   │   │
│  └───────────────────────────────────┘   │
│                                           │
│  Halte den Finger gedrückt, um zu starten │  <- Handschlag-Ritual
│          [  ◯ ← füllt sich beim Halten ]  │
└──────────────────────────────────────────┘
```

**Neue Elemente:**

- Zwei **Tages-ø nebeneinander**, die erste Erklärung der Marke: links nur Ring (Ruhetag), rechts Ring + Strich + Bonus. Reihenfolge der Animation: links, kurz Pause, rechts mit Strich, der den Bonus „einlädt“.
- **Dein Takt**: Dreiklang-Ziele aus dem Onboarding vorbelegt (`workouts_per_week` aus Schedule, Rest Standard), mit Stepper (`@expo/ui` Stepper steht zur Verfügung). Das legt den Grundstein für Rhythmus und kostet keinen weiteren Screen.
- **Handschlag-Ritual (Halten zum Starten):** Long-Press füllt einen Ring (ansteigende Haptik, `impact` leicht → stark → `success`); bei Loslassen vor Ende läuft der Ring zurück. Danach folgt der nächste Schritt (Health-Primer etc.). Das ist der **Branding-Moment** des Onboardings.

**Einzigartig møni:** (1) die zwei Tages-ø erklären das gesamte Produkt in drei Sekunden, (2) der Plan enthält von Anfang an eine Wochenform (Takt), nicht nur eine Zahl.

**Mikro-Interaktionen:** Count-up wie heute; Namens-Einblendung zuletzt; Haptik am Ende des Haltens; Reduce Motion: kein Füll-Animation, stattdessen Button „Los geht’s“.

**Daten:** `useDraftProjection()`, `computeGoalProjection`, Schedule-Entwurf – alles vorhanden. Neu: Dreiklang-Ziele im Draft (Versionssprung des Stores nötig, siehe CLAUDE.md „bump version“) und beim Profil-Anwenden lokal als `rhythm:goals:<uid>` ablegen.

### 4.3 Workout-Summary

**Ziel:** Das Workout wird zum Moment („geschafft“) **und** zur Brücke zurück zum Essen (der Kern der App). Heute: Häkchen, Zahlen, Bonus-Karte, PR-Liste.

**Wireframe:**

```
┌──────────────────────────────────────────┐
│               Geschafft.                  │
│                                           │
│            ╭───────────╮                  │
│           │   ø  ⟋     │  ~ Strich wird   │  <- Hero: der Strich zeichnet sich
│            ╰───────────╯     gezeichnet   │
│                                           │
│   52 min      6.420 kg      418 kcal      │  <- 3 Zahlen wie heute
│   vs. Push letzte Woche:  +8 % Volumen    │  <- NEU: Vergleich mit dem eigenen Mal davor
│                                           │
│ ┌ Das Training fließt in deinen Tag ────┐ │
│ │ +293 kcal auf dein Limit  → 2.313     │ │  <- Bonus als lebende Zeile, Zahl zählt hoch
│ │ Heute noch: 35 g Protein              │ │
│ │ [ Skyr mit Beeren ] [ Quark ] [ + ]   │ │  <- Favoriten, 1 Tap loggt (PLAN §6.6)
│ └────────────────────────────────────────┘ │
│                                           │
│  Diese Woche: Training 2/3  ◉ ◉ ◌          │  <- Wochenring schließt sich ein Stück
│                                           │
│  Bestmarken & Stempel (nur wenn vorhanden)          │
│  Neue Bestmarke: Bankdrücken 82 kg (+2)   │
│  Stempel: "Zehn Tonnen" freigeschaltet    │
│                                           │
│  [ Karte teilen ]        [ Fertig ]       │
└──────────────────────────────────────────┘
```

**Neue Elemente:**

- **Das Strich-Ritual:** der Strich im Tages-ø zeichnet sich; direkt danach läuft die Bonus-Zahl hoch („+293 kcal auf dein Limit“).
- **Protein-Brücke** (fehlt heute komplett, steht aber in PLAN §6.6): die Karte schlägt aus Favoriten/Zuletzt Mahlzeiten mit ≥ 25 g Protein vor (`useQuickLogEntries`, bereits vorhanden, nur nach Protein filtern/ranken), 1 Tap = geloggt über `useQuickLogMeal`.
- **Vergleich mit dem letzten Mal** (gleiche Routine, sonst gleiche Kategorie) in Prozent Volumen, nie als Urteil („+8 %“ oder „gleich“; bei weniger: „ruhiger als letztes Mal“ ohne Minuszeichen).
- **Wochenring Training**, sichtbar einen Schritt weiter.
- **Teilen** (Workout-Karte, §7).
- Stempel-Freischaltungen werden **hier** gezeigt (nicht als Pop-up später).

**Einzigartig møni:** (1) die Summary erzählt, was das Training **mit dem Essen macht** (Bonus + Protein-Brücke), (2) das gezeichnete ø.

**Mikro-Interaktionen:** Haptik `notificationAsync(success)` beim Strich; die PR-Zeile bekommt einen leichten Glanz; Bonus-Zahl zählt hoch (`CountUpText` existiert); Reduce Motion: alles sofort.

**Daten:** Params (Dauer, kcal, Volumen, Bonus, PRs) existieren. Für den Vergleich: letztes Workout derselben Routine aus `useWorkoutHistory`/Historie (vorhanden). Wochenzähler: Ledger/`useWeekRings`.

### 4.4 Insights → Wochenrückblick („Wrapped“, teilbar)

**Ziel:** Jeden Sonntag ein 30-Sekunden-Moment, der sich gut anfühlt und zeigt, was die zwei Welten zusammen getan haben. Heute: Archiv aus Karten. Das Archiv bleibt, bekommt aber oben den Rückblick.

**Einstieg:** Insights-Tab oben eine Karte „Dein Wochenrückblick ist da“ (ab Sonntag 17:00 bis Mittwoch; danach im Archiv). Antippen öffnet **Vollbild-Stories** (`fullScreenModal`, wie `workout/*`), Tap rechts = weiter, Tap links = zurück, Fortschrittspunkte oben, Wisch nach unten schließt.

**Story-Karten (7, mit Datenquelle):**

```
 1 EINSTIEG        2 DEINE WOCHE      3 HIGHLIGHT       4 DIE VERBINDUNG
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│  Woche 41  │    │  (ø)(ø)(ø) │    │ Bestmarke  │    │ Trainingstage│
│   ╭──╮     │    │ (ø)(ø)(·)(·)│    │ Bankdrücken│    │ Ø 142 g Prot.│
│   │ø ⟋│     │    │ 4 Tage Ess.│    │  82 kg     │    │ Ruhetage     │
│   ╰──╯     │    │ 3 Trainings│    │  +2 kg     │    │ Ø 118 g      │
│ "Eine runde│    │ 5 Mahlzeiten│   │            │    │ "Ihr zwei    │
│  Woche."   │    │ /Tag       │    │            │    │  arbeitet    │
└────────────┘    └────────────┘    └────────────┘    │  zusammen."  │
 5 KÖRPER          6 RHYTHMUS         7 AUSBLICK       └────────────┘
┌────────────┐    ┌────────────┐    ┌────────────┐
│ Trend -0,3 │    │ Takt: 8    │    │ Nächste Wo.│
│ kg (4 Wo.) │    │ Stufe:     │    │ Ziel: 3 Tr.│
│ (nur wenn  │    │ Gleichschr.│    │ [Ziel +/−] │
│ ≥ 4 Werte) │    │ [Teilen]   │    │ [Teilen]   │
└────────────┘    └────────────┘    └────────────┘
```

**Auswahlregeln (damit jede Woche eigen wirkt):**

- Karte 3 (Highlight) wählt die erste zutreffende Quelle: neuer PR → längste Trainingseinheit → bester Protein-Tag → „Frühster Eintrag der Woche“.
- Karte 4 nur, wenn `compareTrainingDays` genug Daten hat (≥ 3 Tage je Gruppe; Funktion existiert). Sonst fällt sie weg.
- Karte 5 nur bei ≥ 4 Gewichtseinträgen im Zeitraum (sonst entfällt, **kein** „zu wenig Daten“-Hinweis in den Stories).
- Titel der Woche (Karte 1) deterministisch: _Volle Woche_, _Kraftwoche_ (≥ 3 Krafttage), _Erholungswoche_ (≤ 1 Training, Essen ok), _Neustart-Woche_ (erste Takt-Woche nach Pause), _Ruhige Woche_ (Fallback). Eine ruhige Woche wird nie als schlecht bezeichnet.
- Wochen mit Pause oder ohne Daten: keine Stories, nur die ruhige Zeile „Diese Woche war Pause. Willkommen zurück, wenn du so weit bist.“

**Teilen:** Karte 1, 2, 6 oder 7 als Share-Card (§7).

**Einzigartig møni:** (1) die Karte „Die Verbindung“ (Essen ↔ Training) gibt es in keinem reinen Food- oder Workout-Tracker, (2) die Titel-Logik („Erholungswoche“) macht auch schwache Wochen sinnvoll.

**Mikro-Interaktionen:** Haptik leicht pro Karte, Zahlen zählen hoch, Tages-ø zeichnen sich nacheinander (Mo–So), Reduce Motion: statisch.

**Daten:** Ledger + `compareTrainingDays` (existiert), `useWeightTrend`, `v_exercise_progress` für PRs. Kein Speicher: ein beliebiges Wochenende lässt sich aus dem Ledger neu erzeugen („Archiv“).

**Insights-Tab insgesamt neu geordnet:**

1. Wochenrückblick-Karte (oder Monat/Teaser)
2. **Muster** (promovierte Korrelationen, heute ganz unten)
3. Gewicht
4. Kalorien
5. Training / Kraft
6. Freischalt-Fortschritt, falls Daten fehlen (Empty-State, §4.7)

### 4.5 Profile → „Mein møni“

**Ziel:** Identität statt Einstellungsliste. Die vorhandene Liste (Limits, Körper, Ziele, Aktivität, Präferenzen) bleibt, rutscht aber nach unten.

```
┌──────────────────────────────────────────┐
│  Profil                                   │
│                                           │
│        ╭───────╮                          │
│        │  (ø)  │ ← Siegel; Bogen = Fortschritt zur nächsten Stufe
│        ╰───────╯                          │
│         Lena                              │
│         Gleichschritt · seit März         │
│         Takt 7 · beste Serie 9            │
│                                           │
│  Stempel   12 von 43   ▸  [◉][◉][◉][ ][ ] │  <- Regal (Horizontal-Scroll), "als Nächstes" Hinweis
│  Monate    ▸ [Sep][Aug][Jul] …            │  <- Sammlung der Monatsmuster
│                                           │
│  Dein Plan                                │  <- bestehende Gruppen
│  Heute Ruhetag / Trainingstag  Limit…     │
│  Körper · Ziele · Aktivität · Präferenzen │
│  Mitteilungen · Apple Health · Konto      │
└──────────────────────────────────────────┘
```

**Einzigartig møni:** (1) das Siegel, das sich mit den Stufen verändert (Illustration liefert 6 Zustände), (2) die Monatssammlung, ein Regal eigener Muster statt generischer Orden.

**Mikro-Interaktionen:** Siegel antippen = kleine Drehung/Glanz (Haptik leicht). Beim Stufenaufstieg einmalige Animation. Lange drücken auf einen Stempel: Details und Datum.

**Datenschutz-Option:** „Profil nur für mich“ gibt es nicht als Schalter, weil alles lokal ist. Teilen ist immer eine bewusste Aktion (§7).

**Daten:** `useProfile` (`display_name`, `created_at`), Ledger/Rhythmus/Achievements (neu).

### 4.6 Food-Review

**Ziel:** Der Moment nach dem KI-Ergebnis fühlt sich nach „Ich verstehe, was das mit meinem Tag macht“ an, nicht nach Formular. Heute (`app/food-review.tsx`): editierbare Zutatenliste, Gramm, Portion-Slider, Confidence, Favorit, Speichern.

**Wireframe:**

```
┌──────────────────────────────────────────┐
│  Gefunden: Skyr mit Beeren                │  <- Titel; Zutaten fliegen gestaffelt ein
│  ◉◉◉○ Ich bin ziemlich sicher             │  <- Confidence in Worten + Punkten
│                                           │
│  Skyr           200 g   130 kcal  22 g P  │
│  Beeren          80 g    40 kcal          │
│  Honig           10 g    30 kcal          │
│  [ + Zutat ]        Portion ◀─●──▶ 1,0×   │
│                                           │
│ ┌ Das bedeutet für heute ───────────────┐ │
│ │ (kleines ø, Ghost-Segment)             │ │  <- NEU: Wirkung auf den Tag
│ │ Danach noch 540 kcal · Protein 96→118 g│ │
│ │ Protein-Ziel: 79 %                     │ │
│ └────────────────────────────────────────┘ │
│  ☆ Als Favorit speichern                  │
│          [ Speichern · Frühstück ]        │
└──────────────────────────────────────────┘
```

**Neu:**

- **„Das bedeutet für heute“:** Mini-ø mit **Ghost-Segment** (blasses Vorab-Segment der Mahlzeit) und zwei Zeilen: neues „noch X kcal“ und Protein-Fortschritt. Ändert sich live mit Gramm/Portion. Daten: `useDailyTargets(date)`, `useFoodTotals(date)` (beide vorhanden; `date` kommt bereits als Draft-Feld aus L1).
- Auf Trainingstagen: Zusatz „Trainingstag: Dein Limit enthält +293 kcal“ (die Verbindung wieder sichtbar).
- **Confidence in Worten** statt Prozent: >0,8 „Ich bin sicher“, 0,5–0,8 „Ziemlich sicher“, <0,5 „Schau bitte kurz drauf“ mit dem Hinweis, welche Zutat am unsichersten ist (aus `ai_confidence` / `clarification`).
- **Speichern-Bestätigung:** Der Button zeigt Mahlzeit-Typ („Speichern · Frühstück“), Tippen = Haptik `success`, Review schließt, Today zeigt den neuen Ring-Zuwachs.

**Einzigartig møni:** das Ghost-Segment („das macht diese Mahlzeit mit deinem Tag“) und der Training-Bezug in einer einzigen Zeile.

**Mikro-Interaktionen:** Zutaten fliegen gestaffelt ein (je 60 ms); Slider mit Haptik an Presets (0,5/1/1,5/2); Gramm-Eingabe aktualisiert das Ghost-Segment fließend; Reduce Motion: kein Fliegen.

### 4.7 Empty- & First-Run-Zustände

**Prinzip:** Jeder leere Zustand zeigt **Fortschritt zu einem Freischalten**, nie nur „keine Daten“.

**Today beim ersten Start (nach Onboarding/Sign-up):**

```
┌──────────────────────────────────────────┐
│  Willkommen, Lena.                        │
│  Dein erster Tag mit møni.                │
│                                           │
│         ╭ ─ ─ ─ ╮  ← leeres ø, Umriss      │
│         │ 2.020  │    (Limit ohne Bonus)  │
│         ╰ ─ ─ ─ ╯    Strich gestrichelt   │
│                                           │
│  Dein Start in drei Schritten             │
│  ☐ Erste Mahlzeit festhalten              │
│  ☐ Heute Gewicht notieren (optional)      │
│  ☐ Erstes Training oder Health verbinden  │
│                                           │
│          [ + Mahlzeit hinzufügen ]        │
└──────────────────────────────────────────┘
```

- Die Checkliste verschwindet nach Erledigung oder nach 7 Tagen. Jeder Haken = leichte Haptik; der letzte = der Stempel _Erster Bissen_ plus _Erste Waage_ usw.
- **Kein Gewicht vorhanden** (Today verlangt eins, `useDailyTargets` gibt sonst `null`): statt dem heutigen „Profil vervollständigen“-Kasten die Karte „Ein Gewicht fehlt noch, dann rechne ich dein Limit.“ mit direktem Eingabefeld. Das behebt eine echte Sackgasse im jetzigen Code.

**Insights leer (Freischalt-Fortschritt):** statt „Noch zu wenige Daten“ drei Fortschrittsbalken aus den Voraussetzungen von PLAN §6.7: _Tage mit Protokoll 4/14_, _Gewichtseinträge 2/8_, _Protokoll-Quote 60 %/80 %_. Überschrift „Noch 10 Tage bis dein Trend steht.“ So wird Warten zum Ziel.

**Training leer:** drei Einstiege als Karten: _Mit Vorlage starten_, _Leer starten_, _Apple Health verbinden_ (nur wenn `isHealthAvailable()`). Wochenring sichtbar mit „0 von 3“.

**Profil leer:** Siegel im Umriss („Anlauf“), Stempelregal mit 3 sichtbaren „nächsten“ Stempeln.

---

## 5. Rituale & Zeitgefühl

Vier feste Momente (Morgen, nach Training, Abend, Sonntag) plus Monatsende und Rückkehr. Jedes Ritual hat: Auslöser, Form, Dauer (< 15 s), Aus-Schalter.

### 5.1 Tageszeit-Begrüßung und „Tagessatz“

| Slot       | Zeit  | Ton / Absicht         | Beispiel-Absicht (Brand schreibt)                             |
| ---------- | ----- | --------------------- | ------------------------------------------------------------- |
| Morgen     | 05–10 | ruhig, vorausschauend | Plan des Tages in einem Satz (Trainingstag? Limit?)           |
| Mittag     | 10–14 | praktisch             | Erinnerung an das, was jetzt dran ist (Frühstück schon drin?) |
| Nachmittag | 14–18 | locker                | Zwischenstand, Snack-/Trainings-Idee                          |
| Abend      | 18–22 | warm, abschließend    | Bilanz, Brücke zum Tag-Schließen                              |
| Nacht      | 22–05 | sehr still            | keine Aufforderung, nur „Schlaf gut“-Ton; keine Zahlen        |

**Tagessatz (eine Zeile unter der Begrüßung, wählt die erste zutreffende Regel von oben):**

1. Fürsorge-Signal aktiv → kein Satz (stille Karte statt dessen).
2. Rückkehr nach ≥ 3 Tagen Pause → „Willkommen zurück“-Variante (§5.5).
3. Workout heute abgeschlossen und Protein < 60 % → Brücke zum Essen.
4. Workout heute abgeschlossen → „Stark. Dein Limit ist um X kcal gewachsen.“
5. Geplanter Trainingstag, noch kein Workout → „Heute ist Trainingstag. Dein Limit: X.“
6. Ruhetag → „Ruhetag. Erholung gehört zum Plan.“
7. Ring ≥ 90 % und < 115 % → „Rund. Das war ein ausgewogener Tag.“ (zweiseitiger Korridor, keine Lobpreisung von weniger)
8. Takt-Woche eben erreicht (zweiter Ring heute geschlossen) → „Diese Woche sitzt der Takt.“
9. Wochentag-Variante (Montag, Freitag, Sonntag).
10. Fallback: Datum + Name.

Jeder Satz hat **3 Varianten** (Rotation nach `dayOfYear % 3`), damit er nicht wie ein Roboter klingt. Regel: nie Anrede mit Name in zwei aufeinanderfolgenden Zeilen. Wenn `display_name` leer ist, Satz ohne Anrede.

```ts
// src/domain/rituals.ts
export type GreetingSlot =
  'morning' | 'midday' | 'afternoon' | 'evening' | 'night';
export function greetingSlot(hour: number): GreetingSlot;
export type DaySentenceKey =
  | 'bridgeToFood'
  | 'trainingGrewLimit'
  | 'trainingDay'
  | 'restDay'
  | 'balanced'
  | 'taktReached'
  | 'monday'
  | 'friday'
  | 'sunday'
  | 'welcomeBack'
  | 'default';
export function daySentence(ctx: {
  slot: GreetingSlot;
  weekday: number;
  isTrainingDay: boolean;
  workoutDone: boolean;
  eatenKcal: number;
  limitKcal: number;
  proteinEaten: number;
  proteinTarget: number;
  taktJustReached: boolean;
  daysAway: number;
  flagged: boolean;
}): { key: DaySentenceKey; variant: 0 | 1 | 2 };
```

### 5.2 Morgen-Check-in (optional, 5 s)

- **Auslöser:** erste Öffnung des Tages zwischen 05:00 und 11:00, einmal pro Tag, nur wenn aktiv (Opt-in beim ersten Mal nach 3 Tagen Nutzung).
- **Form:** kleine Karte oben auf Today statt Modal: „Heute: Trainingstag. Limit 2.340 kcal, Protein 150 g. Wie fühlst du dich? [müde] [okay] [stark]“.
- **Wirkung (lokal):** `ritual:checkin:<date>` = 1|2|3. „Müde“ → der Tagessatz ändert sich („Leichtes Training reicht“), „Nächster Schritt“ bietet eine kürzere Einheit; keine medizinische Aussage. Nach 14 Einträgen: Insight-Zeile „An Trainingstagen mit ‚stark‘ hast du im Schnitt Y g mehr Protein gegessen“ (nur Korrelation, dezent).
- **Nicht** als Pflicht, kein Einfluss auf Rhythmus.

### 5.3 „Nächster Schritt“ (die eine Karte)

Pure Funktion, die aus dem Zustand die **eine** sinnvollste nächste Handlung bestimmt (Prioritätsliste, erste zutreffende):

1. Fürsorge-Signal → keine Karte.
2. Kein Gewicht vorhanden → „Gewicht notieren“.
3. Workout heute fertig, Protein < 60 %, innerhalb 3 h nach Workout → Protein-Brücke.
4. Heute Trainingstag, kein Workout, Uhrzeit 07–20 → „Training starten“.
5. Slot Morgen/Mittag, Mahlzeit passend zum Slot fehlt → „Frühstück/Mittag festhalten“.
6. Slot Abend ≥ 20:00, ≥ 2 Einträge, Tag nicht abgeschlossen → „Tag abschließen“.
7. Wochentag Sonntag ≥ 17:00, Rückblick ungesehen → „Rückblick ansehen“.
8. Montag, ≥ 7 Tage seit Gewicht, Gewicht wiegen aktiv → „Gewicht notieren“.
9. nichts → Karte ausgeblendet (kein Füllen um jeden Preis).

```ts
export type NextStepKind =
  | 'logWeight'
  | 'proteinBridge'
  | 'startWorkout'
  | 'logMeal'
  | 'closeDay'
  | 'weeklyReview'
  | 'none';
export function nextBestStep(ctx: NextStepContext): {
  kind: NextStepKind;
  mealType?: MealType;
};
```

### 5.4 Abend-Check-in „Tag abschließen“

- **Auslöser:** nach 20:00, ≥ 2 Einträge oder ein Workout, Tag nicht abgeschlossen. Karte „Tag abschließen“ statt Modal; zusätzlich optionale Benachrichtigung (§6, Trigger 1).
- **Form:** Antippen öffnet ein kleines Blatt: das Tages-ø des Tages, eine Zeile Bilanz („1.940 von 2.340 kcal, 142 g Protein, Training ✓“), ein positiver Satz und eine Vorschau auf morgen („Morgen: Ruhetag, Limit 2.020“). Button **„Tag abschließen“**; bei < 70 % des Limits zusätzlich die Option „Habe noch nicht alles geloggt“ → Rückkehr zu „Mahlzeit hinzufügen“ (kein Vorwurf, nur Frage).
- **Wirkung:** der Tag bekommt ein ausgefülltes Tages-ø im Streifen (Tag _bestätigt_); lokal gespeichert. Kein Einfluss auf Rhythmus (der kommt aus Daten). Es ist ein **Ritual**, kein Kriterium.
- **Haptik:** `success`, danach leises Einrasten des Streifen-Punktes.

### 5.5 Willkommen-zurück-Blatt (ohne Schuldgefühl)

- **Auslöser:** Öffnung nach ≥ 3 Tagen Abwesenheit (aus `ritual:lastOpen`). Maximal einmal pro Rückkehr.
- **Inhalt nach Länge der Abwesenheit:**

| Abwesend  | Ton      | Inhalt                                                                                                                                                                                                               | Aktionen                                       |
| --------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 3–6 Tage  | locker   | „Schön, dass du wieder da bist.“ Rhythmus-Status ruhig („Dein Takt ist geschützt“, falls Gnade)                                                                                                                      | [Letzte Mahlzeit festhalten] [Einfach umsehen] |
| 7–20 Tage | herzlich | „Willkommen zurück.“ Wir zeigen das **Gehaltene**: Lebenszeit-Stufe, Anzahl Takt-Wochen. Keine Zahl zu Verpasstem. Pause-Angebot: „Warst du im Urlaub oder krank? [Als Pause markieren]“ (rückwirkend bis zu 7 Tage) | [Heute starten] [Pause eintragen]              |
| ≥ 21 Tage | Neustart | „Lass uns kurz abgleichen.“ Gewicht aktualisieren, Ziel prüfen, Plan neu berechnen (`useRecomputeTargetsIfDue` greift), Wochenziele senken anbieten                                                                  | [Gewicht eintragen] [Ziel prüfen]              |

- **Regeln:** niemals Zahlen zu „verpassten“ Tagen, nie „Du hast … nicht …“. Der erste Schritt ist immer klein (eine Mahlzeit, ein Tap).
- **Folge:** _Zurück im Takt_ und _Gute Pause_ (Achievements) belohnen die Rückkehr.

```ts
export type WelcomeBackKind = 'none' | 'short' | 'medium' | 'long';
export function welcomeBackKind(
  daysAway: number,
  lastShownDaysAgo: number | null,
): WelcomeBackKind;
```

### 5.6 Wochenabschluss am Sonntag

- **Auslöser:** Sonntag ab 17:00 (Karte in Insights und optionale Benachrichtigung 18:00, §6). Der Rückblick bleibt bis Mittwoch oben, danach im Archiv.
- **Inhalt:** Wochen-Wrapped (§4.4). Danach **eine** Frage („Nächste Woche: 3 Trainings?“), Antwort setzt nur das Wochenziel.
- **Rhythmus-Fenster:** Am Sonntagabend wird die Woche noch nicht abgeschlossen. Erst Montag 00:00 wird sie ausgewertet. Nutzer können sonntags nachtragen, ohne Druck.

### 5.7 Monatsrückblick

- **Auslöser:** 1. des Monats (erste Öffnung) – Karte oben auf Today („Dein September ist fertig“).
- **Form:** 4 Karten: Monatsmuster (Raster), Monatscharakter, 3 Zahlen (Takt-Wochen, Workouts, durchschnittliche Protein-Quote), eine Rückblick-Zeile. Ergebnis wird in die **Sammlung** gelegt.
- **Dauer:** ≤ 20 s. **Teilbar** (Monatskarte).

### 5.8 Stufenaufstieg und Stempel-Momente

- **Stempel freigeschaltet:** kleine Karte (Glass) von oben, 3 s, Haptik `success`, antippbar → Details. Gestapelt, nie mitten in einem Workout oder Eingabefluss; Auslieferung beim nächsten Wechsel auf Today oder in die Summary.
- **Stufenaufstieg:** ein einmaliges Vollbild-Moment (2–3 s, überspringbar), Siegel verändert sich, Titel wird genannt, Teilen-Option.

---

## 6. Benachrichtigungs-Strategie (lokal)

**Randbedingungen (CLAUDE.md):** nur lokale Mitteilungen (`expo-notifications`), kein Remote-Push (Personal Team). Konsequenz: Inhalt und Zeit werden **zum Planungszeitpunkt** festgelegt. Deshalb werden Nudges bei jeder relevanten Aktion neu geplant (nach Speichern einer Mahlzeit, Workout-Ende, App-Start, Foreground) und stornierte entfernt (z. B. Abend-Nudge, wenn der Tag schon erfasst ist). Es gibt keinen Hintergrund-Import (HealthKit läuft mit `background: false`), also hängt kein Nudge von nicht synchronisierten Health-Daten ab.

### 6.1 Frequenz-Regeln (hart)

- **Maximal 1 Mitteilung pro Tag**, **maximal 4 pro Woche** im Durchschnitt (Mahlzeiten-Erinnerungen ausgenommen, solange explizit eingeschaltet).
- **Ruhezeiten:** nie vor 08:00 und nie nach 21:30 Ortszeit.
- **Nie** während Pause, nie am Tag, an dem man schon aktiv war (Abend-Nudge entfällt), nie 2 Mal dieselbe Kategorie hintereinander.
- **Auto-Beruhigung:** wurden 3 Mitteilungen in Folge nicht geöffnet, wird die Kategorie 14 Tage ausgesetzt; nach 2 Aussetzern in Folge fragt die App in der nächsten Öffnung einmal: „Sollen wir leiser sein?“ (Optionen: weniger / nur Rückblicke / aus).
- **Interruption-Level:** immer `passive`; nie `timeSensitive`.
- **Heutige Standard-Erinnerungen (3×/Tag) werden Opt-in:** Standard wird 1 intelligenter Abend-Nudge; die Mahlzeiten-Erinnerungen (Frühstück/Mittag/Abend) bleiben, aber als eigene Kategorie, standardmäßig aus oder per Onboarding-Schritt „Möchtest du Essens-Erinnerungen?“ (Entscheidung Owner, die jetzige Sprint-2-Entscheidung war „an“).

### 6.2 Acht Trigger mit Text-Absicht

| #   | Trigger                 | Wann                                                                                  | Bedingung                                                      | Absicht des Texts (Brand schreibt)                                                                                  |
| --- | ----------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1   | **Abend-Notiz**         | 20:30                                                                                 | < 2 Einträge heute, kein Workout, nicht pausiert               | Freundliche Frage, nichts vergessen? Ein Tap bis zum Loggen. Kein „du hast nicht“.                                  |
| 2   | **Trainingstag-Morgen** | 08:30 (oder 1 h vor der üblichen Trainingszeit der letzten 4 Wochen, falls erkennbar) | Heute geplanter Trainingstag, noch kein Workout                | Einladung mit Zahl („dein Limit: X“). Der Bonus als Belohnung, nicht als Pflicht.                                   |
| 3   | **Protein-Brücke**      | 20–40 min nach Workout-Ende                                                           | Workout beendet, Protein < 60 %                                | Jetzt ein guter Moment für 30–40 g Protein. Tippen öffnet Quick-Log mit Favoriten.                                  |
| 4   | **Sonntag-Rückblick**   | So 18:00                                                                              | Woche hat Daten, nicht pausiert                                | „Dein Rückblick ist da.“ Neugier, kein Druck.                                                                       |
| 5   | **Waagen-Moment**       | gewählter Wochentag 08:00 (Standard Montag)                                           | Opt-in, ≥ 7 Tage seit letztem Gewicht                          | Kleine Erinnerung ans Wiegen, mit Hinweis, dass der Trend zählt, nicht die Zahl.                                    |
| 6   | **Takt-Chance**         | Do 18:00 (1× pro Woche)                                                               | Rhythmus ≥ 2 Wochen, Woche noch nicht im Takt, aber erreichbar | Chance-Formulierung („mit einem Training bist du diese Woche im Takt“), nie Verlust-Formulierung. Eigener Schalter. |
| 7   | **Tür offen**           | 3, 10 und 25 Tage nach letzter Öffnung (max. 3 insgesamt, danach 60 Tage Stille)      | Nicht pausiert                                                 | Einladung ohne Zahlen zu Verpasstem. Ein Satz, ein Tap, ein kleiner Schritt.                                        |
| 8   | **Monatsrückblick**     | 1. des Monats 09:30                                                                   | Monat hatte ≥ 7 gehaltene Tage                                 | „Dein [Monat] hat einen Charakter.“ Neugier-Haken auf den Monatscharakter.                                          |

_Nicht_ umgesetzt: „Streak in Gefahr“, Wettbewerbs-Nudges, Uhrzeit-Zwang („Isst du schon?“), Marketing.

### 6.3 Opt-out und Kontrolle

- **Profil → Mitteilungen:** Schalter pro Kategorie (_Mahlzeiten_, _Training_, _Rückblicke_, _Rhythmus_, _Gewicht_), globaler **Ruhe-Modus** (alles aus, bis ein Datum), Ruhezeiten wählbar.
- **Auf der Mitteilung selbst:** Aktionen (iOS-Kategorien) „Heute nicht mehr“ und „Weniger davon“ (setzt die Kategorie 14 Tage aus).
- **Ein Tap** bis zu den iOS-Systemeinstellungen, falls die Berechtigung entzogen ist (`getReminderPermission()` existiert).
- **Berechtigungs-Timing:** Der Mitteilungs-Primer wandert in der Empfehlung vom Ende des Onboardings (kein Wert gezeigt) zu **nach der ersten gespeicherten Mahlzeit** („Soll ich dich erinnern, wenn’s Zeit für den Rückblick ist?“). Erwartung: höhere Zustimmungsquote bei weniger Reibung. Entscheidung Owner (§8).

```ts
// src/domain/nudges.ts
export type NudgeKind =
  | 'eveningNote'
  | 'trainingMorning'
  | 'proteinBridge'
  | 'sundayReview'
  | 'weighIn'
  | 'taktChance'
  | 'doorOpen'
  | 'monthReview';
export interface NudgePlan {
  kind: NudgeKind;
  at: string /* ISO local */;
  payloadKey: string;
}
export interface NudgeState {
  lastSentByKind: Partial<Record<NudgeKind, string>>;
  ignoredStreak: Partial<Record<NudgeKind, number>>;
  mutedUntilByKind: Partial<Record<NudgeKind, string>>;
  sentThisWeek: number;
}
export function planNudges(args: {
  now: string;
  prefs: NudgePrefs;
  state: NudgeState;
  ledger: readonly LedgerDay[];
  rhythm: RhythmState;
  plan: { weekdays: ReadonlySet<number> };
  lastOpenDaysAgo: number;
  paused: boolean;
  lastWorkoutEndedAt: string | null;
}): NudgePlan[];
```

Planen = höchstens die nächsten 7 Tage vorab; pro Tag höchstens ein Eintrag; die Funktion ist rein und testbar.

---

## 7. Teilen & Viralität: Share-Cards

**Grundsatz:** Teilen ist immer eine bewusste Handlung, und die Karte enthält nur, was die Person sehen will. Keine Links, kein Tracking, keine Auto-Posts. Wertbasiert, nicht gewichtsbasiert.

### 7.1 Kartentypen

| Karte             | Moment                         | Inhalt (Daten)                                                                                          | Format                 |
| ----------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------- | ---------------------- |
| **Wochenkarte**   | Sonntag, Wrapped               | 7 Tages-ø, Woche-Titel, Zahlen: Trainingstage, Tage mit Protokoll, Protein-Quote. Optional Takt + Stufe | 9:16 (Stories) und 1:1 |
| **Monatsmuster**  | Monatsende                     | Raster aller Tages-ø, Monatscharakter, Takt-Wochen                                                      | 9:16 und 1:1           |
| **Workout-Karte** | Summary                        | Routine-Name, Dauer, Volumen oder Distanz, PR (nur Übungsname + „neue Bestmarke“), gezeichnetes ø       | 1:1                    |
| **Stempel-Karte** | Stempel / Stufe                | Siegel, Name, Feiertext, Datum                                                                          | 1:1                    |
| **Takt-Karte**    | Rhythmus-Meilenstein (4/12/26) | Anzahl Takt-Wochen, Stufe                                                                               | 1:1                    |

### 7.2 Datenschutz-Regeln

- **Nie** auf einer Karte: Kalorien-Absolutwerte, Gewicht in kg/lb, Zielgewicht, BMI, Mahlzeitnamen, Fotos, Standort, genaue Uhrzeiten.
- **Optional (Schalter pro Karte, Standard aus):** Vorname, **Gewichtsänderung** als Trend-Delta (Richtung + 0,x), absolute Protein-Gramm.
- **Erlaubt als Default:** Zähler (Trainingstage, Tage mit Protokoll), Titel, Takt, Tages-ø.
- Karten werden **lokal** gerendert (Skia-Offscreen-Bild oder `makeImageFromView`), nichts wird hochgeladen. Weitergabe über das iOS-Share-Sheet; die Person wählt Ziel und Inhalt.
- **Vorschau vor Teilen** mit den zwei Schaltern („Name zeigen“, „Details zeigen“). Letzte Wahl wird gemerkt.
- Ab Fürsorge-Signal: Teilen von Körper-/Rhythmus-Karten wird ausgeblendet.

### 7.3 Viralität ohne Dark Patterns

- Branding minimal und schön: Wortmarke „møni“ klein unten, keine QR-Pflicht. Wer sieht, kann den App-Store-Namen suchen. (Deep-Link/QR „später“, braucht Landing-Seite.)
- Kein „Lade Freunde ein“-Modal, keine Belohnung für Einladungen, kein Rangvergleich.
- Teilen löst keine Streak-Vorteile aus. Der Stempel _Weitergegeben_ ist versteckt.

```ts
// src/domain/shareCard.ts
export type ShareCardKind =
  'week' | 'month' | 'workout' | 'achievement' | 'rhythm';
export interface ShareCardOptions {
  showName: boolean;
  showDetails: boolean;
}
export interface ShareCardModel {
  kind: ShareCardKind;
  title: string;
  stats: { key: string; value: string }[];
  days?: ReturnType<typeof dayGlyph>[];
  stageKey?: Stage['key'];
}
export function buildShareCardModel(
  kind: ShareCardKind,
  source: unknown,
  opts: ShareCardOptions,
  flagged: boolean,
): ShareCardModel | null;
```

---

## 8. Onboarding-Dramaturgie

Aktuell 19 Screens (`ONBOARDING_STEPS` plus Welcome und Sign-up). Das ist der beste Teil der App, aber lang. Der Owner hat in Sprint 2 bewusst einen erweiterten, lebendigen Flow gewollt; deshalb steht hier nur **was die gefühlte Länge senkt**, ohne Substanz zu verlieren. Jede Kürzung ist Empfehlung, Entscheidung Owner.

### 8.1 Dramaturgie (Bogen)

| Akt             | Screens                         | Funktion                    | Moment                                                                                                                       |
| --------------- | ------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1. Ankommen     | welcome → name → motivation     | Ton, Du, Personalisierung   | **Branding-Moment 1:** das ø erscheint, Ring füllt sich, Strich zeichnet sich, Wortmarke. Das erste Bild der Marke           |
| 2. Über dich    | sex, birth-date, body, activity | Fakten (kurz!)              | Tempo hoch, Auto-Weiter; Fortschrittsbalken sichtbar                                                                         |
| 3. Ziel         | goal → target-weight → rate     | Wunsch und Realität         | **Wow 1:** Zielgewicht-Screen zeigt echte kcal + Datum (existiert), Kurve zeichnet sich                                      |
| 4. Training     | experience → schedule           | Training als Teil des Plans | Die Wochentage als Tages-ø-Reihe (Kleinigkeit, vermittelt Rhythmus vorab)                                                    |
| 5. Rechnen      | disclaimer → calculating        | Vertrauen, Spannung         | **Branding-Moment 2:** „møni rechnet für dich“ mit drei Schritten (BMR → Training → Ziel), das ø wird Stück für Stück gebaut |
| 6. Enthüllung   | result                          | Auszahlung                  | **Wow 2:** zwei Tages-ø, Dreiklang, Prognose, Handschlag-Ritual (§4.2)                                                       |
| 7. Freischalten | health, notifications, sign-up  | Berechtigungen, Konto       | **Branding-Moment 3:** Erfolgs-Animation nach Sign-up, dann „Dein erster Tag“ (§4.7)                                         |

### 8.2 Kürzungs- und Verschiebungsvorschläge

| Vorschlag                                                                                                  | Wirkung                                   | Risiko                                                                            |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------- |
| **Geschlecht + Geburtsdatum auf einem Screen** („Über dich“), `OptionCard`-Paar oben + DatePicker darunter | −1 Screen                                 | gering (zwei Pflichtfelder auf einem Screen)                                      |
| **Ernährungsform (`diet`) nach dem ersten Foto-Log abfragen** (Progressive Profiling) statt im Onboarding  | −1 Screen; Frage ist dann kontextbezogen  | `profiles.diet` bleibt zunächst `null`, Gemini-Prompt muss das vertragen (prüfen) |
| **Trainingserfahrung in die Schedule-Seite integrieren** (3 Chips oben)                                    | −1 Screen                                 | gering                                                                            |
| **Disclaimer** als Kartensegment direkt vor „Berechne…“ (statt eigener Seite), mit Pflicht-Zustimmung      | −1 Screen, bleibt rechtlich verpflichtend | Legal prüfen (`health_disclaimer_accepted_at`)                                    |
| **Motivation überspringbar** („Später“)                                                                    | weniger Pflichtgefühl                     | geringer Verlust an Personalisierung                                              |
| **Mitteilungs-Primer** nach erster Mahlzeit statt am Ende                                                  | höhere Opt-in-Quote                       | Erinnerungen starten später                                                       |
| **Health-Primer** bleibt, aber erst nach dem Ergebnis (heute schon so)                                     | –                                         | –                                                                                 |

Mit allen Kürzungen: **19 → ca. 14 Screens**, gleiche Datenmenge, mehr Rhythmus. Fortschrittsbalken zählt dann Akte statt Screens (fühlt sich kürzer an).

### 8.3 Was nicht angefasst wird

Count-up, Haptik, Zielkurve, Auto-Weiter, Namensanrede, `Stack.Protected`-Gate – alles bleibt. Die Auth-Gate-Logik (`app/_layout.tsx`) wird durch die Vorschläge nicht berührt.

---

## 9. Priorisierung

**Skala:** Wirkung 1–5 (5 = hoch für Wiedererkennung, Freude, Bindung). Aufwand S (< 2 Tage), M (2–5 Tage), L (> 5 Tage), jeweils für einen Entwickler inkl. Tests und i18n. Risiko = technisch/inhaltlich/gesundheitlich.

| #   | Vorschlag                                                                                          | Wirkung       | Aufwand | Risiko                                    | Abhängigkeit    |
| --- | -------------------------------------------------------------------------------------------------- | ------------- | ------- | ----------------------------------------- | --------------- |
| 1   | Ledger (Tagesindex, MMKV) + `rhythm.ts` Domain                                                     | 3 (Fundament) | M       | mittel: Pagination/Offline                | –               |
| 2   | **Tages-ø als Today-Hero** (Ring + Strich + Zentrumstext + „Warum“-Zeile)                          | 5             | M       | niedrig; abhängig von Mark                | Mark/Visual     |
| 3   | **Wochen-Dreiklang + Takt-Streifen** auf Today                                                     | 5             | M       | niedrig                                   | 1               |
| 4   | **Rhythmus** (Takt-Wochen, Gnade, Pause) + Profil-Anzeige                                          | 5             | M       | mittel: Verständlichkeit                  | 1, 3            |
| 5   | **Stufen** (6 Titel) im Profil                                                                     | 3             | S       | niedrig                                   | 4               |
| 6   | **Workout-Summary 2.0** (Strich-Ritual, Protein-Brücke, Vergleich, Wochenring)                     | 5             | M       | niedrig                                   | 2               |
| 7   | **Nächster Schritt**-Karte                                                                         | 4             | S       | niedrig                                   | 1, 6            |
| 8   | **Begrüßung + Tagessatz**                                                                          | 4             | S       | niedrig                                   | – (Texte Brand) |
| 9   | **Wochenrückblick (Wrapped)**, 7 Karten, Archiv                                                    | 5             | L       | mittel: Qualität der Daten                | 1               |
| 10  | **Achievements-Engine** + 16 Start-Stempel + Regal im Profil + Stempel-Karte                       | 4             | M       | mittel: Falsch-Positive                   | 1               |
| 11  | Restliche 27 Stempel                                                                               | 2             | M       | niedrig                                   | 10              |
| 12  | **Willkommen-zurück-Blatt** + Pause-Modus                                                          | 4             | S       | niedrig                                   | 4               |
| 13  | **First-Run-Today** (Checkliste, Gewicht-Karte) + Insights-Freischalt-Fortschritt                  | 4             | S       | niedrig                                   | –               |
| 14  | **Benachrichtigungen neu** (Trigger 1, 3, 4) + Kategorien + Auto-Beruhigung                        | 4             | M       | mittel: Planungslogik                     | 1               |
| 15  | Restliche Trigger 2, 5, 6, 7, 8                                                                    | 2             | M       | mittel                                    | 14              |
| 16  | Food-Review: „Das bedeutet für heute“ + Ghost-Segment                                              | 4             | S       | niedrig                                   | 2               |
| 17  | Share-Cards (Woche, Workout)                                                                       | 4             | M       | mittel: Datenschutz-Tests                 | 9               |
| 18  | Share-Cards Monat/Stempel/Takt                                                                     | 2             | S       | niedrig                                   | 17              |
| 19  | **Onboarding: Result mit zwei Tages-ø + Dein Takt + Handschlag**                                   | 4             | M       | niedrig; Draft-Version                    | 2               |
| 20  | Onboarding-Kürzung (19 → 14)                                                                       | 3             | M       | mittel: Owner-Entscheidung                | –               |
| 21  | Monatsmuster + Monatscharakter + Sammlung                                                          | 4             | M       | niedrig                                   | 1               |
| 22  | Morgen-Check-in (3 Stimmungen)                                                                     | 2             | S       | niedrig                                   | 8               |
| 23  | Abend-„Tag abschließen“                                                                            | 3             | S       | niedrig                                   | 7               |
| 24  | Fürsorge-Signal                                                                                    | 3 (Schutz)    | S       | mittel: rechtlich/medizinisch             | 1               |
| 25  | Geräteübergreifende Synchronisation (Tabellen `user_achievements`, `user_pauses`, `user_checkins`) | 2             | L       | hoch: Migration, RLS, Typen               | 10, 12          |
| 26  | Widgets / Sperrbildschirm mit Tages-ø (WidgetKit)                                                  | 4             | L       | hoch: native Target, Free-Account-Signing | 2               |
| 27  | Live Activity für Pausentimer/Workout                                                              | 3             | L       | hoch: Free-Account, Entitlements          | –               |
| 28  | Saison (Quartal) mit Thema                                                                         | 2             | L       | niedrig                                   | 21              |
| 29  | Deep-Link/QR auf Share-Cards, Landing-Seite                                                        | 2             | M       | mittel                                    | 17              |
| 30  | Freunde, Ranglisten, Challenges                                                                    | 2             | L       | hoch (Datenschutz, Druck)                 | –               |

### Empfehlung: **Release 1 der neuen Identität** (genau 8 Features)

1. **Tages-ø Hero auf Today** inkl. Begrüßung, Tagessatz und „Warum“-Zeile (#2, #8)
2. **Ledger + Wochen-Dreiklang + Takt-Streifen** (#1, #3)
3. **Rhythmus mit Gnade und Pause + Stufen im Profil** (#4, #5, #12 Pause-Modus-Teil)
4. **Workout-Summary 2.0** mit Strich-Ritual, Protein-Brücke, Vergleich (#6)
5. **Nächster Schritt**-Karte + **First-Run-Today** + Insights-Freischalt-Fortschritt (#7, #13)
6. **Achievements-Engine mit 16 Start-Stempeln** + Regal im Profil + Stempel-Moment (#10)
7. **Wochenrückblick (Wrapped) mit Teilen** (Wochenkarte) (#9, #17 Teil)
8. **Benachrichtigungen neu**: Abend-Notiz, Protein-Brücke, Sonntag-Rückblick, Kategorien, Auto-Beruhigung, Fürsorge-Signal (#14, #24)

_Empfohlene Reihenfolge der Umsetzung (damit jeder Schritt allein Wert liefert):_ Ledger/Domain (+ Tests) → Today-Hero → Dreiklang + Streifen → Summary 2.0 → Rhythmus + Stufen → Nächster Schritt + First-Run → Achievements → Wrapped → Nudges. Domain-Funktionen sind rein und lassen sich vollständig mit Jest testen (Hard Rule 3).

_Die 16 Start-Stempel:_ `first_workout`, `workouts_10`, `first_pr`, `all_rounder`, `first_meal`, `three_meals`, `protein_week`, `well_fuelled`, `first_takt`, `rhythm_4`, `full_week`, `comeback`, `first_weigh`, `trend_ready`, `first_photo`, `health_linked`.

### Später

- Restliche Stempel (#11), Restliche Trigger (#15), Share-Karten Monat/Stempel/Takt (#18)
- Onboarding-Result-Umbau und Handschlag (#19) – hoher Eindruck, aber hängt an Mark/Visual (Tages-ø); direkt nach Release 1
- Onboarding-Kürzung (#20) – Owner-Entscheidung
- Monatsmuster/-charakter/-sammlung (#21) – der natürliche Release 1.1
- Food-Review-Ghost-Segment (#16) – klein, passt als Release 1.1, sobald das Tages-ø steht
- Morgen-Check-in (#22), Abend-Tagesabschluss (#23)
- Widgets (#26), Live Activity (#27) – brauchen bezahlten Developer-Account bzw. native Targets
- Geräteübergreifende Sync (#25) – nur wenn Nutzerzahlen/Bedarf es rechtfertigen
- Saison (#28), Deep-Links (#29)

### Verwerfen (bewusst)

- **Tages-Streaks mit hartem Reset**, „Streak wiederherstellen“, Streak-Kauf, Streak-Verlust-Alarme (toxisch, widerspricht P3).
- **Punkte/XP pro Log**, Währung, Shop, Herzen/Leben, Lootboxen (verführt zu Datenmüll, passt nicht zur Marke).
- **kcal-Unterschreitungs-Belohnungen**, „perfekter Tag“ nach kcal, Defizit-Streaks, Fasten-Badges (Leitplanke L).
- **Ranglisten, Freunde-Feed, öffentliche Profile, Gewichts-Posts** (Datenschutz, Vergleichsdruck, Besondere Datenkategorie nach DSGVO, PLAN §10).
- **Auto-Posts** und Pflicht-Einladungen.
- **Avatare/Haustiere** (Illustrationsaufwand ohne Bezug zum Kern; das Tages-ø ersetzt das Maskottchen).
- **Zeitlich begrenzte Events mit Verlustangst** („nur noch 2 Tage“).

---

## 10. Offene Fragen an Owner und Team

1. **Tages-ø als Zentralbild** (Mark/Illustration): Ist die Idee „Ring = Essen, Strich = Training“ die Marke? Falls nein, bleibt das Bindungssystem gültig; nur Bildsprache und Namen (Takt, Muster) ändern sich.
2. **Begriffe** (Brand Strategist): „Takt“, „Dreiklang“, „Stufen“-Titel, „Muster“, „Stempel“ sind Arbeitstitel. Wichtig ist, dass sie gemeinsam ein Wortfeld bilden (Musik/Rhythmus oder Muster/Zeichen), nicht wie Fitness-Slang klingen.
3. **Erinnerungen:** Sollen die drei festen Essens-Erinnerungen aus Sprint 2 weiterhin Standard sein (§6.1)?
4. **Onboarding-Kürzung:** Sprint-2-Entscheidung war „erweitern und lebendig“. Sind 19 → 14 Screens akzeptabel, wenn die Inhalte erhalten bleiben (§8.2)?
5. **Fürsorge-Signal:** Wording und Verlinkung (Hilfsstellen, Länder) mit Legal klären, bevor es live geht.
6. **Free vs. Premium:** Rhythmus, Stufen, Stempel und Wrapped sind bewusst **frei**, weil sie Bindung erzeugen. Premium bleibt bei KI-Limit, adaptivem TDEE, Insights-Tiefe (PLAN §7.10). Der Stempel _Dein Körper redet mit_ ist nur für Premium erreichbar; sonst eine Ausnahme im Katalog kennzeichnen.
7. **Wochenstart** Montag fest oder Locale-abhängig (US: Sonntag)? Empfehlung: Montag fest für Release 1.
8. **Datenrückfall:** Dürfen Pausen/Rest-Bestätigungen/Check-ins in Release 1 rein lokal sein (Verlust bei Neuinstallation)? Empfehlung ja; Sync via Tabelle in „später“.

---

## Anhang A – Neue Domain-Dateien (Übersicht)

| Datei                        | Inhalt                                                                                                                     | Tests (Beispiele)                                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/domain/rhythm.ts`       | `LedgerDay`, `classifyDay`, `dayGlyph`, `weekStartOf`, `defaultWeekGoals`, `computeWeekRings`, `computeRhythm`, `addPause` | Gnade verbraucht/verdient, Pause-Proration, Wochenwechsel an DST-Grenzen, Nachtragen, Ring aus bei 0 Trainings, Ruhetag-Zählung |
| `src/domain/stage.ts`        | `STAGES`, `stageForWeeks`                                                                                                  | Grenzwerte 2/3, 7/8, 51/52                                                                                                      |
| `src/domain/achievements.ts` | `AchievementFacts`, `evaluateAchievements`, `newlyUnlocked`                                                                | je Stempel positiv/negativ, kein Entzug, Neuinstallation (still)                                                                |
| `src/domain/rituals.ts`      | `greetingSlot`, `daySentence`, `nextBestStep`, `welcomeBackKind`                                                           | Prioritätsreihenfolge, Slots, Namenslosigkeit                                                                                   |
| `src/domain/weeklyReview.ts` | `buildWeeklyReview`, `weekTitle`, `pickHighlight`                                                                          | Titel-Fallbacks, ausgelassene Karten                                                                                            |
| `src/domain/monthReview.ts`  | `buildMonthPattern`, `monthCharacter`                                                                                      | Charakter-Reihenfolge, Monatsgrenzen                                                                                            |
| `src/domain/nudges.ts`       | `planNudges`                                                                                                               | Frequenz-Limits, Ruhezeiten, Auto-Beruhigung, Pause                                                                             |
| `src/domain/shareCard.ts`    | `buildShareCardModel`                                                                                                      | keine verbotenen Felder (Property-Test auf Ausgabe), Fürsorge-Unterdrückung                                                     |
| `src/domain/care.ts`         | `detectLowIntakePattern`                                                                                                   | Schwellen, Tage ohne Einträge zählen nicht                                                                                      |

Alle Dateien: rein, keine RN-/Expo-Importe, Export über `src/domain/index.ts` (Barrel), Tests nebenan (`*.test.ts`), kompatibel mit `bun test src/domain` und `npm test` wie bisher.

## Anhang B – i18n-Struktur (Vorschlag)

Neuer Namespace `progress` in `src/i18n/locales/{de,en}/progress.json`: `progress.rhythm.*`, `progress.stage.<key>`, `progress.rings.*`, `progress.achievement.<id>.name|body`, `progress.review.*`, `progress.month.character.<key>`, `progress.ritual.greeting.<slot>.<variant>`, `progress.ritual.sentence.<key>.<0|1|2>`, `progress.nudge.<kind>.title|body`, `progress.share.*`. Hinweis aus CLAUDE.md: kein Template-Literal in `t()`; für Stempel/Charaktere ein `Record<Id, string>` aus literalen `t('…')`-Aufrufen bauen (oder `satisfies`-Mapping), damit die typisierten Keys weiter funktionieren.

## Anhang C – Was nicht angefasst wird

Keine Änderung an PLAN.md, CLAUDE.md, App-Code oder Datenbank. Alle Vorschläge sind additiv zum Bestand (Feature-Contract-Muster, Design-System, Auth-Gate, Offline-Outbox). Neue Persistenz ist ausschließlich MMKV (Zustand `persist`, wie `onboardingStore`).
