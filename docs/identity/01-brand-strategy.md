# møni – Markenstrategie (01)

> Teil des Identity-Sprints. Dieses Dokument ist die strategische Grundlage für Visual, Motion/Haptics, Illustration/Mark und UX/Gamification. Es ändert weder `PLAN.md` noch App-Code. Alles hier ist ein Vorschlag an den Owner, bis er abgenommen ist.
> Kurzfassung in einem Satz: **møni ist die ruhige Gezeitenuhr für Essen und Training – dein Tag hat einen Pegel, Training hebt ihn, und kein Tag „scheitert“.**

---

## 0. Ausgangslage: was die App heute sagt (Audit)

Gelesen: `CLAUDE.md`, `PLAN.md`, `docs/design-system.md`, `theme.config.js`, `src/i18n/locales/{de,en}.json` + `de/{food,account,notifications,insights}.json`, Onboarding, Today-Screen.

**Was schon gut ist**

- Du-Ansprache, kurze Sätze, ehrliche Hinweise („Eine Schätzung auf Basis deines Tempos“, Disclaimer ohne Angstmache). Der Onboarding-Satz „Deine Kalorien, im Takt mit deinem Training“ trifft die Produktidee schon genau. Das Wort „Takt“ ist ein Keim für die Markenidee unten.
- Neutrale Ring-Sprache: „kcal übrig“ / „kcal drüber“ (nicht „zu viel“).
- Sicherheits-Haltung im Produkt (Mindestwerte, Defizit-Deckel) – das ist ein Markenwert, kein Kleingedrucktes.

**Was generisch wirkt**

- Funktionale Standardwörter überall: „Tageslimit“, „Trainingsbonus“, „Ernährung“, „Übersicht“, „Heutiges Training“. Es gibt kein einziges Wort, das nur møni sagen würde.
- Emoji als Stimmung (👋 🎉 ☀️ 🍽️) – das ist der Ton jeder Wellness-App. Die Marke verliert damit ihre Ruhe.
- „Limit“ klingt nach Zaun. Der Ring-Zustand „drüber“ ist neutral, aber das zugrunde liegende Wort ist es nicht.
- Mint-Akzent = iOS-`systemMint`; Name „møni“ wird im UI nirgends als Gestaltungselement benutzt.
- Motivations-Optionen („Besser aussehen“) und „Los geht’s“-Rhetorik sind austauschbar.

---

## 1. Die Namens-Story: „møni“

### 1.1 Herkunft – ehrlich

„møni“ ist ein **erfundenes Wort**, kein Wörterbucheintrag. Wir erfinden keine Etymologie. Wir benutzen die _Resonanzen_, die der Name hat, und die sind stark genug:

| Resonanz             | Was dahintersteckt                                                                                      | Wie wir es nutzen                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ø = „Insel“**      | In Dänisch und Norwegisch ist **ø** ein eigenes Wort und heißt _Insel_.                                 | Das ø im Namen _ist_ eine kleine Insel in einem Ring aus Wasser. Gedanklicher Anker für Ruhe, Eigenständigkeit, „du bist der Mittelpunkt deines Tages“. |
| **Møn**              | Eine Kreideklippen-Insel in Dänemark (Møns Klint).                                                      | Nur als Stimmungsbild (Kreide, Meer, helles Licht, Nordlicht-Weite). Nie als Behauptung, møni „komme von dort“.                                         |
| **mønster** (Muster) | Skandinavisch für Muster/Pattern.                                                                       | Die Kernleistung der App: Muster zwischen Essen und Training sichtbar machen. Intern als Merksatz erlaubt, extern nicht erklären.                       |
| **måne** (Mond)      | Dänisch/Schwedisch: Mond; der Mond steuert die Gezeiten.                                                | Brücke zur Kernmetapher (Abschnitt 2). Der Ring mit Strich kann als Mond gelesen werden.                                                                |
| **mo-** + **-ni**    | Weicher Anlaut, offener Auslaut, kein harter Konsonant. Klingt nach einem Namen, nicht nach einem Tool. | Marke wirkt wie eine Person/ein Begleiter, ohne vermenschlicht zu werden.                                                                               |

**Risiko, das wir kennen:** „Moni“ ist im Deutschen ein Kosename (Monika). Das ø und die Kleinschreibung unterscheiden die Marke; wir machen daraus keinen Witz („Moni zählt Kalorien“) und sprechen die App nie als „sie“ an.

### 1.2 Aussprache

- **Deutsch:** _MÖ-ni_, Betonung auf der ersten Silbe, langes ö wie in „schön“. [ˈmøːni]
- **Englisch:** _MUR-nee_ (so nah an „ö“, wie es einem englischen Mund leichtfällt; ein weiches „muh-nee“ ist ebenso ok). Wir korrigieren niemanden. Im Store-Text steht optional „møni (sprich: MÖ-ni)“.
- Nicht: „Moni“ (o-Laut), „Mooni“, „Mon-i“.

### 1.3 Schreibweise-Regeln (verbindlich)

1. **Immer klein: `møni`**, auch am Satzanfang. („møni schätzt …“, nicht „Møni schätzt …“.) Der Name ist ein Wort, das sich nicht groß macht.
2. **Nie** `MØNI` in Fließtext oder UI-Texten. Versalien sind nur im Wordmark-Lockup erlaubt, falls das Visual-Team es will (dann als gezeichnetes Logo, nicht als getippter Text).
3. **ASCII-Fallback `moeni`** (so heißt auch das Repo und die URL). Nie „moni“ und nie „mni“ (das passiert intern im Xcode-Projektnamen, ist aber ein Bug, kein Markenname).
4. Das **ø steht nur im Markennamen**. Wir machen keine ø-Gags in anderen Wörtern („Trænings-Tracker“, „gøød“). Das wäre Skandinavien-Kostüm und beschädigt die Glaubwürdigkeit.
5. Genitiv/Kompositum: „in møni“, „møni-Konto“, „dein møni-Tag“. Kein „mønis“ mit Apostroph-Akrobatik; umschreiben („der Plan in møni“).
6. App-Store-Name: `møni – Essen & Training`; Keywords enthalten `moeni` und `moni` als Suchbegriffe (unsichtbar).
7. Tastatur-Hinweis für Support-Texte: ø = Alt+O (macOS), `AltGr+O` o. Ä.; nicht in die UI schreiben.

### 1.4 Das ø als Gestaltungselement

Das ø ist ein Kreis mit einer Diagonalen, also **genau der Kalorienring, durch den die Wasserlinie läuft.** Das ist kein Zufall, den wir erst zurechtbiegen müssen; so ist die Hauptgrafik der App ohnehin aufgebaut.

