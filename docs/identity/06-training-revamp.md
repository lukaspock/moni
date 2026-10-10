# Training-Revamp – „Starten, abhaken, fertig“

> Owner-Auftrag (2026-10-10): Workout-Tracking hat zu viel Overhead. Es soll schnell und einfach gehen. Beim ersten Öffnen des Training-Tabs führt ein leichter Flow durch das Anlegen der eigenen Routinen, danach ist Tracken mühelos. Routinen erstellen muss deutlich besser werden.
> Gilt zusätzlich zu `IDENTITY-PLAN.md` (Look, Voice, Motion, Haptik). Datenmodell bleibt unverändert (keine Migration): `routines`, `routine_exercises`, `workouts`, `workout_sets` über die bestehende Outbox und die bestehenden Hooks.

## Leitprinzipien

1. **Ein Tap bis zum Training.** Training-Tab zeigt die nächste Routine groß, Start = 1 Tap. Andere Routinen = 1 Tap.
2. **Ein Tap pro Satz.** Jeder Satz ist mit den Werten vom letzten Mal (sonst Routine-Ziel) **vorbefüllt**. Abhaken übernimmt sie. Werte ändern nur, wenn nötig – per Stepper, nicht per Tastatur.
3. **Nichts blockiert.** Pausentimer läuft als schmale Leiste mit, nie als Overlay. Kein Pflichtfeld, kein Bestätigungsdialog außer beim Verwerfen.
4. **Routinen entstehen aus Vorschlägen, nicht aus leeren Formularen.** Setup-Flow und Editor starten mit Vorlagen; man streicht und tauscht, statt alles zu suchen.
5. **Marke:** Ember ist die Trainingsfarbe, Begriffe „Einheit“, „Hochwassermarke“; Haptik nur über `src/lib/haptics.ts`; Reduced Motion respektieren; keine Emojis.

## 1. Training-Tab (`app/(tabs)/training/index.tsx`)

```
┌ Ember-Hero ─────────────────────────────┐
│ HEUTE DRAN · Push                        │
│ 6 Übungen · ca. 55 min · zuletzt Mo      │
│ [ Starten ▸ ]  (GlassActionButton)       │
└──────────────────────────────────────────┘
Weitere Routinen  (horizontale Karten, 1 Tap = Start, Long-Press = Bearbeiten/Löschen)
[Pull ▸] [Beine ▸] [+ Neue Routine]
Freies Training ▸   (klein, ListRow)
Letzte Einheiten (3 ListRows) · Alle ansehen
```

- Läuft eine Einheit: Hero zeigt „Weiter“ mit Laufzeit.
- **Keine Routinen** → Setup-Flow öffnet sich **automatisch beim ersten Öffnen** des Tabs (MMKV-Flag `training:setupPrompted:<uid>`), danach nur noch als große Hero-CTA „Routinen in 1 Minute einrichten“.
- „Nächste Routine“ = Rotation nach der zuletzt absolvierten Routine (pure Funktion in `src/domain/trainingPlan.ts`).

## 2. Setup-Flow (neu, `app/training-setup/*`, fullScreenModal im SheetScreen-Look)

Ziel: unter 60 Sekunden zu fertigen Routinen. Schritte, je eine Frage, Auto-Advance bei Einfachauswahl (wie Onboarding, `ChoiceStep`/`OptionCard` wiederverwenden wo passend):

1. **Wo trainierst du?** Studio · Zuhause (Kurzhanteln/Körpergewicht) · Hauptsächlich Ausdauer/Sport.
2. **Wie oft pro Woche?** 2–6, vorbelegt aus dem Onboarding (`training_plan_days`/`workouts_per_week`, falls vorhanden).
3. **Dein Vorschlag:** passende Vorlage (Ganzkörper A/B bei 2–3, Ober/Unter bei 4, Push/Pull/Beine bei 5–6; Zuhause-Varianten mit Körpergewicht/Kurzhanteln; Ausdauer: 1–2 Routinen mit Cardio + Mobility). Zeigt die Routinen als Karten mit Übungsliste. Pro Übung: **Tauschen** (Picker, vorgefiltert auf dieselbe Muskelgruppe) und **Entfernen**; Routine umbenennen; Übung hinzufügen.
4. **Fertig:** speichert alle Routinen über `useSaveRoutine` (eine nach der anderen, offline-fähig über Outbox), Celebration light, zurück zum Tab, Hero zeigt die erste Routine.

- Ausstieg jederzeit: „Selbst zusammenstellen“ → Routine-Editor leer; „Später“ → schließt (Flag gesetzt).
- Vorlagen sind reine Daten in `src/domain/routineTemplates.ts` (Übungen per `name_key` aus `supabase/seed.sql`, z. B. `bench_press`, Ziele `sets`, `repsMin`, `repsMax`), Auflösung auf Katalog-IDs zur Laufzeit via `useExerciseCatalog()`; fehlender Key → Übung still auslassen. Tests in `routineTemplates.test.ts` (jeder Key existiert im Seed, jede Vorlage hat 4–8 Übungen, Auswahl-Logik).

## 3. Routine-Editor (`app/routine-editor.tsx`, neu gedacht)

