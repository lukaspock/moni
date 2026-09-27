# møni – Implementierungsplan

> Fitness-Lifestyle-App, die **Workout-Tracking und Kalorien-Tracking verbindet**.
> Essen per Foto, Text, Sprache oder Barcode erfassen → KI schätzt Kalorien & Makros → Tageslimit passt sich dynamisch an Training, Ziel und echten Gewichtsverlauf an.

Dieses Dokument ist die Übergabe an den Implementierungs-Agenten. Alle Produktentscheidungen unten sind mit dem Owner abgestimmt; offene Punkte stehen am Ende.

---

## 1. Entscheidungen auf einen Blick

| Thema | Entscheidung |
|---|---|
| Plattform | **Nur iOS** in v1, nativ fürs iPhone |
| UI | **Echte native iOS-26-Liquid-Glass-Komponenten** (keine nachgebauten Blur-Effekte), NativeWind für Layout |
| Stack | React Native + **Expo** (Dev Build via EAS, kein Expo Go) + **Supabase** |
| Food-KI | **Google Gemini** (Vision + Text) über Supabase Edge Function |
| Nährwerte | KI-Schätzung pro Zutat, **vor dem Speichern editierbar** |
| Getrackt | kcal, Protein, Kohlenhydrate, Fett |
| Food-Input | Foto, Text, **Sprache**, **Barcode** (Open Food Facts), **Favoriten/Wiederholen**, **Mahlzeit-Kategorien** |
| Workouts | Voll: Übungen, Sätze, Wdh., Gewicht + Cardio + Sport/Sonstiges, **Wochenplan/Routinen** |
| Verbrauch | MET-Schätzung + **Apple Health** (HealthKit) |
| Verbindung Food↔Training | **Dynamisches Tageslimit**, **Protein an Training gekoppelt**, **Insights & Korrelationen** |
| Onboarding | Geschlecht, Alter, Größe, Gewicht, Ziel + Tempo, Alltagsaktivität, Workouts/Woche + Trainingstage |
| Ziel-Anpassung | **Adaptiver TDEE** auf Basis geloggter Gewichtsdaten |
| Einheiten | Metrisch + Imperial umschaltbar (DB speichert immer metrisch) |
| Sprache | **Mehrsprachig & leicht erweiterbar** (Start: DE + EN) |
| Auth | Apple, Google, E-Mail (Passwort + Magic Link) |
| Monetarisierung | **Freemium + Abo via RevenueCat** |
| Offline | Workouts offline-fähig, Rest online |
| Dashboard | Kalorienring + 3 Makrobalken + heutiges Workout + Mahlzeiten |

---

## 2. Native iOS & Liquid Glass (Kernanforderung)

Die App soll sich anfühlen wie eine Apple-App auf iOS 26. **Regel: Wo es eine native Komponente gibt, wird sie verwendet. Glass wird nie mit `expo-blur`, Opacity oder CSS nachgebaut.**

**Deployment Target: iOS 26** (echtes Liquid Glass überall, keine Fallback-Pfade nötig – siehe offene Punkte).

| Bereich | Umsetzung |
|---|---|
| Tab Bar | `NativeTabs` aus `expo-router/unstable-native-tabs` → echte `UITabBar` mit Liquid Glass, Minimize-on-Scroll, SF-Symbols |
| Navigation / Header | Native Stack (`react-native-screens`), Large Titles, transparente Header → System-Glass automatisch |
| Sheets | `presentation: 'formSheet'` mit `sheetAllowedDetents` → native Glass-Sheets (z. B. „Essen erfassen“, Übungsauswahl) |
| Glass-Flächen | `GlassView` / `GlassContainer` aus `expo-glass-effect` (z. B. schwebender „+“-Button, Karten-Overlays über Kamera) |
| Controls | `@expo/ui/swift-ui` (SwiftUI in RN via `Host`): Buttons mit Glass-Style, Picker, Toggle, Slider, DatePicker, ContextMenu, Stepper. Vor Einsatz prüfen, welche Komponenten/Modifier die installierte Version bietet |
| Icons | SF Symbols via `expo-symbols` |
| Farben | iOS-Semantic-Colors über `PlatformColor` (label, secondaryLabel, systemBackground …) → Dark Mode & Glass-Tinting passen automatisch. In NativeWind-Config als Tokens mappen |
| Haptik | `expo-haptics` bei Set abhaken, Food gespeichert, Ziel erreicht |
| Paywall | RevenueCat Paywalls (`react-native-purchases-ui`) – native |