- **Der Kreis** = der Tagesring (Pegel). **Der Strich** = die Wasserlinie / der Horizont / „bis hierhin steht das Wasser“.
- **Der Strich als Trenner:** Er kann in der UI als wiederkehrendes Schnittmotiv dienen (z. B. Karten, Fortschritt, Section-Trenner), immer im selben Winkel wie im Logo.
- **Die Insel:** Der Mittelpunkt des Rings ist der ruhige Teil. Dort stehen die Zahl und ein Wort. Nichts Lautes im Zentrum.
- Das Zeichen darf gedreht und als Maske für Bild/Verlauf verwendet werden, **aber der Strich bleibt diagonal von unten links nach oben rechts** wie im Buchstaben (Erkennbarkeit).
- Das ø nie als Ersatz für ein „o“ in Headlines nutzen. Nur der Name trägt es.

---

## 2. Die Brand-Idee: **Gezeiten** (EN: _Tides_)

### 2.1 Leitmotiv

> **Dein Tag hat einen Pegel. Essen füllt ihn, Training hebt ihn, und er geht immer wieder zurück.**
> EN: _Your day has a water level. Food fills it, training raises it, and it always comes back down._

Kurzformel für alle Disziplinen: **Gezeiten statt Grenzen.** Ein Rhythmus aus Steigen und Sinken, nie ein Käfig mit Zaun.

### 2.2 Warum das trägt (Produkt-Mapping, 1:1)

| Produktfakt                                           | Gezeiten-Bild                                                                                                                                       |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tageslimit = Basis + Workout-Bonus (PLAN §6.4)        | Pegel steigt mit der Flut. Ein Workout hebt den Wasserstand, und zwar _wirklich_ (nur tatsächlicher Verbrauch × Eat-back, keine Vorab-Versprechen). |
| Limit wird nicht „bestanden“, er passt sich an        | Ebbe und Flut sind kein Scheitern/Gewinn, sie sind Rhythmus.                                                                                        |
| Adaptiver TDEE lernt aus deinem Gewichtstrend (§6.7)  | Man misst Gezeiten über Wochen und mittelt (Trendlinie = geglättete Wellen). Genau wie die EMA glättet.                                             |
| Schätzungen mit Unsicherheit (Confidence, editierbar) | Pegelstände sind gemessen, nicht exakt, daher „etwa“. Seeleute rechnen mit Toleranzen.                                                              |
| Über dem Limit gegessen                               | Eine **Springflut**: ein Tag, an dem das Wasser höher steht als üblich. Natürlich, selten, kein Drama.                                              |
| Wochenrückblick                                       | **Gezeitentafel**: die Tabelle, die Hafenmeister und Küstenwanderer lesen, um zu planen.                                                            |
| Ruhetag                                               | Ebbe, sie gehört zur Mechanik und ist kein „Aus“.                                                                                                   |
| Streak ohne Strafe                                    | Gezeiten kehren zurück. Unterbrechung ist Teil des Rhythmus.                                                                                        |
| Das ø                                                 | Kreis (Mond/Ring) + Wasserlinie. Und ø = Insel.                                                                                                     |

### 2.3 Wie das Motiv durch die Disziplinen läuft

- **Farbe:** Meerglas bis Tiefsee-Nacht; Licht über Wasser. Nicht Tropenblau, nicht Wellness-Pastell. (Details Visual, Abschnitt 9.)
- **Form:** Waagerechte Ruhe, eine Linie (Wasserlinie), Kreis, weiche Kanten; Flächen, die sich _füllen_.
- **Motion:** Steigen und Setzen. Füllungen kommen langsam hoch und kommen zur Ruhe. Nichts springt, nichts feuert Konfetti.
- **Copy:** Ruhig, präzise, leicht trocken. Wörter wie Pegel, Flut, Ebbe, Kurs, Rhythmus _sparsam_ und nur dort, wo sie etwas erklären. Keine Seemanns-Parodie („Ahoi, Käpt’n!“, „Leinen los!“).
- **Haptik:** weiches, rundes „Anschwellen“ statt hartem Klick bei großen Momenten (Abschnitt 9).

### 2.4 Verworfene Alternativen (und warum)

1. **Feuer / Verbrennen / Schmiede** („Kalorien verbrennen“, „Fuel“): Naheliegend für Fitness, aber _Diätkultur-Vokabular_. „Burn“ impliziert Sühne für Essen. Außerdem von jeder zweiten Fitness-App besetzt. Verworfen aus Haltung und Differenzierung.
2. **Berg / Gipfel / Aufstieg:** Starke Bilder, aber binär (Gipfel erreicht – ja/nein), baut Leistungsdruck und Verlustangst auf. Passt zu Strava, nicht zu einem Tool, das mit Schätzungen und Alltag lebt.
3. **Garten / Wachstum / Jahreszeiten:** Sanft und stimmig zu „kein Shaming“, aber Wellness-Klischee (jede Meditations-App), und es bildet _den Rhythmus von Essen+Training an einem Tag_ nicht ab. Wachsen ist langsam; unser Kern ist der tägliche Ausgleich.
4. **Waage / Balance / Gleichgewicht:** Das passt zur Rechenlogik, aber die **Waage ist ein Urteilsgerät** (schwer/zu schwer). Ein Wort, das beim Wiegen Angst auslöst, darf die Marke nicht tragen.
5. **Atem** (Einatmen/Ausatmen): Schönes Bild für Ruhe, aber zu körperlich-medizinisch und mit Meditation besetzt; trägt keine Zahlenwelt.

Gezeiten gewinnt, weil es als einziges Bild gleichzeitig (a) **rechnet** (Pegel, Messwerte, Tabellen), (b) **ent-moralisiert** (Naturkraft statt Verdienst/Schuld), (c) **grafisch trägt** (Ring/Füllung/Wasserlinie = vorhandene UI) und (d) im Namen steckt (ø, Insel, måne).

### 2.5 Wo Gezeiten _nicht_ hinsollen (Grenzen des Motivs)

- Keine Wassertropfen, Wellen-Clipart, Delfine, Surfer, Muscheln als Deko.
- Keine Wasser-Metaphern in medizinisch/sensiblen Texten (Disclaimer, Fehler, Kontolöschung). Dort: klar und sachlich.
- Nicht jedes Feature braucht ein Meer-Wort. **Faustregel: höchstens ein Gezeiten-Begriff pro Screen.**

---

## 3. Positionierung

### 3.1 Positionierungsaussage

> **Für Menschen, die trainieren und verstehen wollen, was ihr Essen mit ihrem Training zu tun hat: møni ist die App, die beides in einer einzigen Zahl zusammenführt – deinem Tagespegel.** Anders als reine Kalorienzähler _wächst_ der Pegel mit deinem echten Training; anders als reine Trainings-Logs sieht møni, was du isst; und beides ruhig, ohne Schuldgefühle.

