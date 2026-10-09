# i18n keys referenced by the domain / ledger layer (B4)

Written for agent B5 (copy). The domain and `src/features/rhythm` never contain texts, only keys. One line per key: meaning / context. `<0|1|2>` = wording variant (rotates by day of year, so each sentence needs three phrasings). Terminology: streak = **Rhythmus**, weekly review = **Gezeitentafel**. Care rule: no copy may reward eating less; the care hint is calm and never diagnostic. Keys marked _(later)_ belong to features outside Release 1 and may be written after the rest.

CLAUDE.md note: `t()` keys are typed, no template literals. The code returns keys as strings; the UI maps them with literal `t('...')` calls (e.g. `Record<StageKey, string>`).

## Stages (`src/domain/stage.ts`)

- `rhythm.stage.warmup` - stage 1, 0 weeks (working title "Anlauf" / "Warm-up")
- `rhythm.stage.inTune` - stage 2, 3 rhythm weeks ("Einklang" / "In Tune")
- `rhythm.stage.inStep` - stage 3, 8 weeks ("Gleichschritt" / "In Step")
- `rhythm.stage.inSync` - stage 4, 16 weeks ("Eingespielt" / "In Sync")
- `rhythm.stage.metronome` - stage 5, 30 weeks ("Metronom" / "Metronome")
- `rhythm.stage.original` - stage 6, 52 weeks ("Original" / "The Original")

## Achievements (`src/domain/achievements.ts`)

Each stamp has three keys: `.name` (stamp title), `.body` (celebration sentence shown on unlock), `.hint` (how to earn it; for hidden stamps shown only after unlocking). Phase R1 = Release 1 start set (16), later = rest of the catalog. H = hidden. Rarity in brackets.

### training

- `achievements.firstWorkout.name|body|hint` - first completed workout [common, R1]
- `achievements.workouts10.name|body|hint` - 10 completed workouts [common, R1]
- `achievements.workouts50.name|body|hint` - 50 completed workouts [rare, later]
- `achievements.workouts100.name|body|hint` - 100 completed workouts [special, later]
- `achievements.firstPr.name|body|hint` - first personal record (est. 1RM beats an earlier week) [common, R1]
- `achievements.volume10t.name|body|hint` - 10,000 kg total lifted volume [rare, later]
- `achievements.plusTen.name|body|hint` - est. 1RM +10 % vs. first value (4+ weeks) [rare, later]
- `achievements.allRounder.name|body|hint` - strength and cardio/sport workout in the same week [common, R1]

### nutrition

- `achievements.firstMeal.name|body|hint` - first food entry [common, R1]
- `achievements.threeMeals.name|body|hint` - breakfast, lunch and dinner logged on one day [common, R1]
- `achievements.meals100.name|body|hint` - 100 food entries [common, later]
- `achievements.meals500.name|body|hint` - 500 food entries [rare, later]
- `achievements.wellFuelled.name|body|hint` - training day, 3+ entries, intake 90-115 % of the daily limit incl. bonus (two-sided, never a low-intake reward) [rare, R1]
- `achievements.proteinWeek.name|body|hint` - protein ring closed in a week [common, R1]
- `achievements.proteinStreak4.name|body|hint` - protein ring closed 4 weeks in a row [rare, later]
- `achievements.bridgeDay.name|body|hint` - 25 g+ protein within 3 h after a workout [common, later, H]

### consistency

- `achievements.firstRhythm.name|body|hint` - first completed rhythm week [common, R1]
- `achievements.rhythm4.name|body|hint` - rhythm of 4 weeks [common, R1]
- `achievements.rhythm12.name|body|hint` - rhythm of 12 weeks [special, later]
- `achievements.rhythm26.name|body|hint` - rhythm of 26 weeks [special, later]
- `achievements.fullWeek.name|body|hint` - all rings of a week closed [rare, R1]
- `achievements.fullWeek4.name|body|hint` - 4 full weeks in total [special, later]
- `achievements.comeback.name|body|hint` - rhythm week after 2+ weeks without rhythm [rare, R1]
- `achievements.goodPause.name|body|hint` - back within 3 days after a pause of 5+ days [common, later]
- `achievements.weekendKeeper.name|body|hint` - 4 weekends in a row, Saturday and Sunday kept [rare, later]
- `achievements.fullMonth.name|body|hint` - calendar month where every week with 4+ days in it is a rhythm week [special, later]

### body