```
Name  [ Push          ]  Vorschläge: (Push) (Pull) (Beine) (Ganzkörper) (Oberkörper)
┌ Übung ─────────────────────────────────┐
│ ≡  Bankdrücken          3 × 8–10   ⋯   │  ← Ziel-Chip tippen → Inline-Stepper Sätze / Wdh-Bereich
│ ≡  Schulterdrücken      3 × 10     ⋯   │  ⋯ = Tauschen · Nach oben/unten · Entfernen
└────────────────────────────────────────┘
[ + Übungen hinzufügen ]   (Picker mit Mehrfachauswahl)
[ Aus Vorlage füllen ]     (nur wenn leer)
Speichern (GlassActionButton, deaktiviert ohne Name/Übung)
```

- Ziele per Stepper (Sätze 1–8, Wdh. 1–30, Bereich optional), keine Tastatur nötig. Zeit-/Distanz-Übungen (`trackingType`) zeigen passende Ziele.
- Reihenfolge: Long-Press-Drag, falls `react-native-gesture-handler`/Reanimated das sauber hergibt; sonst „Nach oben/unten“ im ⋯-Menü (nativ: `@expo/ui` ContextMenu falls vorhanden, sonst ActionSheetIOS).
- Speichern ohne Sheet-Header-Chaos, Löschen nur im ⋯-Menü der Routine mit Bestätigung.

## 4. Übungs-Picker (`src/features/workout/ExercisePickerView.tsx`)

- Suche oben (fokussiert sich NICHT automatisch), darunter Muskelgruppen-Chips (horizontal), Abschnitte „Zuletzt“ und „Beliebt“ zuerst, dann A–Z.
- **Mehrfachauswahl** mit Häkchen (CheckDraw) und Zähler-Button „3 hinzufügen“; Einzelmodus bleibt für „Tauschen“.
- Zeile: Name, Muskelgruppe + Equipment klein, kein Info-Overhead. Eigene Übung anlegen am Listenende.

## 5. Aktive Einheit (`app/workout/active.tsx`)

```
┌ kompakter Ember-Kopf ─ Push · 23:41 ─ [Fertig] ┐
│ ▬▬▬▬▬▬▬▭▭▭  Pause 1:12  [−15] [+15] [×]          │  (nur während Pause, schmale Leiste)
└─────────────────────────────────────────────────┘
● Bankdrücken                    zuletzt 80 kg × 8
  1   80 kg   8   ✓      ← Werte vorbefüllt; Tap auf Zahl → Stepper-Popover (±2,5 kg / ±1)
  2   80 kg   8   ○      ← großer Check rechts (44 pt+), 1 Tap = erledigt
  3   80 kg   8   ○
  + Satz
○ Schulterdrücken  3 × 10        (eingeklappt; Fortschritt 0/3)
○ Seitheben  3 × 12
```

- **Fokus-Modus:** aktuelle Übung aufgeklappt, andere eingeklappt mit Fortschritt; nach dem letzten Satz klappt automatisch die nächste auf (sanft, Reveal).
- Vorbefüllung: letzter Satz derselben Übung aus der letzten Einheit (`getLastSetsForExercise`/History-Hooks; falls nicht vorhanden, pure Logik in `src/domain/workoutPrefill.ts` mit Tests) → sonst Routine-Ziel → sonst leer. **Progressionshinweis:** wenn letztes Mal alle Sätze das obere Wdh-Ziel erreicht haben, kleiner Chip „+2,5 kg?“ (1 Tap übernimmt).
- Satz abhaken: `CheckDraw` + `haptic.setDone` / `setDonePR`; Pause startet automatisch (Standard aus Routine/Übung, sonst 90 s).
- Übung tauschen/hinzufügen/entfernen über ⋯ an der Übung bzw. „+ Übung“ am Ende (Picker).
- „Fertig“ immer oben sichtbar; unvollständige Sätze werden beim Beenden ignoriert (kein Dialog), nur „Verwerfen“ fragt nach.
- Cardio/Zeit-Übungen: eine Zeile mit Dauer/Distanz-Stepper und Check.
- Bestehende Logik (Outbox, finish.ts, Health-Export, PR-Berechnung) bleibt; nur UI + additive Store-Aktionen.

## 6. Arbeitsaufteilung

| Agent              | Bereich (exklusiv)                                                                                                                                                                                                                                                                                                     | i18n-Datei (exklusiv) |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| T1 Setup & Tab     | `app/(tabs)/training/index.tsx`, `app/(tabs)/training/_layout.tsx`, neu `app/training-setup/*`, `src/domain/routineTemplates*.ts`, `src/domain/trainingPlan*.ts`, neu `src/features/workout/setup/*`; Route-Registrierung der Modal-Gruppe in `app/_layout.tsx` (nur die Stack.Screen-Zeile im Modal-Block hinzufügen) | `trainingSetup.json`  |
| T2 Editor & Picker | `app/routine-editor.tsx`, `src/features/workout/ExercisePickerView.tsx`, `src/features/workout/pickerStore.ts`, neu `src/features/workout/editor/*`                                                                                                                                                                    | `routineEditor.json`  |
| T3 Aktive Einheit  | `app/workout/active.tsx`, `app/workout/_layout.tsx`, `src/features/workout/session.ts` (nur additiv), neu `src/features/workout/live/*`, neu `src/domain/workoutPrefill*.ts`                                                                                                                                           | `workoutLive.json`    |

Gemeinsam: `src/features/workout/index.ts` nur additiv (Exports anhängen), keine bestehenden Signaturen ändern. T1 nutzt den Picker von T2 im Einzelmodus über die bestehende Schnittstelle; T2 hält die Props abwärtskompatibel und ergänzt `multiSelect?`.