NativeWind (Tailwind) wird **nur für Layout, Abstände und Typografie** normaler Views verwendet, nicht für Glass-Effekte oder Controls, die es nativ gibt.

---

## 3. Tech-Stack

- **Expo SDK** (aktuelle stabile Version), TypeScript strict, **EAS Build** (Dev Client – nötig für HealthKit, RevenueCat, Glass, SwiftUI)
- **expo-router** (File-based Routing, Native Tabs, Native Stack)
- **Supabase**: Auth, Postgres (+ RLS), Storage (Food-Fotos), Edge Functions (Deno), `pg_cron` für periodische Jobs. Region: **EU (Frankfurt)** wegen DSGVO
- **State/Data**: TanStack Query (Server-State), Zustand (UI-State), **MMKV** (Persistenz + Offline-Outbox)
- **Formulare**: react-hook-form + zod
- **i18n**: `i18next` + `react-i18next` + `expo-localization`
- **Charts**: `victory-native` (Skia) für Verläufe; Kalorienring mit `@shopify/react-native-skia`
- **Kamera/Bilder**: `expo-camera` (Foto + Barcode), `expo-image-picker`, `expo-image-manipulator` (auf ~1024 px / JPEG 0.7 komprimieren)
- **Sprache**: `expo-speech-recognition` (On-Device Diktat → Text → gleicher Text-Flow)
- **HealthKit**: `@kingstinct/react-native-healthkit`
- **Abo**: `react-native-purchases` + `react-native-purchases-ui` (RevenueCat)
- **Auth**: `expo-apple-authentication`, `@react-native-google-signin/google-signin`, beides via `supabase.auth.signInWithIdToken`
- **Tests**: Jest für die Berechnungslogik (Pflicht), Maestro für E2E (optional)

---

## 4. Projektstruktur

```
møni/
├─ app/                          # expo-router
│  ├─ _layout.tsx                # Provider: Query, i18n, Auth, RevenueCat
│  ├─ (onboarding)/              # welcome, sex, age, body, activity, goal, rate, training-days, result
│  ├─ (auth)/sign-in.tsx
│  ├─ (tabs)/_layout.tsx         # NativeTabs
│  │  ├─ index.tsx               # Heute (Dashboard)
│  │  ├─ training/               # Plan, Routinen, Verlauf
│  │  ├─ insights.tsx
│  │  └─ profile/                # Profil, Ziele, Einstellungen, Einheiten, Sprache
│  ├─ log-food/                  # formSheet: Auswahl Foto/Text/Sprache/Barcode/Favorit
│  ├─ food-review.tsx            # editierbares KI-Ergebnis
│  ├─ workout/active.tsx         # fullScreenModal, offline-fähig
│  ├─ exercise-picker.tsx        # formSheet
│  └─ paywall.tsx
├─ src/
│  ├─ features/                  # food/, workout/, targets/, insights/, health/, subscription/
│  ├─ lib/                       # supabase.ts, storage.ts (MMKV), units.ts, outbox.ts
│  ├─ domain/                    # REINE Logik ohne RN-Imports + Tests
│  │  ├─ bmr.ts, tdee.ts, targets.ts, met.ts, adaptive.ts, macros.ts
│  ├─ i18n/
│  │  ├─ index.ts                # Registry der Sprachen
│  │  └─ locales/{de,en}.json
│  ├─ components/                # glass/, ui/, charts/
│  └─ types/database.ts          # generiert via `supabase gen types`
├─ supabase/
│  ├─ migrations/
│  ├─ seed.sql                   # Übungskatalog
│  └─ functions/                 # analyze-food, revenuecat-webhook, recompute-targets
└─ app.config.ts
```

---

## 5. Datenmodell (Supabase / Postgres)

Alle Tabellen mit **RLS** (`user_id = auth.uid()`); globaler Übungskatalog read-only für alle. IDs sind **client-generierte UUIDs** (idempotenter Offline-Sync). Alle Werte metrisch.

