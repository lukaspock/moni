# møni design system (identity v2 "Nachtschicht im Fjord")

Compact reference for building screens. Full spec and rationale: `docs/identity/IDENTITY-PLAN.md` (decisions D1–D13, wins over the detail docs) and `docs/identity/01`–`05`. Token source: `theme.config.js`; code-side conventions: `CLAUDE.md` → "Theme / brand colors" and "Identity conventions".

## Surfaces & color

- Page background `bg-bg`; grouped blocks sit on `surface` (S1) → `surface-raised` (S2) → `surface-high` (S3). Separators `bg-line`, card hairline `line-soft`.
- Text: `text-label`, `text-label-secondary`, `text-label-tertiary`. On accent fills: `text-on-tint`.
- Brand: `tint` (lime in dark, forest in light), `bonus` (ember = workout bonus/"Flut"), `destructive`, `warning`, `success`, `foam` (celebration light points). Every color has a `*-soft` fill where tinted backgrounds are needed (`tint-soft`, `bonus-soft`, `destructive-soft`, `protein-soft` …).
- Macros: `protein` violet, `carbs` honey, `fat` cyan — always with a letter marker (`MacroMarker`), never color alone.
- **Hero is always dark** (forest gradient + fixed lime/ember, in Light and Dark Mode). Use `Card variant="hero"`, one per screen. Text on hero: `text-hero-label` / `text-hero-label-2`, tracks `hero-track`.
- Skia/SVG/gradients: `useThemeHex(name)` or `fixedColors` — never inline hex.
- Depth: Dark Mode has no drop shadows (surface steps + 1-pt hairline); Light Mode uses warm soft shadows (`elevationStyle`).

## Card variants (`<Card>` from `@/components/ui`)

| Variant  | Use                                                                                 | Radius / padding |
| -------- | ----------------------------------------------------------------------------------- | ---------------- |
| `flat`   | default grouped block (S1 + hairline)                                               | 24 / 20          |
| `raised` | block that should lift (light shadow)                                               | 24 / 20          |
| `hero`   | always-dark forest gradient, one per screen                                         | 32 / 24          |
| `tinted` | soft colored block, `tone` = `accent`, `bonus`, `danger`, `protein`, `carbs`, `fat` | 24 / 20          |
| `inset`  | nested block inside a card                                                          | 16 / 12          |

Pass `onPress` for a tappable card (spring press + highlight). A `p-*` class replaces the default padding. Radii tokens: `rounded-inner` 16, `rounded-card` 24, `rounded-hero` 32; use `borderCurve: 'continuous'`. 4-pt grid, screen gutter 20.

## Typography

- **Bricolage Grotesque** (600/700/800) only for display, titles and numbers: `font-display`, `font-display-bold`, `font-display-black` or `textStyles.*` from `src/theme/typography.ts`. **Never add `font-bold`/`fontWeight`** to these (fake bold on iOS).
- **SF Pro** (system) for all UI text and controls: `headline`, `body`, `callout`, `caption`, `overline`, `button`.
- Numbers: `numericHero` (64), `numericL` (40), `numericM` (24), `numericS` (17) — all `tabular-nums`. Animated numbers via `RollingNumber`/`CountText`.
- Dynamic Type caps: `maxFontSizeMultiplier.text 1.4 / title 1.3 / numeric 1.15`.

## Screen structure

- Tab roots: no native header (`headerShown: false`), `<ScreenTitle title subtitle? right?>` fixed top-left above the ScrollView. Sub-screens keep the native header + back arrow.
- Section labels: `<SectionHeader title variant="overline"|"title" marker? actionLabel? onActionPress?>`.
- Lists: `<ListRow>` (min 60 pt, icon tile, title/subtitle, value + unit, chevron, `separator`, `destructive`) inside `<Card className="gap-0 p-0 overflow-hidden">`.
- Small elements: `Chip` (36 pt, 44 pt tap area, `activeStyle` `solid`/`soft`), `Pill` (read-only status), `IconTile` (soft icon container), `CountBadge` / `StatusDot` / `StreakBadge` / `AiBadge`, `ToastView` (visual only; the host positions it).

## Buttons

