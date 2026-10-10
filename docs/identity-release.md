# Identity-Release – møni bekommt ein Gesicht (Branch `feat/identity`, 2026-10-09/10)

Kurzbericht für den Owner: was sich geändert hat, was bewusst später kommt, was du tun musst und wie du die neue Version aufs iPhone bekommst. Details und Begründungen stehen in `docs/identity/IDENTITY-PLAN.md` (Entscheidungen D1–D13) und den Fachdokumenten `docs/identity/01`–`05`. Technische Regeln für Agents: `CLAUDE.md` und `docs/design-system.md`.

---

## 1. Was ist neu

### Marke

- **Leitbild:** „Dein Tag hat Gezeiten.“ møni ist ein **Pegel**, in dem Essen und Training zusammenlaufen. Ein Workout hebt den Pegel (die **Flut**), aber nur mit echten Daten.
- **Look „Nachtschicht im Fjord“:** grün getönte Dunkelheit, warmes Papier im Light Mode, ein leuchtender Lime-Akzent.
- **Ton:** ruhig, klar, warm-trocken. Keine Emojis mehr in der App, „møni“ immer klein, kein Rot und keine Moral, wenn du über dem Pegel liegst. Ein automatischer Test prüft Emojis, die Kleinschreibung von „møni“ und dass Deutsch und Englisch dieselben Texte haben.
- **Begriffe:** Pegel (Tageslimit), Flut (Workout-Bonus), Rhythmus (statt „Streak“), Gezeitentafel (Wochenrückblick), Einheit (Training), Stammgerichte (Favoriten).

### Logo und App-Icon

- Neues Zeichen **„Insel im Pegel“** (deine Entscheidung D13): eine Scheibe, schräg von einer Wellenlinie geschnitten. Oben Lime (Essen), unten Ember-Orange (die Flut vom Training). Der alte Bizeps-Arm und der „Schnitt-Ring“ aus den Entwürfen sind raus.
- Das Logo wird per Skript erzeugt (`docs/identity/logo/generate_mark.py`), damit App, Icon und Grafiken immer exakt gleich aussehen.
- App-Icon als Liquid-Glass-Icon für iOS 26 (`assets/moni.icon`, zwei Ebenen „upper“/„lower“ auf Waldgrün-Verlauf), dazu neue Splash-Grafiken für Hell und Dunkel.

### Farben

- Akzent: **Lime** `#C6F135` im Dark Mode, **Waldgrün** `#1D6B47` im Light Mode (die alte Mint-Farbe ist weg).
- **Ember** `#FF8A3D` für den Workout-Bonus, eigene Farben für Protein (Violett), Kohlenhydrate (Honig) und Fett (Cyan), immer mit Buchstaben-Markierung.
- Der große Tages-Block oben („Hero“) ist **immer dunkel**, auch im Light Mode.
- Alle Farben stehen an einer Stelle (`theme.config.js`) und werden beim Bauen als echte iOS-Farben eingebaut. Darum ist nach Farbänderungen immer ein neuer nativer Build nötig.

### Schrift

- **Bricolage Grotesque** für Überschriften und große Zahlen, die normale iOS-Schrift (SF Pro) für alles andere. Zahlen sind gleich breit, damit nichts springt, wenn sie hochzählen.

### Bewegung und Haptik

- Einheitliche Animationen nach dem Gezeiten-Bild: Dinge steigen schnell und setzen sich langsam. Statt Konfetti gibt es aufsteigende Lichtpunkte („Gischt“). Wenn „Bewegung reduzieren“ in iOS an ist, fallen Animationen weg.
- Haptik läuft zentral über eine Stelle mit festen Mustern (z. B. Satz erledigt, Mahlzeit gespeichert, neue Bestmarke). Im Profil kannst du sie ausschalten.

### Screens

- **Heute:** dunkler Hero mit animiertem Kalorienring (Bonus strömt in Orange ein), Gruß nach Tageszeit und ein Tagessatz, eine „Nächster Schritt“-Karte, Wochenstreifen, Mahlzeiten-Gruppen, eine Einstiegs-Checkliste für neue Nutzer. Gespeicherte Mahlzeiten „fliegen“ sichtbar in den Ring.
- **Essen erfassen:** neu gestalteter Ablauf, eigener Lade-Effekt während der KI-Analyse („TideLoader“), neue Prüfansicht.
- **Training:** Training-Hero in Ember, Sätze werden mit einer Haken-Animation abgehakt, **Zusammenfassung 2.0** mit Protein-Hinweis und Bestmarken-Feier.
- **Onboarding:** gebrandeter Willkommens-Screen, Lade-Moment beim Berechnen, Ergebnis-Hero und „Halten zum Starten“. Die Länge des Onboardings bleibt wie von dir in Sprint 2 entschieden.
- **Insights und Profil:** **Gezeitentafel** (Wochenrückblick, als Text teilbar), Profil-Kopf „Mein møni“, Stempel-Regal, Einstellungen für Benachrichtigungen und Haptik.

### Rhythmus, Stempel, Gezeitentafel