- **profiles** – `id (= auth.users.id)`, `sex`, `birth_date`, `height_cm`, `activity_level` (sedentary | light | moderate | active), `goal` (lose | maintain | gain), `goal_rate_kg_per_week`, `workouts_per_week`, `unit_system` (metric | imperial), `locale`, `eat_back_factor` (default 0.7), `created_at`
- **weight_logs** – `id`, `user_id`, `date`, `weight_kg`, `source` (manual | healthkit)
- **daily_targets** – `user_id`, `date` (PK zusammen), `base_kcal`, `workout_bonus_kcal`, `protein_g`, `carbs_g`, `fat_g`, `tdee_used`, `is_training_day`, `computed_at`
- **tdee_estimates** – `user_id`, `week_start`, `formula_tdee`, `observed_tdee`, `blended_tdee`, `confidence`
- **food_logs** – `id`, `user_id`, `logged_at`, `date`, `meal_type` (breakfast | lunch | dinner | snack), `source` (photo | text | voice | barcode | favorite | manual), `title`, `image_path`, `kcal`, `protein_g`, `carbs_g`, `fat_g`, `ai_confidence`, `ai_raw` (jsonb)
- **food_items** – `id`, `food_log_id`, `name`, `grams`, `kcal`, `protein_g`, `carbs_g`, `fat_g`, `barcode`
- **favorite_meals** – `id`, `user_id`, `title`, `items` (jsonb), `use_count`
- **exercises** – `id`, `owner_id` (null = global), `name_key` (i18n-Key) / `custom_name`, `category` (strength | cardio | sport | other), `muscle_groups[]`, `equipment`, `met_value`, `tracking_type` (weight_reps | reps | duration | distance_duration)
- **routines** – `id`, `user_id`, `name`; **routine_exercises** – `routine_id`, `exercise_id`, `order`, `target_sets`, `target_reps`
- **training_plan_days** – `user_id`, `weekday` (0–6), `routine_id` (nullable = freies Training), `expected_kcal`
- **workouts** – `id`, `user_id`, `routine_id`, `started_at`, `ended_at`, `category`, `kcal_burned`, `kcal_source` (met | healthkit | manual), `healthkit_uuid` (unique → keine Duplikate), `notes`
- **workout_sets** – `id`, `workout_id`, `exercise_id`, `set_index`, `reps`, `weight_kg`, `rpe`, `duration_s`, `distance_m`, `completed_at`
- **ai_usage** – `user_id`, `date`, `count` (Freemium-Limit, nur von Edge Function beschrieben)
- **entitlements** – `user_id`, `is_premium`, `expires_at`, `updated_at` (via RevenueCat-Webhook)
- **Storage-Bucket `food-images`** – privat, Pfad `{user_id}/{food_log_id}.jpg`, RLS auf Ordner

Views für Insights: `v_daily_summary` (gegessen vs. Ziel, Workout ja/nein, Volumen), `v_exercise_progress` (geschätztes 1RM pro Übung/Woche).

---

## 6. Kalorien- & Makro-Logik (`src/domain`, vollständig unit-getestet)

**6.1 Grundumsatz** – Mifflin-St Jeor:
`BMR = 10·kg + 6.25·cm − 5·Alter + (♂ +5 | ♀ −161)`

**6.2 Basis-TDEE (ohne Sport!)** – `BMR × NEAT-Faktor`
sedentary 1.2 · light 1.375 · moderate 1.5 · active 1.65.
Wichtig: Der Faktor bildet **nur Alltagsaktivität** ab, Workouts kommen separat dazu → keine Doppelzählung.

**6.3 Zielanpassung** – `Delta = goal_rate_kg_per_week × 7700 / 7`
Leitplanken: Defizit max. 25 % vom TDEE, Überschuss max. +500 kcal, Minimum 1500 kcal (♂) / 1200 kcal (♀). Werden die Grenzen erreicht, zeigt die App einen Hinweis.

**6.4 Dynamisches Tageslimit (Kern-Feature)**
`Tageslimit = base_kcal + workout_bonus`
- **Geplanter Trainingstag**: morgens wird `expected_kcal` des Plan-Tags × `eat_back_factor` als vorläufiger Bonus gesetzt (gestrichelt im Ring dargestellt).
- **Nach dem Workout**: Bonus = tatsächlicher Verbrauch × `eat_back_factor` (Default 0.7, weil Schätzungen eher zu hoch sind; in Einstellungen änderbar).
- **Ungeplantes Workout**: Bonus kommt beim Loggen dazu.
- **Geplantes Workout ausgelassen**: vorläufiger Bonus fällt am Abend weg.
- Zusätzlicher Bonus fließt überwiegend in **Kohlenhydrate**.