**Tagline-Vorschlag (Primär):** DE **„Dein Tag hat Gezeiten.“** · EN **„Your day has tides.“**
Sekundär: DE „Training hebt den Pegel.“ · EN „Training lifts the level.“ · DE „Essen und Training, im selben Takt.“ · EN „Food and training, in the same rhythm.“
(Primär bevorzugt: kurz, merkwürdig genug, erklärt sich im Onboarding in zwei Sätzen.)

### 3.2 Zielgruppe

**Primär: „Die Ernsthaft-Trainierenden mit normalem Leben“** (ca. 22–40): 2–5× Training pro Woche (Kraft, Laufen, Sport), schon mal Kalorien gezählt und genervt davon, weil es alles durch ein starres Ziel presst. Sie wollen _verstehen_: „Warum bin ich am Trainingstag so hungrig? Warum stagniert mein Gewicht?“ Sie haben bereits eine Training-App oder Apple Watch.
**Sekundär:** Einsteiger:innen, die mit Training anfangen und Ernährung nicht als Diät, sondern als Treibstoff-Frage sehen.
**Ausdrücklich nicht:** Wettkampf-Bodybuilding mit Peak-Week-Protokollen; Menschen mit aktiver Essstörung (die App behandelt das im Onboarding mit einem Hinweis und Mindestwerten, die Marke bietet **keine** Diät-Härte an); reine Gewichtsverlust-Crash-Zielgruppe.

**Jobs-to-be-done**

1. „Sag mir, wie viel ich _heute_ essen kann, gegeben mein Training.“ (ein Wert, keine Rechnerei)
2. „Mach das Loggen so leicht, dass ich es wirklich tue.“ (Foto/Text/Barcode)
3. „Zeig mir, ob es funktioniert.“ (Trend, nicht Tageszahl)
4. „Sei nicht streng mit mir, wenn ein Tag anders läuft.“

### 3.3 Differenzierung

| Wettbewerber               | Was sie sind                                                                                                                                       | Wo møni anders ist                                                                                                                                                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **MyFitnessPal**           | Riesige Lebensmitteldatenbank; Kalorien-Ledger mit roten Zahlen, Ads, Paywall-Upsells; Training als Nebenschauplatz („Exercise calories“ addieren) | møni ist **kein Ledger, sondern ein Pegel**. Training ist nicht nachträglich addiert, sondern Teil des Tageswerts (und nur _echte_, importierte oder gemessene Daten zählen, mit Eat-back-Faktor). Kein Rot für „drüber“. Kein Werbe-Lärm. |
| **Yazio**                  | Diät-/Abnehm-Programm mit Rezepten, Plänen, Fasten, „Fortschritt = Abnehmen“                                                                       | møni verspricht **kein Programm**, sondern Verständnis. Kein Ziel-Gewicht-Dogma als einziger Maßstab; Ziele sind Pegel-Anpassungen. Kein Fasten-Kult.                                                                                      |
| **Strong** (und Hevy)      | Präzises Kraft-Logbuch: Sätze, Gewichte, Plates. Kalt, funktional, ohne Essen                                                                      | møni loggt Training ebenso ernst, aber **verbindet es mit dem Teller**. Weniger Werkzeug-Härte, mehr Begleiter.                                                                                                                            |
| **Gentler Streak**         | Sanfte Aktivitäts-App („Training ohne Druck“) mit Pacing und niedlichem Charakter; fokussiert Bewegung & Erholung, kein Essen                      | **Nächster Verwandter im Ton** (freundlich, ohne Druck). møni ist erwachsener-ruhiger (nordisch-trocken statt verspielt) und hat die Ernährungsseite. Kein Maskottchen.                                                                    |
| **Apple Fitness / Health** | Ringe (Move/Exercise/Stand), geschlossene Ringe als Verpflichtung; kein Essen, ein Ring als Streak-Druck                                           | møni übernimmt die Apple-Nativität (Liquid Glass, Health-Import), nimmt aber den **Zwang** raus: Der Ring ist ein Pegel, den man _liest_, kein Ziel, das man _schließt_.                                                                   |

**Das eine Alleinstellungsmerkmal, auf das alles einzahlt:** _Ein Pegel für Essen + Training, der sich an echtes Training und echten Gewichtstrend anpasst – erklärt in einem ruhigen Ton._ Alles andere (KI-Foto, Barcode, Insights) ist Mittel, nicht Versprechen.

**Markenwahrheit, die wir nicht überdehnen dürfen:** Die Kalorienangaben sind **Schätzungen**. Die Marke sagt das offen („etwa“, „Schätzung“) und macht es zur Stärke: Wer ehrlich über Unsicherheit ist, dem glaubt man den Rest.

---

## 4. Persönlichkeit

**Archetyp: Der Lotse** (Sage + Caregiver). Weiß, wo das Wasser steht, sagt es ruhig, übernimmt nie das Ruder. Keine Coach-Pose („Du schaffst das!“), kein Kumpel-Gebrüll, kein Arzt.

| Attribut                | møni ist …                                                                                       | møni ist **nicht** …                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| **1. Gelassen**         | ruhig, auch bei „schlechten“ Zahlen; kurze Sätze; Pausen.                                        | hektisch, alarmierend, ausrufezeichen-lastig, „Achtung!“                                                 |
| **2. Klar**             | konkret, Zahl zuerst, ein Gedanke pro Satz, sagt, was als Nächstes passiert.                     | vage, beschönigend, verschachtelt, Fachjargon (TDEE, EMA, RPE). Der bleibt in `src/domain`.              |
| **3. Warm-trocken**     | freundlich mit leichtem, nordisch-trockenem Humor (selten, nie auf Kosten des Users).            | überschwänglich, kumpelhaft („Bro“, „Beast“), niedlich-kindisch, Insider-Witze.                          |
| **4. Ehrlich**          | sagt „etwa“, „Schätzung“, „zu wenig Daten“; gibt Fehler zu; erklärt, warum die App etwas ändert. | allwissend, orakelhaft, Scheingenauigkeit (2 Nachkommastellen), Dark Patterns.                           |
| **5. Körperfreundlich** | spricht über Körper als etwas, dem man zuhört (Hunger, Energie, Erholung). Respektiert Pausen.   | körperfixiert (Spiegel, Bauch, „Beach Body“), moralisch (gut/schlecht, sündigen, clean), Leistungsdruck. |

**Emotionale Kernstimmung beim Öffnen der App:** _„Ich weiß, wo ich stehe. Es ist okay.“_ (Nicht: „Ich muss noch …“.)

---