- **Primary action** = `GlassActionButton` (native Liquid Glass via `expo-glass-effect`, accent tint, 56 pt, label in `on-tint`). One per screen, at the bottom of sheets.
- Onboarding uses its own `GlassButton` (`variant: 'secondary'` for the second action).
- No other tinted rectangles for primary actions, no `Cancel` text buttons in sheets, no expo-blur/opacity fake glass (hard rule #1).

## Sheets & modals

- Every popup = `formSheet` with grabber and **no native header**: register with `SHEET_OPTIONS` (detents 0.75/1) or `FULL_SHEET_OPTIONS` (full height) in `app/_layout.tsx`; body = `<SheetScreen title subtitle?>` (centered title, 20 pt padding/gap, scrollable). Swipe down closes.
- `workout/*` stays `fullScreenModal` (no drag-to-dismiss during a workout) with the same look; routes outside the tabs that need their own bar use `ModalTopBar`.

## Charts (`src/components/charts`)

- `KcalRing`: today's level on the hero — 22-pt stroke, lime → foam sweep, glow, head dot, ember bonus segment streaming in. Over the limit it calmly warms to ember: **no red, no warning haptic**.
- `MacroBar`: letter marker + "Xg / Yg" + animated bar; over target keeps the macro color, target tick + short danger stroke.
- `WeeklyBars` (single hue, accent), `DailyKcalBars` (accent + ember cap + danger for over-target; dashed 100 % line), `WeightTrendChart` (Skia line, hero variant in lime).
- **Ember and honey never in the same chart.** Color is never the only information carrier (markers, labels, VoiceOver labels).

## Motion

- Tokens from `src/theme/motion.ts`: durations 90/160/280/520/900 ms (+ ambient 3200), exits = 0.65 × entrance; easings `rise` (default), `settle`, `ebb` (exits), `smooth` (ambient only); springs `tap`, `settle`, `bouncy`, `heavy`; `press` scales; `staggerDelay(i)` max 400 ms. Things rise, they never slide sideways.
- Kit (`src/components/motion`): `PressableScale`, `Reveal`, `RollingNumber`, `CountText`, `GlowPulse`, `Foam`, `Celebration`, `TideLoader` (AI analysis, calculating), `SkeletonBlock`, `CheckDraw` (set done), `MealFlight` (saved meal flies into the ring).
- Celebrations are tides and foam, never confetti; max 2 celebrations per day.
- Reduced Motion: always `reduceMotion: REDUCE`; replace sequences with the end state via `useReduceMotion()`.

## Haptics

- Only `haptic.<event>()` from `src/lib/haptics.ts` (e.g. `tap`, `select`, `toggle`, `mealSaved`, `scanHit`, `aiDone`, `setDone`, `setDonePR`, `workoutFinished`, `bonusGained`, `goalReached`, `rhythmMilestone`). New events go into `HAPTIC_PATTERNS` in `src/lib/hapticsEngine.ts`.
- Native controls bring their own haptics — don't double them. Users can switch haptics off in Profile.

## Logo, illustrations, icons

- Mark "Insel im Pegel": `LogoMark` (`color` on dark/hero, `mono`, `adaptive`), `Wordmark` (always lower-case "møni"), `Lockup` (mark + wordmark). Generated geometry — change it only through `docs/identity/logo/generate_mark.py`.
- `Illustration name=…` (`emptyMeals`, `emptyWorkout`, `noData`, `offline`, `error`, `goalReached`, `streak`, `notifications`, `healthPrimer`) for empty/error states and primers — never in core flows (Today hero, active workout, food review).
- `BrandIcon` for custom glyphs, SF Symbols (`expo-symbols`) for everything else. `Badge` = stamp art for achievements, `RingPattern` = decorative background pattern.
- App icon: `assets/moni.icon` (Icon Composer, layers `upper`/`lower`); no mascot (postponed).

## Voice (UI copy)

- All strings via `t()` in DE + EN; no emojis; "møni" lower-case; number before adjective; no shaming, no moral, no red for "over the level".
- Glossary: Pegel / level (daily limit), Flut / tide (workout bonus), Rhythmus / rhythm (never "Streak"), Gezeitentafel (weekly review), Einheit / session, Stammgerichte / regulars (favorites). At most one tide term per screen.

## Do / Don't

| Do                                                    | Don't                                                     |
| ----------------------------------------------------- | --------------------------------------------------------- |
| Tokens (`bg-surface`, `text-tint`) and `themeColor()` | Hex, `systemBlue`, `#007AFF`, legacy `secondary-system-*` |
| One dark hero per screen                              | Light hero, two heroes, hero inside a sheet               |
| `GlassActionButton` for the primary action            | Custom green buttons, `Cancel` text buttons               |
| `font-display*` / `textStyles` without extra weight   | `font-display` + `font-bold`                              |
| `haptic.<event>()`                                    | `import * as Haptics from 'expo-haptics'`                 |
| Motion tokens + `REDUCE`                              | Hand-tuned durations, sideways slides, confetti           |
| Macro color + letter marker                           | Ember and honey in one chart, color as the only signal    |
| Calm copy, facts first                                | Emojis, "Streak", red warnings for eating above the level |