**6.5 Workout-Verbrauch**
- MET: `kcal = MET × kg × Stunden`. Krafttraining: MET je nach Session-Dichte (Sätze/Minute) 3.5–6.0; Cardio/Sport aus Katalog-MET.
- HealthKit: wenn ein HealthKit-Workout zeitlich mit einem møni-Workout überlappt → dessen `activeEnergyBurned` nehmen (`kcal_source = healthkit`), sonst MET. Nur **Workouts** importieren, nicht die gesamte Aktivitätsenergie (sonst Doppelzählung mit NEAT).

**6.6 Protein an Training gekoppelt**
- Ruhetag: 1.6 g/kg · Krafttrainingstag: 2.0 g/kg · im Defizit jeweils +0.2 g/kg (max. 2.4 g/kg).
- Fett: 25 % der kcal (min. 0.6 g/kg), Kohlenhydrate: Rest.
- Nach einem Krafttraining: Karte „Post-Workout: 30–40 g Protein“ mit Vorschlägen aus den Favoriten.

**6.7 Adaptiver TDEE** (Edge Function `recompute-targets`, wöchentlich via `pg_cron` + bei App-Start, falls fällig)
- Voraussetzungen: ≥ 14 Tage Daten, ≥ 8 Gewichtseinträge, ≥ 80 % der Tage mit Food-Logs.
- Gewichtstrend per EMA (α ≈ 0.1), um Wasserschwankungen zu glätten.
- `observed_TDEE = Ø Aufnahme − (Δ Trendgewicht_kg × 7700) / Tage`
- `blended = w·observed + (1−w)·formula`, w steigt mit Datenmenge/Vollständigkeit (max. 0.8).
- Änderung pro Woche max. ±150 kcal. Dem User wird die Anpassung erklärt („Dein Verbrauch ist höher als geschätzt – Ziel +120 kcal“).

---

## 7. Feature-Specs

### 7.1 Onboarding (vor dem Login)
Screens: Willkommen → Geschlecht → Geburtsdatum → Größe/Gewicht (Einheit umschaltbar) → Alltagsaktivität (mit Beispielen) → Ziel → Tempo → Workouts/Woche + Trainingstage (füllt gleich `training_plan_days`) → **Ergebnis-Screen** (Tageslimit Ruhe- vs. Trainingstag, Makros, kurze Erklärung) → Sign-up → Paywall (überspringbar) → Heute.
Antworten werden bis zum Sign-up in MMKV gehalten und danach in `profiles` geschrieben.

### 7.2 Essen erfassen
Großer Glass-„+“-Button auf „Heute“ öffnet ein `formSheet` mit: 📷 Foto · ✏️ Beschreiben · 🎙️ Sprechen · ▦ Barcode · ★ Favoriten/Zuletzt.
- **Foto**: aufnehmen/auswählen → komprimieren → Upload in Storage → `analyze-food` → Review.
- **Text/Sprache**: Freitext („2 Eier, Toast mit Butter, Cappuccino“) → `analyze-food` → Review.
- **Barcode**: Open Food Facts direkt vom Client, Menge wählen, **zählt nicht zum KI-Limit**.
- **Favoriten/Zuletzt**: ein Tap, „Wie gestern“ kopiert eine Mahlzeit.
- **Mahlzeit-Kategorie** wird aus der Uhrzeit vorgeschlagen, ist änderbar.
- **Review-Screen**: Zutatenliste mit Gramm und Makros; Gramm editierbar (Werte skalieren linear), Zutaten hinzufügen/löschen, Gesamt-Portion-Slider, Confidence-Hinweis, „Als Favorit speichern“.