## 5. Voice & Tone

### 5.1 Prinzipien

1. **Zahl vor Adjektiv.** „1.840 von 2.150 kcal“ sagt mehr als „Super Tag!“. Lob entsteht aus Fakten.
2. **Beschreiben, nicht bewerten.** Wir sagen, was _ist_; die Person entscheidet, was es bedeutet. „Du liegst 120 kcal über deinem Pegel“ statt „Zu viel!“ oder „Leider“.
3. **Du, nie wir (außer „wir schätzen“ bei Berechnungen).** Dazu: møni schreibt in der 3. Person über sich nur selten; wenn eine Handlung der App erklärt wird, dann „møni rechnet …“ oder passiv/neutral („Dein Pegel wurde angepasst“).
4. **Ein Satz, dann Aktion.** Maximal zwei Sätze pro Meldung. Buttons nennen die Handlung („Eintragen“, nicht „OK“).
5. **Die Marke erklärt ihre Eingriffe.** Wenn der Pegel sich ändert, steht dort _warum_. Keine Magie.
6. **Kein Shaming, kein Diät-Kult.** Keine Wörter, die Essen moralisch aufladen oder Körper bewerten (Liste unten). Keine „Cheat Meals“, kein „verdient“, kein „abtrainieren“.
7. **Humor ist Würze, keine Mahlzeit.** Höchstens eine trockene Zeile an Orten mit niedrigem Risiko (Empty States, Ladetexte, Erfolg) – nie bei Fehlern, Gesundheit, Gewicht, Limits.
8. **Emojis: keine im UI.** Ersetzt durch SF Symbols. Ausnahme: reale Lebensmittel-Emojis aus Nutzerdaten/Mahlzeitnamen. Ausrufezeichen: höchstens eins pro Screen, bevorzugt keines.
9. **Zahlen- und Einheitenformat:** Tausenderpunkt (DE) / Komma (EN), kein „kcal“ in Versalien, Leerzeichen vor der Einheit („2.150 kcal“, „142 g“), Dezimal je Locale. Wochentage ausgeschrieben („Dienstag“). Uhrzeit 24 h (DE) / 12 h (EN, locale).

### 5.2 Wort-Liste

**Nutze**

| DE                                  | EN                             |
| ----------------------------------- | ------------------------------ |
| Pegel, Tagespegel                   | level, daily level             |
| Flut (Workout-Plus), Ebbe (Ruhetag) | swell, ease/low tide (sparsam) |
| Rhythmus                            | rhythm                         |
| etwa, ungefähr, Schätzung           | about, roughly, estimate       |
| eintragen, festhalten               | log, note down                 |
| Mahlzeit, Teller, Essen             | meal, plate, food              |
| Training, Einheit, Workout          | training, session, workout     |
| Kurs, nachjustieren                 | course, adjust                 |
| Trend, Verlauf                      | trend, history                 |
| Raum / noch Platz                   | room / room left               |
| Energie, Hunger, Erholung           | energy, hunger, recovery       |
| passt, steht, liegt bei             | holds, stands, sits at         |

**Vermeide**

| DE                                                                    | EN                                       | Warum                                               |
| --------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------- |
| sündigen, Sünde, Kalorienbombe, Cheat Meal/Day                        | sin, cheat, guilty, bomb                 | moralisiert Essen                                   |
| verbrennen, abtrainieren, wegmachen, loswerden                        | burn off, work off, melt                 | Strafe/Sühne-Logik                                  |
| erlaubt/verboten, gut/schlecht (für Lebensmittel), clean, ungesund    | allowed/forbidden, good/bad foods, clean | Diätkult                                            |
| verdient, belohnen (Essen als Lohn fürs Training)                     | earn, deserve                            | Training ≠ Essens-Konto (wir sagen: Pegel _wächst_) |
| Versagen, gescheitert, Rückfall, Disziplin, durchhalten, Willenskraft | fail, relapse, discipline, willpower     | Scham                                               |
| Problemzone, Speck, Bauchfett, Traumfigur, Beach Body                 | problem areas, flab, dream body          | Körperabwertung                                     |
| Limit überschritten, Warnung, Achtung, Alarm (für Essen)              | exceeded, warning, alert                 | Alarmton                                            |
| Hardcore, Beast, Grind, No excuses, Gains                             | –                                        | Gym-Bro-Ton                                         |
| Fachjargon im UI: TDEE, EMA, RPE, 1RM (erklären statt zeigen)         | –                                        | kein Rechenwerkzeug-Gefühl                          |
| „Gesund“ als Gütesiegel                                               | –                                        | Gesundheitsversprechen und Bewertung                |

### 5.3 Tonalität je Situation

| Situation                                           | Haltung                                                                                                           | Länge                       | Beispiel (DE / EN)                                                                                                  |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Erfolg** (Workout fertig, Woche gehalten)         | ruhig zufrieden, Fakten, kein Konfetti-Ton.                                                                       | 1 Satz + Zahl               | „Einheit gespeichert. Dein Pegel steigt um 310 kcal.“ / “Session saved. Your level rises by 310 kcal.”              |
| **Rückschlag** (Tage nicht geloggt, Gewicht steigt) | nüchtern-freundlich, normalisieren, Weg zurück zeigen.                                                            | 1–2 Sätze                   | „Ein paar Tage Pause sind ok. Trag einfach ein, was du weißt.“ / “A few quiet days are fine. Log what you know.”    |
| **Über dem Pegel gegessen**                         | neutral beschreibend, ohne Moral, ohne Rot, nur wenn gefragt Tipp.                                                | 1 Satz                      | „Heute etwas über deinem Pegel. Morgen startet frisch.“ / “A little above your level today. Tomorrow starts fresh.” |
| **Fehler** (Netz, KI, Speichern)                    | klar sagen, was passiert ist, was _nicht_ verloren ist, was man tun kann. Keine Entschuldigungsflut, kein Witz.   | 2 Sätze                     | „Die Analyse hat nicht geklappt. Dein Foto ist noch da, versuch es erneut.“                                         |
| **Leerer Zustand**                                  | einladend, konkret, minimal trocken. Eine Handlung.                                                               | 1–2 Sätze                   | „Noch nichts auf dem Teller. Foto, Text oder Barcode: such dir was aus.“                                            |
| **Onboarding**                                      | Respekt vor der Intimität der Fragen (Gewicht, Alter): sagt, _wofür_ wir etwas brauchen und was _nicht_ passiert. | 1 Satz Titel + 1 Satz Grund | „Wie viel wiegst du? Wir rechnen damit deinen Grundumsatz. Mehr nicht.“                                             |
| **Limits/Mindestwerte**                             | sachlich und fürsorglich, klare Begründung; kein Drama.                                                           | 2 Sätze                     | „Dein Ziel liegt bei 1.500 kcal – darunter geht møni nicht. Das ist unsere Untergrenze, nicht deine Schwäche.“      |
| **Paywall/KI-Limit**                                | ehrlich, ohne Druck; sagt, was kostenlos bleibt.                                                                  | 2 Sätze                     | „Drei Analysen pro Tag sind kostenlos. Beschreiben und Barcode gehen immer weiter.“                                 |

