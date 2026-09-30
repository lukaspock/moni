# Sprint 2 – Bericht (2026-09-29)

Branding, Onboarding v2, Apple Health, CI-Härtung und erster Build auf dem echten iPhone.
Stand: lokaler Branch `integration/sprint-2` (nicht gepusht), vier offene PRs (#6–#9), alle CI-Checks grün.

---

## 1. Überblick

| Bereich                | Ergebnis                                                                                      | Wo                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Branding               | Markenfarben (Akzent Mint, Bonus Orange, Danger Rot) zentral in einer Datei                   | PR [#6](https://github.com/lukaspock/moeni/pull/6) |
| Datenbank              | Neue Profilfelder für Onboarding + `healthkit_uuid` bei Gewicht, live auf Supabase angewendet | PR #6                                              |
| CI/CD                  | Pipeline gehärtet, ein einziger Pflicht-Check `CI OK`, Dependabot bereinigt                   | PR [#7](https://github.com/lukaspock/moeni/pull/7) |
| Apple Health (Phase 5) | Import von Workouts + Gewicht, Dedupe/Merge, Write-back, Einstellungsseite                    | PR [#8](https://github.com/lukaspock/moeni/pull/8) |
| Onboarding v2          | Personalisierter, animierter Flow, Sign-up als Standard, Zielprognose, Essens-Erinnerungen    | PR [#9](https://github.com/lukaspock/moeni/pull/9) |
| iPhone-Build           | App mit kostenlosem Apple-Account auf dem iPhone 15 installiert                               | nur lokal (`integration/sprint-2`)                 |

Automatisch geprüft auf `integration/sprint-2`: `npm run typecheck` ✔, `npm run lint` ✔, `jest` **171/171 Tests** ✔ (14 Suites).
**Noch nicht** geprüft: die Flows im Simulator und auf dem Gerät (siehe §7).

---

## 2. Team, Rollen & Arbeitsweise

| Agent         | Rolle                                                                                                                                                   | Ergebnis                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `lead` (Opus) | Nur Orchestrierung: planen, Aufgaben schneiden, reviewen, koordinieren, Metro starten. Auf Wunsch des Owners macht er die Hauptarbeit **nicht** selbst. | –                             |
| `foundation`  | Theme, Migration, native Dependencies, Health-Contract                                                                                                  | PR #6                         |
| `devops`      | CI/CD-Pipeline                                                                                                                                          | PR #7                         |
| `health`      | Apple Health (Phase 5)                                                                                                                                  | PR #8                         |
| `onboarding`  | Onboarding v2, Auth, Notifications                                                                                                                      | PR #9                         |
| `device`      | Integration + Build auf dem iPhone                                                                                                                      | Branch `integration/sprint-2` |
| `docs`        | Dieser Bericht, DEVLOG/CLAUDE.md abgleichen                                                                                                             | dieses Commit                 |

Arbeitsweise:

- Jeder Agent arbeitet nur in seinem Dateibereich, auf eigenem Branch (Git-Worktree), und liefert einen PR. **Der Owner merged.**
- `foundation` hat zuerst die gemeinsamen Verträge gelegt (Theme, DB-Spalten, `src/features/health/index.ts`), danach liefen `health` und `onboarding` parallel darauf auf (gestapelte PRs).
- Jeder Agent hakt in `DEVLOG.md` ab und schreibt eine Log-Zeile; Architekturregeln stehen in `CLAUDE.md`.

---

## 3. Entscheidungen des Owners (diese Session)

1. **Onboarding erweitern** mit allem, was sinnvoll ist – aber lebendig/interaktiv: Name + Motivation, Ernährung + Trainingserfahrung + Zielgewicht, Permission-Primer (Health, Mitteilungen), „Wow-Effekt“ am Ende.
2. **Akzentfarbe Mint**, leicht änderbar (→ eine Datei `theme.config.js`).
3. **Sign-up ist die Standard-Option** bei der Anmeldung („Ich habe schon ein Konto“ sichtbar daneben).
4. **Branches + PRs**, der Owner merged selbst.
5. **devops-Agent** für CI/CD: CI läuft nur bei Push auf `main` und bei PRs.
6. **Kein bezahlter Apple-Developer-Account** → Build mit kostenlosem „Personal Team“.
7. **Ziel: MVP bis einschließlich Phase 5.**

---

## 4. Was pro Agent / PR gemacht wurde

### PR #6 – `foundation` (`feat/foundation-theme-health` → `main`)

- `theme.config.js` ist die **einzige Quelle** der Markenfarben (`accent` Mint/`systemMint`, `bonus` Orange, `danger` Rot; je iOS-Semantic-Name + Light/Dark-Hex).
- `src/theme/colors.ts`: `themeColor()` (PlatformColor), `platformColorName()`, `useThemeHex()` (für Skia).
- Umgestellt: NativeWind-Tokens, NativeTabs-Tint, `KcalRing` (Skia, jetzt Dark-Mode-fähig), `MacroBar`, SF-Symbol-Tints, `Switch`-Track.
- Neues Config-Plugin `plugins/withAccentColor.js`: schreibt die iOS-`AccentColor` ins Asset-Catalog → native Controls (@expo/ui Slider, DatePicker …) folgen automatisch.
- Migration `20260929100000_onboarding_profile_and_health.sql` **live angewendet**, Typen neu generiert (Details §6).
- Installiert: `@kingstinct/react-native-healthkit` v16, `expo-notifications`; Plugins in `app.config.ts` (HealthKit-Texte, keine Background-Delivery).
- Health-Contract-Stubs in `src/features/health/`.
- Supabase-Advisors: nur Warnung `auth_leaked_password_protection` (nur im Dashboard behebbar → Owner-To-do).

### PR #7 – `devops` (`ci/pipeline-hardening` → `main`, unabhängig)

- Trigger: `ci.yml` nur Push auf `main` + alle PRs (auch gestapelte); Deploy nur von `main`, weiterhin über `SUPABASE_DEPLOY_ENABLED` gesperrt; EAS nur manuell.
- `changes`-Job (Paths-Filter) überspringt App- bzw. Supabase-Job bei reinen Doku-Änderungen; neuer Sammel-Check **`CI OK`** = der einzige Check für Branch Protection.
- Concurrency (nur PRs werden abgebrochen), minimale Permissions, Timeouts, npm-/Deno-Caches.
- Action-Versionen angehoben (checkout/setup-node v7, setup-cli v3, expo-github-action v9) → **Dependabot #1–#4 überflüssig**.
- Dependabot-Ignores für Majors von TypeScript (TS 7 bricht typescript-eslint → deshalb schlägt **#5** fehl), Tailwind (NativeWind 4.2 braucht v3), Babel, Jest und Expo-verwaltete Pakete.
- PR-Template. CI-Risiko der Cron-Migration geprüft: `supabase db reset --local` läuft in der main-CI grün → erledigt.

### PR #8 – `health` (`feat/apple-health`, gestapelt auf #6) – Phase 5

- **Import** von Workouts und Gewicht über Anchored Queries (Anker pro User in MMKV), erster Sync = letzte 30 Tage.
- **Deterministische IDs** (UUID aus `userId` + HealthKit-UUID) + `healthkit_uuid` → Re-Import ist idempotent.
- **Kein Doppelzählen**: Health-Workout, das sich ≥ 50 % mit einem møni-Workout überschneidet, wird **zusammengeführt** (Health-kcal gewinnt), nicht doppelt angelegt.
- **Loop-Vermeidung**: eigene Samples (Bundle-ID/Metadata) werden nicht wieder importiert.
- **Löschungen** in Health werden übernommen.
- **Write-back**: fertige Workouts/Cardio nach Health; optional Ernährung (4 Samples pro Mahlzeit mit Sync-Identifier → Bearbeiten ersetzt, Löschen entfernt).
- **Auto-Sync** beim Start + beim Zurückkehren in die App, höchstens alle 5 Minuten.
- UI: Einstellungsseite `app/(tabs)/profile/health.tsx`, Zeile im Profil, „Apple Health“-Badge in der Trainingshistorie. i18n-Namespace `health` (DE/EN).
- 23 neue Jest-Tests für die reinen Mapper.

### PR #9 – `onboarding` (`feat/onboarding-v2`, gestapelt auf #6)

- **Flow** (Reihenfolge rein & getestet in `src/features/auth/onboardingFlow.ts`): Welcome → Name → Motivation → Geschlecht → Geburtsdatum → Körper → Aktivität → Ziel → Zielgewicht → Tempo → Erfahrung → Trainingsplan → Ernährung → Disclaimer → „Berechne…“ → Ergebnis (mit Prognosekurve) → Apple-Health-Primer → Mitteilungs-Primer → Sign-up. (17 Schritte in `ONBOARDING_STEPS` + Welcome + Sign-up = 19 Screens; Zielgewicht/Tempo entfallen bei „Gewicht halten“, Health-Primer entfällt ohne HealthKit.)
- Abweichung: Aktivität kommt **vor** dem Ziel, damit Zielgewicht/Tempo schon echte kcal und ein Zieldatum zeigen.
- Lebendig: Auswahlkarten mit SF Symbols, Haptik, Auto-Weiter, animierter Fortschrittsbalken, Count-up der Werte, Skia-Gewichtskurve; Reduce Motion wird respektiert.
- **Sign-up als Standard**, sichtbarer Button „Ich habe schon ein Konto“; wiederkehrende Nutzer überspringen den Fragebogen.
- **Auth-Gate** (`app/_layout.tsx`) schreibt den Entwurf selbst ins Profil (mit Retry-Screen), **überschreibt nie ein bestehendes Profil**, schickt eingeloggte Nutzer ohne Profil ins Onboarding.
- Versionierter Draft-Store (`version: 1` + Migration).
- Neue reine Domain: `src/domain/projection.ts` (BMI-Grenzen, Zielgewicht-Vorschlag/-Prüfung, Tempo, Zieldatum, Kurve) + `computeGoalProjection` in `onboarding.ts`.
- **Lokale Essens-Erinnerungen** (`src/features/notifications`, 09:00/13:00/19:30).
- Profil: neue Sektion `PersonalSection`; Heute-Tab: Begrüßung mit Namen.

### `device` – lokaler Branch `integration/sprint-2` (nicht gepusht)

- #8 und #9 ohne Konflikte auf #6 zusammengeführt.
- Build mit kostenlosem Apple-Account: Plugin `plugins/withoutPushEntitlement.js` entfernt `aps-environment` (Personal Teams dürfen kein Push signieren; wir nutzen nur lokale Mitteilungen). `ios.appleTeamId` kommt aus der Env-Variable `APPLE_TEAM_ID` (nie committen).
- Xcode-Projekt/Scheme heißt `mni` (das „ø“ wird entfernt).
- `xcodebuild` + `devicectl` → App auf „iPhone Lukas“ (iPhone 15) installiert.
- ESLint/Jest ignorieren `.claude/**` (Agent-Worktrees), `.gitignore` ergänzt.
- Diese beiden Commits (`7a26809`, `932668a`) sind **in keinem PR** – sie kommen mit dem Integrations-PR der QA.

---

## 5. Merge-Reihenfolge (für den Owner)

1. **#6 zuerst** mergen. GitHub setzt die Basis von **#8** und **#9** danach automatisch auf `main` um.
2. **#8** und **#9** mergen (Reihenfolge egal; lokal ohne Konflikte zusammengeführt).
3. **#7** ist unabhängig und kann jederzeit gemergt werden.
4. Dependabot **#1–#4 schließen** (durch #7 überflüssig). **#5** schlägt wegen TypeScript 7 fehl → schließen; #7 ignoriert diese Majors künftig.
5. Danach kommt der QA-Integrations-PR (Bugfixes + Device-Commits).

---

## 6. Architektur-Neuerungen & DB-Änderungen

**Theme** – Farbe ändern = nur `theme.config.js` anpassen und neu bauen (die native AccentColor wird beim Prebuild geschrieben). Skia bekommt Hex-Werte über `useThemeHex()`, alles andere PlatformColor.

**Health-Sync** – `src/features/health/`: `healthkit.ts` (lädt die Native-Lib lazy, kein Crash ohne Modul), `mappers.ts` (rein, getestet), `sync.ts` (Import), `export.ts` (Write-back), `index.ts` (Contract + `useHealthAutoSync`). Workouts laufen über die Offline-Outbox. Nur Workouts zählen zum Trainingsbonus, nie der Tages-Aktivumsatz.

**Onboarding** – Schrittfolge nur in `onboardingFlow.ts`; Screens rufen `useOnboardingNavigation(step).goNext()` statt Routen hart zu codieren. Neue Draft-Felder → Store-Version erhöhen.

**Notifications** – `src/features/notifications/index.ts`: Berechtigung abfragen, Erinnerungen planen/stornieren, `useMealReminders()`. Nur lokal, kein Push.

**Datenbank** (Migration `20260929100000_onboarding_profile_and_health.sql`, live):

| Tabelle       | Neue Spalte                     | Typ / Constraint                                          |
| ------------- | ------------------------------- | --------------------------------------------------------- |
| `profiles`    | `display_name`                  | text, 1–40 Zeichen                                        |
| `profiles`    | `motivation`                    | text, `health/look/performance/energy/confidence`         |
| `profiles`    | `diet`                          | text, `omnivore/flexitarian/pescetarian/vegetarian/vegan` |
| `profiles`    | `training_experience`           | text, `beginner/intermediate/advanced`                    |
| `profiles`    | `target_weight_kg`              | numeric, 0–500                                            |
| `profiles`    | `health_disclaimer_accepted_at` | timestamptz                                               |
| `weight_logs` | `healthkit_uuid`                | text, unique                                              |

Alle Profilspalten sind nullable (bestehende Nutzer bleiben gültig). `src/types/database.ts` ist neu generiert.

---

## 7. Teststand (ehrlich)

| Was                                                                                                              | Status                                             |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Typecheck, Lint, Jest (171 Tests) auf `integration/sprint-2`                                                     | ✔ lokal grün                                       |
| CI auf PRs #6, #7, #8, #9                                                                                        | ✔ grün                                             |
| Reine Logik (Domain, Projection, Onboarding-Flow, Health-Mapper, Outbox)                                         | ✔ durch Unit-Tests abgedeckt                       |
| Native Build für das iPhone (Free Team)                                                                          | ✔ gebaut + installiert                             |
| App-Start auf dem iPhone                                                                                         | ⏳ braucht erst „Entwickler vertrauen“ (siehe §8)  |
| Onboarding, Sign-up, Profil, Health-Sync, Erinnerungen **im Simulator/auf dem Gerät**                            | ✖ noch nicht durchgespielt                         |
| Native UI-Teile (@expo/ui DatePicker/Picker/Toggle, Skia-Animationen, Fortschrittsbalken, SF-Symbol-Animationen) | ✖ nur typgeprüft                                   |
| HealthKit-Verhalten (Berechtigungsdialog, Import, Write-back)                                                    | ✖ auf dem Gerät nicht verifiziert                  |
| Sprint-1-Flows (Essen loggen, Workouts)                                                                          | ✖ weiterhin ohne vollständigen Simulator-Durchlauf |

Regel 8 aus `CLAUDE.md` („nach jeder Phase im Simulator prüfen“) ist für Sprint 2 **noch offen** – das ist die Aufgabe des QA-Agents.

---

## 8. App auf dem iPhone starten

Voraussetzung: kostenloser Apple-Account in Xcode angemeldet, iPhone per Kabel oder im selben WLAN, Entwicklermodus am iPhone aktiv.

1. **Erster Start**: iPhone → _Einstellungen → Allgemein → VPN & Geräteverwaltung_ → Entwickler-App auswählen → **Vertrauen**.
2. **Metro** auf dem Mac starten (aus `~/Documents/moeni`, nicht `møni`):
   ```bash
   npx expo start --dev-client
   ```
   Den QR-Code mit der iPhone-Kamera scannen → öffnet die møni-Dev-App.
3. **Gleiches WLAN** für Mac und iPhone. Geht das nicht (z. B. Firmen-/Gäste-WLAN), mit Tunnel starten: `npx expo start --dev-client --tunnel`.
4. **Profil läuft nach 7 Tagen ab** (Einschränkung des kostenlosen Accounts) → App startet nicht mehr → neu bauen und installieren:
   ```bash
   export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 APPLE_TEAM_ID=<team id>
   npx expo prebuild --platform ios --clean
   xcodebuild -workspace ios/mni.xcworkspace -scheme mni -configuration Debug \
     -destination id=<UDID> -derivedDataPath ios/build/device \
     -allowProvisioningUpdates DEVELOPMENT_TEAM=$APPLE_TEAM_ID build
   xcrun devicectl device install app --device <UDID> \
     ios/build/device/Build/Products/Debug-iphoneos/mni.app
   ```
   Ein Neubau ist auch nötig, wenn sich native Teile ändern (neue Pakete, Plugins, `theme.config.js`-Akzentfarbe). Reine JS-Änderungen kommen einfach über Metro.

---

## 9. Bekannte Bugs & offene Punkte

| #   | Problem                                                                                                                                                                                                                                          | Bereich       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| 1   | Manuelles Gewicht im Profil macht `upsert` auf `weight_logs` mit `onConflict: 'user_id,date'`, es gibt aber keinen Unique-Constraint darauf → **schlägt fehl**. Achtung: ein Unique-Constraint würde mehrere Health-Gewichte pro Tag blockieren. | Profil / DB   |
| 2   | `useWorkoutsForDate` nutzt UTC-Tagesgrenzen statt lokaler Zeit → späte Workouts landen am Nachbartag.                                                                                                                                            | Workout       |
| 3   | Apple Health ist noch nicht Premium-gesperrt (laut PLAN Premium, kommt in Phase 7).                                                                                                                                                              | Health        |
| 4   | Zusammengeführtes, dann in Health gelöschtes Workout behält die Health-kcal.                                                                                                                                                                     | Health        |
| 5   | Erinnerungen werden bei Sprachwechsel nicht neu geplant (bleiben in alter Sprache).                                                                                                                                                              | Notifications |
| 6   | Kein Foreground-Notification-Handler → Erinnerungen erscheinen nur, wenn die App im Hintergrund ist.                                                                                                                                             | Notifications |
| 7   | Erinnerungs-Toggle flackert/bleibt optisch an, wenn die Berechtigung verweigert wird.                                                                                                                                                            | Profil        |
| 8   | Langsamer Profil-Fetch (offline) → ca. 7 s leerer Bildschirm vor dem Fallback.                                                                                                                                                                   | Auth-Gate     |
| 9   | Viele native UI-Teile nur typgeprüft, nie ausgeführt (§7).                                                                                                                                                                                       | alle          |
| 10  | Prettier wird nicht erzwungen (kein Check in CI/Lint).                                                                                                                                                                                           | Tooling       |
| 11  | HealthKit-Verhalten auf dem Gerät unverifiziert.                                                                                                                                                                                                 | Health        |

Weitere ältere offene Punkte (Sprint 1, Backend, Gemini-Kosten, App-Icon …) stehen in `DEVLOG.md`.

---

## 10. To-dos für den Owner

- [ ] PRs mergen in der Reihenfolge aus §5; Dependabot #1–#5 schließen.
- [ ] GitHub **Branch Protection** für `main`: Pflicht-Check **`CI OK`**.
- [ ] GitHub **Secrets**: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `EXPO_TOKEN`.
- [ ] GitHub **Variables**: `SUPABASE_PROJECT_REF`, `SUPABASE_DEPLOY_ENABLED` (= `true`, sobald Deploy gewünscht).
- [ ] GitHub **Environment** `production` anlegen.
- [ ] Supabase-Dashboard: **Leaked Password Protection** aktivieren (einzige Advisor-Warnung).
- [ ] iPhone: Entwickler-App vertrauen (§8) und alle 7 Tage neu installieren lassen.

---

## 11. Nächste Schritte

1. **QA-Agent**: Bugs aus §9 beheben, alle Kern-Flows im Simulator **und** auf dem iPhone durchspielen (Onboarding → Sign-up → Heute, Essen loggen, Workout, Profil, Apple Health, Erinnerungen), dann PR mit den Integrations-Fixes + Device-Commits.
2. Danach **Phase 6** (Gewichtsverlauf, adaptiver TDEE, `recompute-targets` + pg_cron, Insights-Tab), **Phase 7** (RevenueCat, Paywall, Premium-Gate inkl. Apple Health), **Phase 8** (Polish, App-Icon, Datenschutz, Account-Löschung, TestFlight – braucht dann einen bezahlten Apple-Account).
