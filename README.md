# møni

**Training and nutrition in one place.** møni is an iOS fitness-lifestyle app that connects what you eat with how you train, so your daily calorie budget reflects your real life instead of a static number.

> Status: in active development, iOS only. Built as a personal project.

> **How this was built:** implemented with [Claude Code](https://claude.com/claude-code). The product plan, architecture and structure were defined and reviewed by me, and I reviewed the generated code.

## The idea

Most apps do one half of the job. Calorie trackers do not know that you trained today, and workout trackers do not know what you ate. møni treats both as one system:

- **Log food in seconds.** Snap a photo, type it, speak it, or scan a barcode. AI estimates calories and macros per ingredient, and you can correct everything before saving.
- **Track real training.** Routines, sets, reps and weight, plus workouts imported from Apple Health, which supplies the calories you actually burned.
- **A budget that adapts.** Your daily limit moves with your goal, your training and your weight trend. Protein is tied to training, and the app learns your real energy expenditure from the weight you log.

## Goals

1. **Fast and friction-free logging.** Favorites, recents and one-tap quick log keep tracking from becoming a chore.
2. **Honest numbers.** Estimates are editable, calories burned come from real data (Apple Health), and no bonus is shown unless a workout actually happened.
3. **Feels like an Apple app.** Native iOS 26 Liquid Glass components, system colors, haptics and SF Symbols instead of imitations.
4. **One consistent design system.** One look for every screen, sheet and button.
5. **Private by design.** Row-level security on every table, secrets only on the server, metric values stored in the database and converted for display.
6. **Works offline where it matters.** Workouts are recorded offline and synced in the background.
7. **Multilingual from day one.** German and English, easy to extend.

## Features

| Area     | What it does                                                                              |
| -------- | ----------------------------------------------------------------------------------------- |
| Food     | Photo, text, voice and barcode logging, nutrition-label scan, favorites, meal categories  |
| Training | Routines, live workout with rest timer, history and exercise progress                     |
| Health   | Apple Health import of workouts and weight, optional write-back of workouts and nutrition |
| Targets  | Dynamic daily limit, macro split, adaptive TDEE from your weight trend                    |
| Insights | Weight trend, calories and training correlations                                          |
| Account  | Onboarding with goal projection, units (metric/imperial), reminders, DE/EN                |

## Tech

React Native with Expo (SDK 57, development build), TypeScript, expo-router with native tabs, NativeWind for layout, native Liquid Glass via `expo-glass-effect` and `@expo/ui`, Supabase (Auth, Postgres with RLS, Storage, Edge Functions), Google Gemini for food analysis, TanStack Query, Zustand, MMKV, HealthKit, RevenueCat.

All calculation logic lives as pure, tested functions in `src/domain`.

## Project docs

| File                                             | Purpose                                           |
| ------------------------------------------------ | ------------------------------------------------- |
| [`PLAN.md`](PLAN.md)                             | Product and technical plan                        |
| [`CLAUDE.md`](CLAUDE.md)                         | Stack, structure, conventions, commands and setup |
| [`DEVLOG.md`](DEVLOG.md)                         | Task checklist and log                            |
| [`docs/design-system.md`](docs/design-system.md) | The shared design system                          |

## Getting started

```bash
npm install
cp .env.example .env        # add your Supabase URL and anon key
npm test                    # unit tests
npx expo run:ios            # development build in the simulator
```

Device builds, backend setup and the CI pipeline are described in [`CLAUDE.md`](CLAUDE.md) and `supabase/README.md`.

## License

All rights reserved. This is a private project.