---

## 6. Microcopy-Katalog (DE + EN)

Konvention: **Begriffe aus Abschnitt 7 sind bereits eingesetzt** (Pegel, Flut, Rhythmus, Gezeitentafel …). Das ist der Zielzustand; Einführung per Onboarding-Erklärung (siehe 7.2).
Platzhalter in `{{ }}` wie in den bestehenden i18n-Dateien.

### 6.1 Begrüßung nach Tageszeit (Today-Header, eine Zeile, ohne Emoji)

| #   | Kontext                               | DE                                                                                       | EN                                                 |
| --- | ------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1   | 05–10 Uhr                             | Guten Morgen, {{name}}.                                                                  | Morning, {{name}}.                                 |
| 2   | 10–14 Uhr                             | Mahlzeit, {{name}}. (nur DE; „Mahlzeit“ als Mittagsgruß ist regional – deshalb optional) | Hello, {{name}}.                                   |
| 3   | 14–18 Uhr                             | Schönen Nachmittag, {{name}}.                                                            | Good afternoon, {{name}}.                          |
| 4   | 18–23 Uhr                             | Guten Abend, {{name}}.                                                                   | Evening, {{name}}.                                 |
| 5   | 23–05 Uhr                             | Noch wach, {{name}}? Der Tag ist gleich durch.                                           | Still up, {{name}}? The day is nearly done.        |
| 6   | Erster Start des Tages, Pegel gesetzt | Dein Pegel heute: {{kcal}} kcal.                                                         | Your level today: {{kcal}} kcal.                   |
| 7   | Trainingstag-Morgen (geplant)         | Trainingstag. Die Flut kommt, wenn du dich bewegt hast.                                  | Training day. The swell arrives once you’ve moved. |

### 6.2 Ring-Zustände (Today)

| #   | Zustand                              | DE                                                                                             | EN                                                                                   |
| --- | ------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 8   | unter dem Pegel (viel Platz)         | Noch {{kcal}} kcal Platz                                                                       | {{kcal}} kcal of room left                                                           |
| 9   | nahe dran (≤ 10 %)                   | Fast auf Pegel. Noch {{kcal}} kcal.                                                            | Nearly at level. {{kcal}} kcal to go.                                                |
| 10  | genau auf Pegel (±3 %)               | Auf Pegel.                                                                                     | Right on level.                                                                      |
| 11  | über dem Pegel                       | {{kcal}} kcal über dem Pegel                                                                   | {{kcal}} kcal above your level                                                       |
| 12  | deutlich drüber (Springflut, > 25 %) | Springflut heute: {{kcal}} kcal über Pegel. Das kommt vor.                                     | Spring tide today: {{kcal}} kcal above level. It happens.                            |
| 13  | Bonus-Zeile                          | inkl. {{kcal}} kcal Flut vom Training                                                          | incl. {{kcal}} kcal swell from training                                              |
| 14  | Pegel-Erklärung (Info)               | Dein Tagespegel ist, wie viel du heute essen kannst, damit dein Ziel passt. Training hebt ihn. | Your daily level is how much you can eat today to stay on course. Training lifts it. |

### 6.3 Empty States

| #   | Ort                             | DE                                                                                     | EN                                                                                |
| --- | ------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 15  | Heute, keine Mahlzeit           | Noch nichts auf dem Teller. Foto, Text oder Barcode: such dir was aus.                 | Nothing on the plate yet. Photo, text or barcode: take your pick.                 |
| 16  | Training, keine Routinen        | Noch keine Routine. Starte ein Workout, die erste ergibt sich daraus.                  | No routines yet. Start a workout and your first one follows.                      |
| 17  | Insights, wenig Daten           | Zu wenig Daten für einen Trend. Nach etwa einer Woche wird es lesbar.                  | Not enough data for a trend yet. About a week in, it becomes readable.            |
| 18  | Gewicht, keine Einträge         | Noch kein Gewicht eingetragen. Zwei-, dreimal pro Woche reicht, møni glättet den Rest. | No weight logged yet. Two or three times a week is plenty; møni smooths the rest. |
| 19  | Favoriten leer                  | Deine Stammgerichte erscheinen hier, sobald du eine Mahlzeit mit dem Stern markierst.  | Your regulars show up here once you star a meal.                                  |
| 20  | Gezeitentafel, Woche nicht voll | Diese Woche ist noch nicht vorbei. Die Tafel füllt sich Tag für Tag.                   | This week isn’t over. The table fills in day by day.                              |

### 6.4 Ladetexte der KI-Analyse (rotierend, max. ein Satz, ohne Emoji)

| #   | Phase          | DE                                                    | EN                                             |
| --- | -------------- | ----------------------------------------------------- | ---------------------------------------------- |
| 21  | Start Foto     | Schaut sich deinen Teller an …                        | Looking at your plate …                        |
| 22  | Zutaten        | Erkennt Zutaten …                                     | Picking out ingredients …                      |
| 23  | Mengen         | Schätzt Mengen …                                      | Estimating portions …                          |
| 24  | Rechnen        | Rechnet Kalorien und Makros …                         | Working out calories and macros …              |
| 25  | Text           | Liest deine Beschreibung …                            | Reading your description …                     |
| 26  | Barcode        | Sucht das Produkt …                                   | Looking up the product …                       |
| 27  | Geduld (> 8 s) | Dauert einen Moment länger als sonst.                 | Taking a little longer than usual.             |
| 28  | Fertig         | Fertig. Schau drüber, ob die Mengen passen.           | Done. Check that the portions look right.      |
| 29  | Unsicherheit   | Das ist eine Schätzung, die Gramm kannst du anpassen. | This is an estimate; you can adjust the grams. |

### 6.5 Fehlermeldungen

