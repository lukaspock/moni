# Sprint 3 – Bericht & Arbeitsauftrag (Start 2026-09-30)

Stand beim Start: Phase 6 (Gewicht, Insights, adaptiver TDEE) und Schnell-Loggen sind in `integration/sprint-2` integriert und als Release-Build auf dem iPhone des Owners. Der Owner hat beim Ausprobieren neue Fehler gefunden. **Dieses Dokument ist die gemeinsame Wahrheit für alle Agents dieses Sprints: erst lesen, dann arbeiten.**

---

## 1. Vom Owner gemeldete Fehler (Release-Build auf dem iPhone 15)

### BUG-A – „+"-Button (Essen loggen) liegt unter der Liquid-Glass-Tab-Bar

- **Wo:** `app/(tabs)/index/index.tsx` (Heute-Tab), Komponente `src/components/glass/FloatingActionButton.tsx`.
- **Symptom:** Der schwebende „+"-Button ist auf dem iPhone nicht erreichbar/sichtbar, weil er von der nativen Tab-Bar (NativeTabs, iOS 26 Liquid Glass) verdeckt wird. Damit ist der **einzige Einstieg in `/log-food`** praktisch unbenutzbar.
- **Ursache (Vermutung, noch nicht verifiziert):** Der Button ist mit `position: 'absolute', right: 20, bottom: 24` relativ zum Screen positioniert, ohne die Höhe der Tab-Bar / Safe-Area-Insets zu berücksichtigen. Die native Tab-Bar schwebt über dem Inhalt.
- **Gewünschte Lösung (Owner):** Der „+"-Button soll **Teil der Nav-/Tab-Bar** sein. Reihenfolge der Präferenz: (1) natives iOS-26-Muster der Tab-Bar (z. B. Bottom Accessory / eigener Aktions-Tab, sofern `expo-router/unstable-native-tabs` in SDK 57 das anbietet – in den Typen/Docs prüfen), (2) Glass-„+"-Button in der Navigationsleiste (headerRight/Toolbar) des Heute-Tabs, (3) Notlösung: FAB mit `useSafeAreaInsets()`/Tab-Bar-Höhe oberhalb der Tab-Bar. Hard Rule 1 (nur native Liquid Glass, kein expo-blur) gilt.
- **Akzeptanz:** „+" ist auf dem Heute-Tab immer sichtbar und tippbar, öffnet `/log-food`, Dark/Light Mode ok, VoiceOver-Label vorhanden.

### BUG-B – Überschrift zeigt immer „Today"/„Heute", egal welcher Tag gewählt ist

- **Wo:** `app/(tabs)/index/_layout.tsx` (`title: t('today.title')`, `headerLargeTitle: true`), Datum wird in `index.tsx` als `dateLabel` nur im Inhalt gezeigt.
- **Symptom:** Wechselt man den Tag (Pfeile im Header), bleibt die Überschrift „Today". Man sieht nicht eindeutig, welchen Tag man gerade bearbeitet.
- **Erwartet:** Der Header-Titel folgt dem gewählten Tag: „Heute", „Gestern", „Morgen" bzw. sonst Wochentag + Datum (lokalisiert DE/EN über `t()`/`Intl`, nie hartcodiert). Der Titel muss dynamisch über `Stack.Screen options={{ title }}` aus `index.tsx` gesetzt werden (der statische Titel im `_layout.tsx` ist der Auslöser).
- **Akzeptanz:** Titel ändert sich mit jedem Tageswechsel (Pfeile und Swipe), kein doppelter Datumstext mehr im Inhalt.

### BUG-C – App stürzt ab beim Wischen links/rechts zum Tagwechsel