- `achievements.firstWeigh.name|body|hint` - first weigh-in [common, R1]
- `achievements.trendReady.name|body|hint` - 8 weigh-in days within 28 days (trend available) [common, R1]
- `achievements.adaptiveOn.name|body|hint` - first adaptive TDEE estimate exists [rare, later]
- `achievements.bodyGoal2kg.name|body|hint` - 2 kg trend movement towards the goal (not into underweight; withheld by care signal) [rare, later]
- `achievements.strongAsYou.name|body|hint` - est. 1RM of an exercise >= body weight [rare, later]
- `achievements.goalReached.name|body|hint` - trend within 0.3 kg of a healthy target weight (withheld by care signal) [special, later]

### explorer

- `achievements.firstPhoto.name|body|hint` - first photo entry [common, R1]
- `achievements.firstVoice.name|body|hint` - first voice entry [common, later]
- `achievements.firstLabel.name|body|hint` - first label-scan entry [common, later]
- `achievements.scanner25.name|body|hint` - 25 barcode entries [common, later]
- `achievements.firstFavorite.name|body|hint` - first favorite meal [common, later]
- `achievements.ownExercise.name|body|hint` - first custom exercise [common, later]
- `achievements.healthLinked.name|body|hint` - Apple Health on and a workout imported [common, R1]
- `achievements.patternFound.name|body|hint` - first training/rest correlation hint available [rare, later]
- `achievements.reviews4.name|body|hint` - 4 weekly reviews viewed to the end [common, later]
- `achievements.sharedFirst.name|body|hint` - first share completed [common, later, H]
- `achievements.oneYear.name|body|hint` - account 365+ days old and 8+ kept days in the last 30 [special, later]

## Greeting and day sentence (`src/domain/rituals.ts`)

- `rituals.greeting.morning|midday|afternoon|evening|night` - greeting line per time slot (05-10, 10-14, 14-18, 18-22, 22-05); with and without name (if `display_name` is empty, no address)
- `rituals.daySentence.welcomeBack.<0|1|2>` - 3+ days away; warm, no numbers about missed days
- `rituals.daySentence.night.<0|1|2>` - night slot; very calm, no numbers, no prompt
- `rituals.daySentence.bridgeToFood.<0|1|2>` - workout done, protein under 60 %: bridge from training to the plate
- `rituals.daySentence.trainingGrewLimit.<0|1|2>` - workout done: "your limit grew" (number interpolated by the UI)
- `rituals.daySentence.trainingDay.<0|1|2>` - planned training day, no workout yet; invitation with the limit
- `rituals.daySentence.restDay.<0|1|2>` - planned rest day before evening: rest belongs to the plan
- `rituals.daySentence.balanced.<0|1|2>` - evening, intake 90-115 % of the limit (two-sided corridor; never praise "less")
- `rituals.daySentence.rhythmReached.<0|1|2>` - the second ring closed today: "this week the rhythm sits"
- `rituals.daySentence.monday.<0|1|2>` - Monday fresh start
- `rituals.daySentence.friday.<0|1|2>` - Friday "almost there"
- `rituals.daySentence.sunday.<0|1|2>` - Sunday "the review is waiting"
- `rituals.daySentence.default.<0|1|2>` - fallback: date plus name
- (no key for the care signal: the day sentence is intentionally absent)

## Next best step (`nextBestStep`)

- `rituals.nextStep.logWeight.title|cta` - weigh-in prompt (first weight, or Monday reminder)
- `rituals.nextStep.proteinBridge.title|cta` - after the workout: 30-40 g protein, opens quick log with favorites
- `rituals.nextStep.startWorkout.title|cta` - today is a training day, start the workout
- `rituals.nextStep.logMeal.breakfast.title|cta` - capture breakfast (morning slot)
- `rituals.nextStep.logMeal.lunch.title|cta` - capture lunch (midday slot)
- `rituals.nextStep.closeDay.title|cta` - evening: close the day
- `rituals.nextStep.weeklyReview.title|cta` - Sunday after 17:00: open the weekly review (Gezeitentafel)

## Welcome back (`welcomeBackKind`)

- `rituals.welcomeBack.short.title|body|cta` - 3-6 days away; relaxed; optional note that the rhythm is protected (grace)
- `rituals.welcomeBack.medium.title|body|cta` - 7-20 days; shows what was kept (stage, rhythm weeks), offers "mark as pause", never numbers about missed days
- `rituals.welcomeBack.long.title|body|cta` - 21+ days; restart: update weight, check goal, lower weekly goals

## Weekly review / Gezeitentafel (`src/domain/weeklyReview.ts`)