| #   | Fall                      | DE                                                                                             | EN                                                                                  |
| --- | ------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 30  | KI-Analyse fehlgeschlagen | Die Analyse hat nicht geklappt. Dein Foto ist noch da: erneut versuchen oder selbst eintragen. | The analysis didn’t work. Your photo is still here: try again or enter it yourself. |
| 31  | Offline                   | Kein Netz. Dein Eintrag wird gespeichert, sobald du wieder verbunden bist.                     | No connection. Your entry will be saved once you’re back online.                    |
| 32  | Speichern fehlgeschlagen  | Das Speichern hat nicht geklappt. Nichts ist verloren, versuch es gleich nochmal.              | Saving didn’t work. Nothing is lost; try again in a moment.                         |
| 33  | Barcode nicht gefunden    | Dieses Produkt kennen wir noch nicht. Scanne die Nährwerttabelle oder trag es selbst ein.      | We don’t know this product yet. Scan the nutrition label or enter it yourself.      |
| 34  | Kamera-Zugriff            | Für das Foto braucht møni die Kamera. Du kannst sie in den Einstellungen erlauben.             | møni needs the camera for photos. You can allow it in Settings.                     |
| 35  | Ungewöhnliches Gewicht    | Das klingt ungewöhnlich. Schau noch einmal auf die Zahl.                                       | That looks unusual. Take another look at the number.                                |
| 36  | Anmeldung fehlgeschlagen  | Die Anmeldung hat nicht geklappt. Prüfe E-Mail und Passwort.                                   | Sign-in didn’t work. Check your email and password.                                 |

### 6.6 Notification-Texte (Mahlzeit-Erinnerungen; kein Emoji, kein Druck, nie Zahlen zum Körper)

| #   | Anlass                       | Titel DE / EN                                      | Text DE / EN                                                                                                                                      |
| --- | ---------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 37  | Frühstück 09:00              | Guter Start / Easy start                           | Ein Foto vom Frühstück reicht. møni rechnet den Rest. / A photo of breakfast is enough. møni does the rest.                                       |
| 38  | Mittag 13:00                 | Mittagspause? / Lunch break?                       | Halt kurz fest, was auf dem Teller liegt. / Take a second to note what’s on the plate.                                                            |
| 39  | Abend 19:30                  | Wie war der Tag? / How was the day?                | Trag dein Abendessen ein, dann steht dein Pegel. / Log dinner and your level is set.                                                              |
| 40  | Nach Workout (Health-Import) | Einheit erkannt / Session picked up                | {{kcal}} kcal aus Apple Health. Dein Pegel ist um {{bonus}} kcal gestiegen. / {{kcal}} kcal from Apple Health. Your level rose by {{bonus}} kcal. |
| 41  | Tage ohne Eintrag (3 Tage)   | Alles ok bei dir? / All good?                      | Wenn du magst: ein Eintrag reicht, um wieder drin zu sein. / If you like: one entry is enough to get back in.                                     |
| 42  | Wochenrückblick (Sonntag)    | Deine Gezeitentafel ist da / Your tide table is in | Sieh, wie die Woche lief. Keine Note, nur Muster. / See how the week went. No grade, just patterns.                                               |

### 6.7 Button-Labels

| #   | Ort                       | DE                       | EN                        |
| --- | ------------------------- | ------------------------ | ------------------------- |
| 43  | Primär Today              | Mahlzeit eintragen       | Log a meal                |
| 44  | Workout starten           | Einheit starten          | Start session             |
| 45  | Workout beenden           | Einheit beenden          | Finish session            |
| 46  | Review speichern          | Speichern                | Save                      |
| 47  | Favorit                   | Als Stammgericht merken  | Save as a regular         |
| 48  | Wiederholen               | Wie gestern              | Same as yesterday         |
| 49  | Retry                     | Nochmal versuchen        | Try again                 |
| 50  | Skip                      | Später                   | Later                     |
| 51  | Weiter ohne Konto-Anlegen | Ich habe schon ein Konto | I already have an account |
| 52  | Onboarding-Start          | Los                      | Begin                     |

### 6.8 Streak / Rhythmus / Meilensteine

| #   | Fall                                 | DE                                                            | EN                                                      |
| --- | ------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------- |
| 53  | Rhythmus-Zähler                      | {{n}} Tage im Rhythmus                                        | {{n}} days in rhythm                                    |
| 54  | Pause (kein Reset auf 0)             | Rhythmus pausiert. Er geht dort weiter, wo du aufgehört hast. | Rhythm paused. It picks up where you left off.          |
| 55  | 7 Tage                               | Eine Woche in Folge. So sieht ein Rhythmus aus.               | A full week. This is what rhythm looks like.            |
| 56  | 30 Tage                              | 30 Tage eingetragen. Jetzt sagt dein Trend etwas aus.         | 30 days logged. Now your trend actually says something. |
| 57  | Hochwassermarke (Rekord im Training) | Neue Hochwassermarke: {{exercise}} {{value}}.                 | New high-water mark: {{exercise}} {{value}}.            |
| 58  | Erstes Gewicht eingetragen           | Erster Messpunkt. Ab hier gibt es einen Trend.                | First data point. From here on there’s a trend.         |

### 6.9 Workout-Abschluss

| #   | Fall                       | DE                                                                         | EN                                                             |
| --- | -------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 59  | Abschluss Titel            | Einheit gespeichert                                                        | Session saved                                                  |
| 60  | Abschluss mit Bonus        | {{kcal}} kcal verbraucht, dein Pegel steigt um {{bonus}} kcal.             | {{kcal}} kcal used; your level rises by {{bonus}} kcal.        |
| 61  | Kraft, mit Protein-Hinweis | Gutes Zeitfenster für 30 bis 40 g Protein. Deine Stammgerichte sind unten. | A good window for 30 to 40 g protein. Your regulars are below. |
| 62  | Sehr kurz (< 10 min)       | Kurze Einheit, trotzdem gespeichert.                                       | A short one, saved all the same.                               |
| 63  | Gesamtvolumen              | {{sets}} Sätze · {{volume}} kg bewegt                                      | {{sets}} sets · {{volume}} kg moved                            |

### 6.10 Pegel-Anpassungen (Erklärung statt Magie)

| #   | Fall        | DE                                                                               | EN                                                                                 |
| --- | ----------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 64  | Adaptiv +   | Dein Verbrauch liegt höher als geschätzt. Dein Pegel steigt um {{kcal}} kcal.    | Your burn is higher than estimated. Your level rises by {{kcal}} kcal.             |
| 65  | Adaptiv −   | Dein Gewicht reagiert langsamer als erwartet. Dein Pegel sinkt um {{kcal}} kcal. | Your weight is responding slower than expected. Your level drops by {{kcal}} kcal. |
| 66  | Untergrenze | Hier ist die Untergrenze. Darunter geht møni nicht.                              | This is the floor. møni doesn’t go below it.                                       |

---

## 7. Benennung eigener Konzepte

### 7.1 Begriffe