- **Rhythmus** ersetzt die harte Tages-Streak: gezählt werden **Wochen**, in denen mindestens zwei von drei Ringen (Essen, Training, Protein) gehalten wurden. Es gibt Gnade-Wochen für Ausrutscher und einen Pause-Modus (z. B. Urlaub, Krankheit). Dazu kommen **Stufen**, die nie wieder sinken.
- **Stempel (Achievements):** 16 Start-Stempel sind aktiv (der Katalog hat 43, der Rest kommt später). Höchstens zwei Feiern pro Tag.
- **Gezeitentafel:** der Wochenrückblick mit den sieben Tagen, Ringen und einem kurzen Text.
- **Fürsorge-Signal:** Wenn du mehrere Tage deutlich weniger isst als geplant, zeigt „Heute“ einmal eine ruhige Karte statt Lob. Nichts in møni belohnt Weniger-Essen.
- Alles wird **auf dem Gerät** aus deinen vorhandenen Einträgen berechnet. Es gab **keine Datenbank-Änderung**. Auf einem neuen Gerät wird es neu berechnet.

### Benachrichtigungen (Verhaltensänderung)

- Neue Strategie: **höchstens eine Benachrichtigung pro Tag** (maximal vier pro Woche), nur zwischen 08:00 und 21:30, nie während einer Pause. Wenn du Hinweise ignorierst, wird møni von selbst leiser und fragt einmal nach, ob es ruhiger sein soll.
- Die festen Essens-Erinnerungen aus Sprint 2 sind jetzt **Opt-in** (standardmäßig aus). Einstellungen: Profil → Benachrichtigungen.

---

## 2. Bewusst später

- **Bild teilen** (Gezeitentafel als Grafik): braucht das Paket `react-native-view-shot`. Im Moment wird nur Text geteilt.
- **Teilen-Karte für ein Workout** und **„Vergleich zum letzten Mal“** während des Trainings.
- **Redesign der Übungs-Detailseite** (Verlauf einer Übung).
- **Maskottchen:** vertagt, weil es auf dem alten Zeichen basierte.
- **Tippen auf eine Benachrichtigung** öffnet noch keinen bestimmten Screen.
- **Mahlzeit vorauswählen** beim Öffnen von „Essen erfassen“ (die Mahlzeit wird weiter nach Uhrzeit vorgeschlagen).
- Aus dem Plan später: Monatsmuster, Widgets, Sound, Shader-Effekte, Sync von Rhythmus/Stempeln zwischen Geräten.
- Kleiner Doku-Rest: Die Stempel-IDs im Code (`plusTen`, `firstRhythm`) weichen von den Namen in Doc 05 ab (`plus_10`, `first_takt`). Im Code ist alles konsistent, nur das Dokument ist veraltet.

---

## 3. Deine To-dos

1. **Freigaben**
   - **Stufen-Namen** (Arbeitstitel): Anlauf, Einklang, Gleichschritt, Eingespielt, Metronom, Original. Freigeben oder Änderungen nennen.
   - **Fürsorge-Karte:** Text und Ziel des Buttons „Hilfe finden“ brauchen eine rechtlich geprüfte Fassung (Text liegt in `src/i18n/locales/*/identity.json` unter `care`).
2. **App-Icon prüfen:** `assets/moni.icon` im **Icon Composer** öffnen und die Varianten Hell, Dunkel und Getönt (Tinted) ansehen. Das Icon wurde per Skript erzeugt und noch nie in der Icon-Composer-Oberfläche geprüft.
3. **Neu installieren:** Die neue Version braucht einen kompletten nativen Neubau (neue Farben, Schrift, Icon). Ein reines JavaScript-Update reicht nicht, sonst sind Flächen unsichtbar.
4. **Free-Team-Profil:** Mit der kostenlosen Apple-ID läuft die App **nach 7 Tagen ab**. Danach einfach neu bauen und installieren (Befehle unten).
5. Weiter offen aus früheren Sprints: GitHub-Secrets, Branch-Schutz, Supabase-Einstellungen (siehe `docs/sprint-2.md`).

---

## 4. Neu bauen (Release, ohne Metro)

Im **ASCII-Pfad** `~/Documents/moeni` arbeiten (nicht `møni`). iPhone per Kabel verbinden, UDID z. B. mit `xcrun devicectl list devices` herausfinden.

```bash
cd ~/Documents/moeni
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 APPLE_TEAM_ID=<team id>
npx expo prebuild --platform ios --clean
xcodebuild -workspace ios/mni.xcworkspace -scheme mni -configuration Release \
  -destination id=<UDID> -derivedDataPath ios/build/device \
  -allowProvisioningUpdates DEVELOPMENT_TEAM=$APPLE_TEAM_ID build
xcrun devicectl device install app --device <UDID> \
  ios/build/device/Build/Products/Release-iphoneos/mni.app
```

- Beim ersten Start: am iPhone **Einstellungen → Allgemein → VPN & Geräteverwaltung** → Entwickler-App vertrauen.
- Ein Release-Build braucht keinen laufenden Metro-Server und keinen Mac im selben WLAN.
- Für die Entwicklung (mit Live-Reload) stattdessen `-configuration Debug` und `Debug-iphoneos` verwenden, dann `npx expo start --dev-client` starten.

---

## 5. Stand der Prüfung

- Typecheck, Lint, Tests und Prettier laufen pro Welle. Neue Logik (Rhythmus, Stempel, Benachrichtigungen, Haptik, Animationsmathe) hat Unit-Tests.
- **Noch offen:** der Release-Build dieses Branches auf deinem iPhone und ein vollständiger Durchlauf im Simulator in Hell und Dunkel. Bisher gibt es nur einen Debug-Build vom 2026-10-09.