### 7.3 Edge Function `analyze-food`
1. JWT prüfen, `entitlements` + `ai_usage` prüfen (Free: **3 KI-Analysen/Tag**, Wert per Env konfigurierbar) → sonst `402` → Client zeigt Paywall.
2. Bild aus Storage laden (signed) oder Text nehmen.
3. Gemini-Call mit **Structured Output** (`responseSchema`), Modell über Env `GEMINI_MODEL` (aktuelles Gemini-Flash-Modell als Default), Prompt enthält User-Locale (Zutatennamen in User-Sprache).
4. Antwort-Schema: `{ title, meal_guess, items: [{ name, grams, kcal, protein_g, carbs_g, fat_g }], confidence: 0–1, clarification?: string }`
5. Serverseitig plausibilisieren (kcal ≈ 4P + 4C + 9F ± 15 %, sonst korrigieren), `ai_usage` inkrementieren, zurückgeben. **Gespeichert wird erst nach Bestätigung im Review.**
API-Key nur als Supabase Secret, niemals im Client.

### 7.4 Workouts
- **Übungskatalog**: ca. 150 Übungen als Seed (Basis z. B. das gemeinfreie `free-exercise-db`), Namen als i18n-Keys, eigene Übungen möglich.
- **Routinen** (z. B. Push/Pull/Legs) + **Wochenplan** (Wochentag → Routine).
- **Aktives Workout** (`fullScreenModal`): Sätze abhaken, vorherige Werte als Platzhalter, Pausentimer (Local Notification), Glass-Bottom-Bar mit Timer/Fertig. **Komplett offline** (siehe 7.7).
- **Cardio/Sport**: Dauer, Distanz (optional), Intensität.
- Abschluss-Screen: Volumen, PRs, verbrannte kcal, „+X kcal zum Tageslimit“.
- Verlauf + Progress-Chart pro Übung (geschätztes 1RM).

### 7.5 Apple Health
Permissions: lesen `workouts`, `activeEnergyBurned`, `bodyMass`; schreiben `workouts`, `dietaryEnergyConsumed` + Makros (optional, Toggle). Import beim App-Start/Foreground, Deduplizierung über `healthkit_uuid`. Gewichte aus Health landen in `weight_logs`.

### 7.6 Heute-Dashboard
Large Title „Heute“ + Datums-Swipe. Kalorienring (gegessen / Limit, Workout-Bonus als eigenes Segment, vorläufiger Bonus gestrichelt) → 3 Makrobalken (Protein hervorgehoben) → Karte „Heutiges Training“ (geplant/erledigt, Start-Button) → Mahlzeiten nach Kategorie → Gewicht-Quick-Log.

### 7.7 Offline (Workouts)
- Aktive Session + Katalog + Routinen liegen in MMKV.
- Jede Mutation geht in eine **Outbox** (`src/lib/outbox.ts`), die bei Netz (`@react-native-community/netinfo`) in Reihenfolge per Upsert synct. Client-UUIDs = idempotent.
- Food-Logging braucht Netz für KI; Barcode-/Favoriten-Logs dürfen auch über die Outbox laufen.

### 7.8 Insights (Tab)
Wöchentlich, deterministisch per SQL berechnet:
- Gewichtstrend vs. Ø Kalorien
- Ø Protein an Trainings- vs. Ruhetagen, Zielerreichung
- Kraftentwicklung (1RM-Trend) vs. Proteinzufuhr / Kalorienbilanz
- Konsistenz (Trainings-/Logging-Streak)
- Hinweise nur bei ausreichender Datenlage (min. n Tage), sonst „Noch zu wenige Daten“.

### 7.9 Mehrsprachigkeit
- Alle UI-Strings über `t('key')`, **keine hartkodierten Texte**. Typsichere Keys (i18next TypeScript-Augmentation mit `de.json` als Referenz).
- Neue Sprache = eine JSON-Datei in `src/i18n/locales/` + ein Eintrag in `src/i18n/index.ts`. Fehlende Keys fallen auf EN zurück.
- Gerätesprache als Default, Override in den Einstellungen (`profiles.locale`).
- Zahlen/Datum/Einheiten via `Intl` + `src/lib/units.ts`. Übungsnamen per `name_key`, KI-Antworten in User-Sprache.

### 7.10 Monetarisierung (RevenueCat)
- Entitlement `premium`, Produkte monatlich + jährlich (mit Trial).
- **Free**: 3 KI-Analysen/Tag, Barcode/Favoriten unbegrenzt, Workout-Tracking voll, statisches Ziel.
- **Premium**: unbegrenzte KI-Analysen, adaptiver TDEE, Insights, Apple-Health-Sync.
- Paywall nach Onboarding (überspringbar) + beim Erreichen des Limits. Webhook `revenuecat-webhook` → `entitlements` (Server ist Source of Truth für das KI-Limit).