| #   | Funktion in der App                | DE (Marke)                                           | EN (Marke)                                | Erklärung / Regel                                                                                           |
| --- | ---------------------------------- | ---------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | Tageslimit (Basis + Workout-Bonus) | **Tagespegel** (kurz: **Pegel**)                     | **Daily level** (kurz: **level**)         | Ersetzt „Limit“ überall. „Limit“ = Zaun, „Pegel“ = Stand. Immer mit Einheit gezeigt: „2.150 kcal“.          |
| 2   | Workout-Bonus (Eat-back)           | **Flut**                                             | **Swell**                                 | „+310 kcal Flut“. Nur echter Verbrauch × Eat-back. In Fließtext: „Flut vom Training“.                       |
| 3   | Basis ohne Bonus                   | **Grundpegel**                                       | **Base level**                            | Nur in Detail/Erklärung.                                                                                    |
| 4   | Ruhetag                            | **Ebbe** (kein Label im Primär-UI; „Ruhetag“ bleibt) | **Low tide** (sparsam; „Rest day“ bleibt) | Wort „Ebbe“ nur in Erklärtexten und im Wochenbild. Nie als Wertung.                                         |
| 5   | Über Pegel gegessen                | **Springflut**                                       | **Spring tide**                           | Nur ab deutlicher Abweichung (> 25 %) als warmes Wort; sonst „über dem Pegel“. Nie rot.                     |
| 6   | Streak                             | **Rhythmus**                                         | **Rhythm**                                | Tage mit mind. einem Eintrag _oder_ Training. Pause friert ein (siehe 6.8), setzt nicht auf null.           |
| 7   | Wochenrückblick                    | **Gezeitentafel**                                    | **Tide table**                            | Sonntag/Montag. Zeigt Pegel vs. gegessen, Training, Trend. Keine Note, keine Bewertung.                     |
| 8   | Persönlicher Rekord                | **Hochwassermarke**                                  | **High-water mark**                       | Für Übungs-Bestwerte (1RM-Schätzung, Wiederholungsrekord).                                                  |
| 9   | Adaptive TDEE-Anpassung            | **Kurskorrektur**                                    | **Course correction**                     | „Dein Pegel wurde nachjustiert.“ Immer mit Grund, immer mit ±-Wert.                                         |
| 10  | Favoriten                          | **Stammgerichte**                                    | **Regulars**                              | Stern-Symbol bleibt. „Wie gestern“ ist die Schnellaktion.                                                   |
| 11  | Gewichtstrend (EMA)                | **Trendlinie**                                       | **Trend line**                            | Rohwerte heißen **Messpunkte** / _data points_. Wasserschwankungen werden geglättet, das ist die Botschaft. |
| 12  | Food-Log / Tagebuch                | **Teller** (Today-Abschnitt)                         | **Plate**                                 | Section-Label statt „Ernährung“: „Teller“. Einzeleinträge heißen **Mahlzeiten**.                            |
| 13  | Training-Session                   | **Einheit**                                          | **Session**                               | Statt „Workout“ im Marken-Text; „Workout“ bleibt als Alltagswort im Fließtext zulässig.                     |

### 7.2 Einführungs-Regeln

- Beim ersten Kontakt (Onboarding-Ergebnis) wird **Tagespegel** in einem Satz erklärt und danach nicht mehr erklärt: „Dein Tagespegel ist deine Kalorienmenge für heute. Training hebt ihn, an Ruhetagen sinkt er.“ / “Your daily level is your calorie amount for today. Training lifts it; on rest days it eases.”
- „kcal“ steht **immer** daneben, damit niemand rätseln muss, was ein Pegel ist.
- **Maximal ein Gezeiten-Begriff pro Screen** (Faustregel aus 2.5). Auf Today reicht „Pegel“ und evtl. „Flut“.
- Fachbegriffe (Kalorien, Protein, Makros) bleiben normal. Wir ersetzen nicht, was jeder versteht.
- Settings-/Rechtstexte, Datenschutz, Lösch-Dialoge: **ohne** Markenbegriffe.

---

## 8. Do / Don’t und Selbsttest

### 8.1 Do

- Mit der Zahl beginnen, dann der Kontext.
- Ruhig formulieren: Punkt statt Ausrufezeichen.
- Unsicherheit benennen: „etwa“, „Schätzung“, „zu wenig Daten“.
- Immer einen nächsten Schritt anbieten (Button mit Verb), aber nie fordern.
- Eingriffe der App erklären (warum sich der Pegel ändert).
- Das ø nur im Namen verwenden, den Namen immer klein schreiben.
- Rückschläge normalisieren und den Weg zurück _klein_ machen („ein Eintrag reicht“).
- Eine Prise Trockenheit zulassen, wenn nichts auf dem Spiel steht.
- In beiden Sprachen _gleich gut_ schreiben (EN ist keine Übersetzungs-Notlösung).

### 8.2 Don’t

- Kein Emoji im UI, kein „🎉“, kein „💪“.
- Keine Moral über Essen („gut/schlecht“, „sündigen“, „verdient“).
- Kein Rot oder Alarm für „über Pegel“. Rot (`danger`) nur für echte Fehler/Löschen.
- Keine Körper-Vorher/Nachher-Rhetorik, keine Körperzonen, kein „Beach Body“.
- Keine Fachbegriffe (TDEE, EMA) im UI.
- Kein Wasser-Overkill („Ahoi“, Wellen-Wortspiele in jeder Zeile).
- Keine Verlustangst-Mechanik („Dein Rhythmus ist in Gefahr!“).
- Keine Scheingenauigkeit (Dezimalstellen bei kcal; Prognose-Datum ohne „etwa“).
- Nicht über den Disclaimer-Ernst scherzen. Nicht beim Fehler witzeln.
- Keine großgeschriebene Variante des Namens.

### 8.3 Selbsttest: „Klingt das nach møni?“

Jede Zeile muss mit **Ja** beantwortet werden können. Zwei „Nein“ = umschreiben.

1. **Zahl oder Fakt zuerst?** Steht etwas Konkretes drin, nicht nur eine Stimmung?
2. **Beschreibt es, statt zu bewerten?** Könnte jemand mit schlechtem Tag es lesen, ohne sich schlechter zu fühlen?
3. **Ruhig?** Kein Ausrufezeichen, kein Emoji, kein Alarmwort, keine Imperativ-Kette?
4. **Ehrlich?** Verspricht der Satz nicht mehr, als die Schätzung hergibt?
5. **Eigen?** Würde dieser Satz in MyFitnessPal oder Yazio genauso stehen? Wenn ja: umschreiben. (Austauschbare Sätze sind die Warnung.)
6. **Kurz?** Zwei Sätze oder weniger; Button mit Verb?
7. **Maß gehalten?** Höchstens ein Gezeiten-Begriff, kein Witz an einer ernsten Stelle?
8. **Laut vorgelesen** von einer ruhigen Freundin, die zufällig Trainerin ist. Klingt es natürlich?