- **Wo:** `app/(tabs)/index/index.tsx`, `swipeGesture` (`Gesture.Race(Gesture.Fling()…)` um die ganze Ansicht, darin zusätzlich `Swipeable`-Zeilen der Mahlzeiten).
- **Symptom:** Wischt man statt der Pfeil-Buttons links/rechts auf dem Heute-Screen, **crasht die App** (Release-Build, reproduzierbar laut Owner).
- **Ursache (Hypothese, muss der Agent bestätigen):** `Gesture.Fling().onEnd(() => goNextDay())` läuft in react-native-gesture-handler/Reanimated standardmäßig als **Worklet auf dem UI-Thread** und ruft dort `setDate` (React-State, JS-Thread) auf. Fehlt `.runOnJS(true)`, ist das ein Thread-Fehler/Crash. Zusätzlich: `useMemo(..., [])` mit veralteten Closures (`goNextDay` greift auf alte State-Referenzen zu, besser `setDate((d) => …)` innerhalb von `runOnJS`), und Konflikt mit den verschachtelten `Swipeable`-Zeilen bzw. dem vertikalen `ScrollView` (Gesten-Konkurrenz).
- **Erwartet:** Horizontales Wischen wechselt den Tag zuverlässig (links = nächster Tag, rechts = vorheriger), kein Konflikt mit dem Wischen der Mahlzeit-Zeilen (Löschen) und dem Scrollen. Zukünftige Tage ggf. begrenzen (Entscheidung des Agents, dokumentieren).
- **Akzeptanz:** 50× schnelles Wischen in beide Richtungen ohne Crash (Simulator Release- und Debug-Build), Zeilen-Swipe löscht weiterhin, Haptik optional.
- **Wichtig:** Crash-Ursache mit einem Log (`xcrun devicectl … --console` bzw. Simulator-Log/Crash-Report) **belegen**, nicht nur vermuten, und die echte Ursache hier ergänzen.

---

## 2. Bekannte Lücken aus Sprint 2/Phase 6 (werden in diesem Sprint geschlossen)

| #   | Problem                                                                                                                            | Lösung                                                                                                                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | **Quick-Log loggt immer auf heute**, nicht auf den angesehenen Tag der Heute-Ansicht (`app/log-food.tsx`, `src/features/food/**`). | Das gewählte Datum als Route-Param/Draft-Feld durchreichen (`start({ date })`), Default = heute. Quick-Log, Review, Barcode/Label und Favoriten nutzen dieses Datum.                                          |
| L2  | **Label-Fotos werden nie aus dem Storage gelöscht** (`analyze-food` mode `label` lädt das Foto hoch).                              | Aufräumen: Foto nach erfolgreicher Analyse löschen bzw. serverseitig nach kurzer Zeit (Edge Function / pg_cron / Storage-Lifecycle). Food-Fotos, die am Log hängen, bleiben erhalten. Datenschutz beachten.   |
| L3  | **Label-Scans werden als `source = 'barcode'` gespeichert** (Schema kennt kein `label`).                                           | Neue Migration `food_logs`/`food_items` `source`-CHECK um `'label'` erweitern (nie eine angewendete Migration editieren), Edge Function + Client + Typen (`src/types/database.ts`) anpassen, Advisors prüfen. |
| L4  | **`integration/sprint-2` nur lokal**, nicht gepusht; PRs #6–#9 noch offen.                                                         | Lead: alles in `main` mergen und pushen (siehe §3), PRs als erledigt schließen.                                                                                                                               |

---

## 3. Ablauf in diesem Sprint

1. **Dokumentation** (dieses Dokument + `DEVLOG.md`) – erledigt, bevor irgendwer Code anfasst.
2. **Zuerst alles auf den neuesten Stand bringen** (Lead): `integration/sprint-2` nach `main` mergen, pushen, CI prüfen, alte Agent-Worktrees/Branches aufräumen. Erst danach neue Arbeit.
3. **Dann parallel** (jeder Agent eigener Worktree ab dem neuen `main`, eigene Dateibereiche):
   - `ui-fixes`: BUG-A, BUG-B, BUG-C (`app/(tabs)/index/**`, `src/components/glass/**`, Tab-Layout-Teil für die Bar).
   - `food-followups`: L1, L2, L3 (`app/log-food*`, `app/food-review*`, `app/barcode-scanner*`, `src/features/food/**`, `supabase/functions/analyze-food/**`, neue Migration, Typen). Berührt `app/(tabs)/index/**` **nicht** – das Datum kommt als Param.