---

## 8. Umsetzungsphasen

Jede Phase endet mit lauffähigem Dev Build auf dem iPhone/Simulator.

**Phase 0 – Setup**
Expo-Projekt (TS), EAS + Dev Client, iOS Deployment Target 26, expo-router mit NativeTabs-Grundgerüst (4 Tabs), NativeWind inkl. PlatformColor-Tokens, i18n-Gerüst (DE/EN), Supabase-Projekt (EU) + CLI + erste Migrationen + generierte Types, ESLint/Prettier, Jest.

**Phase 1 – Onboarding, Auth, Ziele**
`src/domain` (BMR, TDEE, Ziele, Makros) mit Unit-Tests, Onboarding-Flow, Apple/Google/E-Mail-Auth, Profil speichern, Ergebnis-Screen, `daily_targets` berechnen.

**Phase 2 – Food-Logging Kern**
`analyze-food` + Gemini, Foto- und Text-Flow, Review-Screen, `food_logs`/`food_items`, Heute-Dashboard mit Ring und Makros, Tagesnavigation.

**Phase 3 – Food-Komfort**
Barcode (Open Food Facts), Favoriten/Zuletzt/„wie gestern“, Mahlzeit-Kategorien, Spracheingabe.

**Phase 4 – Workouts**
Übungskatalog-Seed, Routinen, Wochenplan, aktives Workout offline mit Outbox, MET-Berechnung, **dynamisches Tageslimit** (geplant + tatsächlich), Protein-Kopplung, Verlauf/Progress.

**Phase 5 – Apple Health**
Permissions, Workout- und Gewicht-Import, Dedupe, optionales Zurückschreiben.

**Phase 6 – Gewicht, adaptiver TDEE, Insights**
Gewichts-Logging + Trend-Chart, `recompute-targets` + `pg_cron`, Insights-Tab.

**Phase 7 – Monetarisierung**
RevenueCat, Paywall, Webhook, Limit-Durchsetzung serverseitig.

**Phase 8 – Polish & Release**
Haptik, Empty States, Fehlerzustände, Accessibility (Dynamic Type, VoiceOver), App-Icon, Datenschutz/Disclaimer, Account-Löschung (App-Store-Pflicht), TestFlight.

---

## 9. Regeln für den Implementierungs-Agenten

1. **Native first**: Liquid Glass nur über native Komponenten (Abschnitt 2). Keine Fake-Glass-Styles.
2. **Keine hartkodierten Strings** – alles über i18n.
3. **Berechnungslogik nur in `src/domain`**, rein funktional, mit Tests. Kein Rechnen in Komponenten.
4. **DB metrisch**, Umrechnung nur bei Anzeige/Eingabe.
5. **Secrets nie im Client** (Gemini-Key, RevenueCat-Secret, Service-Role-Key).
6. **Jede Tabelle mit RLS**; nach Migrationen Supabase-Advisors prüfen.
7. Nach Schema-Änderungen `supabase gen types` ausführen.
8. Nach jeder Phase: App im iOS-Simulator starten und die Kernflows prüfen.

---

## 10. Offene Punkte / Risiken

- **Mindestversion iOS 26**: Im Plan gesetzt, damit überall echtes Liquid Glass läuft. Falls ältere iPhones (iOS 18) unterstützt werden sollen, braucht es Fallbacks (`isLiquidGlassAvailable()`) → etwas mehr Aufwand.
- **Gemini-Modell & Kosten**: konkretes Modell beim Start festlegen, Kosten pro Scan messen, danach das Free-Limit (Default 3/Tag) kalibrieren.
- **KI-Genauigkeit**: klar kommunizieren, dass es Schätzungen sind; der Review-Screen ist Pflicht.
- **Gesundheit/Recht**: Hinweis „kein medizinischer Rat“, Mindest-kcal-Grenzen, kein aggressives Defizit. DSGVO: Gesundheitsdaten sind besondere Kategorie → Einwilligung, EU-Hosting, Export & Löschung, Food-Fotos optional nach X Tagen löschen.
- **App Review**: HealthKit-Nutzung begründen, Sign in with Apple ist Pflicht (vorhanden), Account-Löschung in der App.
- **Branding**: Name „møni“ steht, Design-Sprache (Akzentfarbe, Icon) noch offen.