- `review.title.full|strength|recovery|restart|quiet` - week title (Volle Woche / Kraftwoche / Erholungswoche / Neustart-Woche / Ruhige Woche); a calm week is never called bad
- `review.quiet.paused` - single calm line for a paused week
- `review.quiet.noData` - single calm line for a week without data
- `review.card.intro.title` - story card 1: "Week N" plus the week title
- `review.card.week.title` - story card 2: the seven day glyphs plus counters (food days, training days, meals per logged day)
- `review.card.highlight.pr` - highlight: new personal record (exercise name and gain interpolated)
- `review.card.highlight.longestWorkout` - highlight: longest workout of the week (minutes)
- `review.card.highlight.bestProteinDay` - highlight: best protein day (grams)
- `review.card.highlight.earliestEntry` - highlight: earliest entry of the week (hour)
- `review.card.connection.title|body` - "the connection": protein on training vs. rest days
- `review.card.body.title|body` - body card: trend movement over the week (only with 4+ weigh-ins; neutral wording)
- `review.card.rhythm.title|body` - rhythm card: rhythm weeks, best, stage
- `review.card.rhythm.graceUsed` - note: a grace week protected the rhythm ("your rhythm stays at N")
- `review.card.outlook.title|body` - outlook: next week's goals
- `review.goalSuggestion.lower` - one-time offer to lower the training goal by one ("Does your plan still fit your life?")
- `review.goalSuggestion.raise` - one-time offer to raise the training goal by one

## Nudges (`src/domain/nudges.ts`)

Always passive; copy is invitation or opportunity, never loss framing. `payloadKey` = `nudges.<kind>`, variant 0-2.

- `nudges.eveningNote.<0|1|2>.title|body` - 20:30, fewer than two entries today: friendly "anything forgotten?"
- `nudges.proteinBridge.<0|1|2>.title|body` - 20-40 min after the workout: good moment for 30-40 g protein
- `nudges.sundayReview.<0|1|2>.title|body` - Sunday 18:00: "your review is here"
- `nudges.trainingMorning.<0|1|2>.title|body` _(later)_ - training-day morning invitation with the limit
- `nudges.weighIn.<0|1|2>.title|body` _(later)_ - weigh-in reminder; the trend counts, not the number
- `nudges.rhythmChance.<0|1|2>.title|body` _(later)_ - Thursday: "one more workout and this week is in rhythm" (opportunity wording only)
- `nudges.doorOpen.<0|1|2>.title|body` _(later)_ - 3/10/25 days after the last open; one sentence, no numbers about the gap
- `nudges.monthReview.<0|1|2>.title|body` _(later)_ - 1st of the month: "your month has a character"
- `nudges.askQuieter.title|body|less|reviewsOnly|off` - one-time question after two auto-mutes: "Should we be quieter?" with options

## Share cards (`src/domain/shareCard.ts`)

- `shareCard.week.full|strength|recovery|restart|quiet` - card title by week title
- `shareCard.workout.title` - workout card title
- `shareCard.rhythm.title` - rhythm milestone card title
- (achievement cards reuse `achievements.<id>.name`)
- `shareCard.stat.trainingDays|foodDays|proteinDays|rhythmWeeks|lifetimeWeeks|avgProteinG|trendDelta|durationMin|volume|distance|prExercise|routine` - label of each stat (`ShareStat.key`); values are plain numbers/names without units, the UI adds units
- `shareCard.options.showName|showDetails` - the two preview switches
- `shareCard.wordmark` - small brand line at the bottom

## Care signal (`src/domain/care.ts`, UI wording by Brand/Legal)

Not referenced by code yet, listed so the card exists when Today wires `useCareSignal()`:

- `care.lowIntake.title|body|link` - one calm hint card (no alarm, no red, no diagnosis; help link wording and country links by Legal)

## Rhythm UI strings the screens will need (derived from domain states)

- `rhythm.thisWeek.inRhythm|inReach|open` - chip for `RhythmState.thisWeek` ("in rhythm", "within reach", "still open"; never a warning)
- `rhythm.lastWeek.rhythm|grace|broken|paused|none` - last-week outcome line; `grace`: "grace week used, your rhythm stays" (visible as calm, not as loss)
- `rhythm.begins` - shown instead of "0" when `current` is 0 ("rhythm begins"), plus best/lifetime hint
- `rhythm.ring.food|training|protein` - ring labels
- `rhythm.dayState.kept|empty|open|future|paused` - day states (UI word for `empty` is "open", never "missed")
- `rhythm.pause.title|body|add|end|limitHint` - pause mode (1-21 days, retroactive up to 7; the limit hint appears only when exceeded)
- `rhythm.restDay.cta|done` - "enjoy rest day" button and confirmation
- `rhythm.stageUp.title|body` - stage ascent moment
- `achievements.restored` - "found again: N stamps" notice after a reinstall (count interpolated)