4. Lead reviewt, mergt, lässt Prettier laufen (`npm run format`), prüft `typecheck`/`lint`/`test`/`format:check`, baut Release und installiert neu auf dem iPhone.

## 4. Regeln für alle Agents (Kurzfassung)

- `CLAUDE.md` und dieses Dokument lesen. Hard Rules gelten (native first, `t()` für alle Strings DE+EN, Berechnungen in `src/domain`, RLS, keine Secrets im Client).
- Nur im zugewiesenen Dateibereich arbeiten. Conventional Commits auf dem eigenen Worktree-Branch.
- Jeden Fehler, jede Ursache und jede Entscheidung **in `DEVLOG.md` und hier (§1/§2) festhalten** – inkl. der echten Crash-Ursache.
- Nach Änderungen: `npm run typecheck && npm run lint && npm test && npm run format:check`.
- Im Bericht ehrlich sein: was wurde verifiziert (Simulator/Gerät), was nicht.

---

## 5. STATUS & ÜBERGABE (Stand 2026-09-30, abends) – **hier weitermachen**

**Was passiert ist:** Beide Sprint-3-Agents (`ui-fixes`, `food-followups`) wurden gestartet und sind **vorzeitig abgebrochen** (Session-Limit/HTTP 429, „resets 9:10pm Europe/Vienna"). **Keine Aufgabe ist abgeschlossen.** Es gibt keine Commits der Agents, nur uncommittete Teilarbeit in ihren Worktrees (unten). `main` = `6c05fd2` (+ ggf. neuere Docs-Commits) ist gepusht und enthält alles aus Sprint 2 + Phase 6 + Doku.

| Aufgabe                            | Status                                          | Nächster Schritt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BUG-A „+"-Button unter der Tab-Bar | **nicht begonnen**                              | Siehe §1. Zuerst prüfen, was `expo-router/unstable-native-tabs` (SDK 57) an Bottom-Accessory/Action-Tab/Toolbar bietet.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| BUG-B Header-Titel immer „Today"   | **nicht begonnen**                              | `Stack.Screen options={{ title }}` in `app/(tabs)/index/index.tsx` dynamisch; statischer Titel in `app/(tabs)/index/_layout.tsx` ist die Ursache.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| BUG-C Crash beim Wischen           | **nur Repro-Versuch**, Ursache **unbestätigt**  | Worktree `.claude/worktrees/agent-a957e1883c887cc0f` enthält die untracked Datei `app/gesture-repro.tsx` (isolierte Kopie des Fling-Gestes zum Reproduzieren; **nicht** nach `main` übernehmen, nur Hilfsmittel). Der Agent war beim Bundlen/Starten im Simulator. Noch kein Crash-Log. Hypothese (§1) unverändert.                                                                                                                                                                                                                                                                                            |
| L1 Quick-Log → angesehener Tag     | **teilweise** (uncommitted)                     | Worktree `…/agent-a9948fe5f6aec970c`: neu `src/domain/logDate.ts` + `logDate.test.ts` (Datums-Validierung), Änderungen in `src/domain/index.ts`, `types.ts`, `src/features/food/draftStore.ts`. Noch **nicht** in `app/log-food.tsx`/Review/Barcode verdrahtet; Test lief noch nicht grün (Agent notierte: Globals statt `bun`-Import im Test). Der Call-Site-Param `date` in `app/(tabs)/index/index.tsx` fehlt noch.                                                                                                                                                                                         |
| L2 Label-Fotos löschen             | **teilweise** (uncommitted, **nicht deployed**) | Im selben Worktree: `analyze-food` löscht das Label-Foto nach dem Lesen (Änderung in `supabase/functions/analyze-food/index.ts`), neue Function `supabase/functions/cleanup-label-photos/` + Eintrag in `supabase/config.toml` (Aufräumen verwaister Fotos). **Nicht deployed, nicht getestet.** Das Cron-Secret `service_role_key` (Vault) fehlt auf dem Live-Projekt weiterhin → Cron-Jobs tun nichts, bis der Owner es anlegt.                                                                                                                                                                              |
| L3 Quelle `'label'`                | **Migration geschrieben, NICHT angewendet**     | Datei `supabase/migrations/20260930140000_food_source_label.sql` (nur im Worktree `…/agent-a9948fe5f6aec970c`, untracked): erweitert `food_logs.source`-CHECK um `'label'` und legt `trigger_cleanup_label_photos()` + Cron an. Remote steht bei `20260930120000` (verifiziert mit `supabase migration list --linked`). Ablauf: prüfen → `supabase db push --linked --dry-run` → push → `supabase gen types …` → `supabase db advisors --linked` → Client/Edge Function auf `source: 'label'` umstellen → `analyze-food` **und** `cleanup-label-photos` deployen.                                              |
| L4 Branch pushen                   | **erledigt**                                    | `main` und `integration/sprint-2` sind auf GitHub. PRs #6–#9 sollten als gemergt erscheinen; Dependabot-PRs #1–#5 sind **noch offen** (Owner schließt sie selbst oder erlaubt es ausdrücklich).                                                                                                                                                                                                                                                                                                                                                                                                                |
| SEC-1 Sicherheitsfund              | **offen, nicht untersucht**                     | Automatischer Review des Pushs meldete: „rate-limit-bypass in `supabase/functions/analyze-food/index.ts`" (Details lagen nicht vor). Bitte prüfen: Wird das Free-Limit (`FREE_AI_LIMIT_PER_DAY`, Tabelle `ai_usage`) in **allen** Modi (`text`, `photo`, `label`) vor dem Gemini-Call geprüft und atomar hochgezählt? Wird `label` korrekt gezählt? Race-Bedingungen bei parallelen Requests? Kann ein Client über `mode`/fehlende Felder am Zähler vorbeikommen? Erst als echter Bug bestätigen, dann fixen + Test/Notiz. Mit `/security-review` auf `main` erneut laufen lassen, um die Details zu bekommen. |

**Empfohlene Reihenfolge für den nächsten Engineer**

1. Agents sind per Session-Limit gestoppt: entweder nach dem Reset (21:10 Wien) neu starten oder selbst arbeiten. Teilarbeit aus den Worktrees ggf. per `git diff`/Kopie übernehmen (beide Worktrees liegen unter `.claude/worktrees/`, sind nicht committet). Wer die Dateien übernimmt, committet sie auf einem frischen Branch von `main`.
2. **ui-fixes** und **food-followups** wieder parallel (Dateibereiche siehe §3; Datum als Route-Param `date`).
3. SEC-1 untersuchen.
4. Danach: mergen, `npm run format` + `npm run format:check`, `typecheck`/`lint`/`test`, Release-Build neu (siehe `docs/sprint-2.md` §8 bzw. Befehle in `CLAUDE.md`, Konfiguration **Release**, Gerät „iPhone Lukas" `00008120-001274EE2610A01E`, Team-ID per `APPLE_TEAM_ID` aus Xcode-Defaults) und auf dem iPhone installieren; `~/Desktop/moeni-ipa/moeni.ipa` für AltStore/SideStore neu packen.

**Release-Build, den der Owner gerade nutzt:** gebaut aus `integration/sprint-2` (Commit `cabcbbe`), enthält **noch** BUG-A/B/C. Dev-Hinweis: Der Build läuft ohne Metro; der Free-Account-Profilablauf ist 7 Tage (→ 2026-10-07), AltStore/SideStore erneuert automatisch, sobald der Owner es einrichtet (Apple-Login nötig, nicht automatisierbar).

**Offene Owner-To-dos (unverändert):** Vault-Secret `service_role_key` anlegen (sonst tun beide Cron-Jobs nichts), Dependabot #1–#5 schließen, Branch Protection (`CI OK`), GitHub-Secrets/Variablen/Environment `production`, Supabase Leaked-Password-Protection.
