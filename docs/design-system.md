# møni design system (ONE look for the whole app)

- Background `bg-system-background` (black in dark mode), grouped blocks = `<Card>` (`bg-secondary-system-background rounded-2xl p-4`), section labels = `<SectionHeader>`.
- **Primary action** = `GlassActionButton` (native Liquid Glass pill, accent tint, 56 pt) – the same button as "Add meal". No other green/tinted rectangles for primary actions.
- **Every popup** = `formSheet` with grabber and **no native header**, body = `<SheetScreen title>` (centered 18 pt semibold title, 20 px padding, like Log food). Register routes with `SHEET_OPTIONS` / `FULL_SHEET_OPTIONS` from `@/components/ui`. No `presentation: 'modal'` with a visible header, no `Cancel` text buttons (swipe down closes).
- Tab roots: **small inline header title, always pinned on top** (`headerLargeTitle: false`).
- Colors only via tokens (`text-tint`, `bg-tint`, `text-label`, `text-secondary-label`, `bg-destructive`…), never hex/systemBlue.
- Lists inside a Card: rows `px-4 py-3` separated by `bg-separator h-px`.
