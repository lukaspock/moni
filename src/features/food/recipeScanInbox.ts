import { create } from 'zustand';

import type { RecipeIngredient } from '@/domain';

/**
 * Hand-off from `barcode-scanner?target=recipe` back to the open recipe editor
 * (plain, non-persisted — see CLAUDE.md "Cross-screen draft state"). The scanner
 * `deliver()`s the scanned products and goes back; the editor `take()`s them.
 */
interface RecipeScanInbox {
  items: RecipeIngredient[];
  deliver: (items: RecipeIngredient[]) => void;
  /** Returns and clears the pending items. */
  take: () => RecipeIngredient[];
  clear: () => void;
}

export const useRecipeScanInbox = create<RecipeScanInbox>((set, get) => ({
  items: [],
  deliver: (items) => set((s) => ({ items: [...s.items, ...items] })),
  take: () => {
    const { items } = get();
    if (items.length > 0) set({ items: [] });
    return items;
  },
  clear: () => set({ items: [] }),
}));