**Mini-Beispiel**

- ❌ „Achtung! Du hast dein Kalorienlimit überschritten! 🚨“ → ✅ „Heute etwas über deinem Pegel. Morgen startet frisch.“
- ❌ „Super, du hast 450 kcal verbrannt! Das hast du dir verdient 🍕“ → ✅ „Einheit gespeichert. Dein Pegel steigt um 315 kcal.“
- ❌ „Oops! Da ist etwas schiefgelaufen 😅“ → ✅ „Das Speichern hat nicht geklappt. Nichts ist verloren, versuch es gleich nochmal.“

---

## 9. Leitplanken an die anderen Disziplinen

### 9.1 Visual Design

- Die Marke braucht ein **eigenes Farbfeld**, das nicht `systemMint` ist: Meerglas/Tiefsee-Nacht als Basis (Dark Mode ist die Hauptbühne: nächtliches Wasser, dazu Lichtkante), ein warmes Gegenlicht (Sonnenaufgang über dem Wasser) für die **Flut** (heute Orange `bonus`) – die Unterscheidbarkeit von Pegel und Flut im Ring bleibt Pflicht. Neutrale iOS-Semantic-Colors bleiben, `theme.config.js` bleibt Single Source.
- **Rot ist reserviert** (Fehler, Löschen). Der Zustand „über Pegel“ bekommt eine eigene Farbfamilie (warme Flutfarbe, kein Alarm).
- Typografie: eine charaktervolle, ruhige Schrift für Zahlen/Headlines mit gut gezeichnetem ø (Test: Wortmarke „møni“ und ø-Schnitt prüfen), tabellarische Ziffern für Pegelzahlen; Systemschrift für Fließtext ist ok. Große Zahlen = die Bühne der Marke.
- Der **Ring ist das Hauptmarkenbild**: er soll lesbar als Pegel (Füllstand mit Wasserlinie) wirken, ohne Wellen-Clipart. Native Liquid Glass bleibt Hard Rule #1; Marke sitzt in Inhalt, Farbe, Form, nicht in nachgebautem Glas.

### 9.2 Motion & Haptics

- Bewegung heißt **Steigen und Setzen**: Füllungen steigen langsam (600–900 ms, ease-out), setzen sich mit minimalem, gedämpftem Nachschwingen. Kein Springen, kein Konfetti, kein Shake. Reduced Motion respektieren (`ReduceMotion.System`, bereits Standard).
- Zahlen zählen hoch, wenn sie sich ändern (Pegelanstieg nach Workout sichtbar: die Flut „kommt rein“); sonst bleibt der Screen still. Stille ist Teil der Marke.
- Haptik: weich und rund. Kleine Aktionen: leichter Impuls. Große Momente (Einheit beendet, Pegel steigt): eine langsame „Anschwellen“-Abfolge (leise beginnend, kurze Spitze, Ausklingen) statt hartem Klick. **Warnhaptik wird nicht für „über Pegel“ eingesetzt.**
- Übergänge bevorzugen horizontale Bewegung (Wasserlinie) und Fade; vertikales Steigen nur für den Pegel selbst.

### 9.3 Illustration & Mark (Logo, Icon)

- Das **ø ist das Zeichen**: Kreis + diagonaler Strich (Wasserlinie). Zu klären: Strich-Winkel, Strichstärke, ob der Strich das Wasser teilt (obere Hälfte leer, untere gefüllt). Der Strich muss auf App-Icon-Größe (60 px) noch lesbar sein.
- Wortmarke `møni` in Kleinbuchstaben, großzügige Laufweite, ø deutlich als Buchstabe erkennbar (nicht zum Symbol überhöht). Icon = ø allein.
- Illustration (Onboarding, Empty States): reduzierte Linien- oder Flächenbilder aus Horizont, Insel (kleiner Kreis), Mond, Küstenlinie, Gezeitentafel-Linien. **Kein Maskottchen, keine Menschen-Körper-Illustrationen, keine Lebensmittel-Emoji-Optik.** Wenige Bilder, viel Leerraum.
- Die Bildsprache muss im Dark Mode funktionieren und im Siegel-Format (einfarbig) lesbar bleiben.

### 9.4 UX & Gamification

- **Kein Verlust-Mechanismus.** Rhythmus pausiert statt zu verfallen; keine Ranglisten, keine Streak-Freezes zum Kaufen, keine „Du verlierst …“-Meldungen. Belohnung = Einsicht (Trend, Gezeitentafel), nicht Abzeichen-Inflation.
- Meilensteine sind **leise Fakten** (Hochwassermarke, 7/30 Tage, erster Messpunkt), erscheinen einmal als Karte/Zeile, nie als Vollbild-Popup.
- „Über Pegel“ erzeugt keine Warnung, keinen Wettbewerbsdruck und kein Zusatz-Training als „Wiedergutmachung“. Die UI zeigt höchstens: Zahl, neutrale Zeile, optional „Morgen“.
- Sicherheits-Haltung ist Marke: Mindestwerte, Defizit-Deckel, Disclaimer und Support-Hinweis sind sichtbar und freundlich formuliert, kein Kleingedrucktes. Wo Gewicht eingegeben wird, immer Trend vor Tageswert zeigen.
- Mehr Fokus auf **Erklärbarkeit**: jede Zahl hat per Tap einen Satz „Warum?“ (z. B. „1.840 + 310 kcal Flut = 2.150“). Das ist unser Differenzierungsmoment gegenüber Kalorien-Ledgern.
- Onboarding als Gespräch: je Frage ein Satz, wozu sie dient. Kein Fortschritts-Bluff. Ergebnis-Screen: der erste Auftritt des Tagespegels (Ruhetag vs. Trainingstag) mit Erklärsatz aus 7.2.

---

## Anhang: Copy-Änderungen, die sofort passen (Backlog für den Copy-Pass, nicht Teil dieser Datei)

- `food.dashboard.kcalLeft/kcalOver` → „Platz“/„über dem Pegel“ (Abschnitt 6.2).
- `food.dashboard.includesBonus` → „inkl. {{kcal}} kcal Flut vom Training“.
- `food.dashboard.nutrition` → „Teller“ (Section), `overview` → entfällt oder „Heute“.
- `onboarding.name.greeting`, `result.title`: Emoji entfernen („{{name}}, dein Plan steht.“).
- `notifications.meal.*`: Emojis streichen, Titel neutralisieren (Abschnitt 6.6).
- `onboarding.welcome.title` behalten („Deine Kalorien, im Takt mit deinem Training“), ist Markenkern; ggf. um Tagline erweitern.
- Neue Keys immer in `de.json` **und** `en.json` (Hard Rule #2).
