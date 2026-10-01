import * as Crypto from 'expo-crypto';
import { create } from 'zustand';

import {
  loggedAtForDate,
  suggestMealType,
  type FoodItemMacros,
  type FoodSource,
  type MealType,
} from '@/domain';
import { toISODate } from '@/lib/date';

/**
 * State passed between `log-food` -> (analyze-food / barcode-scanner) -> `food-review`
 * without URL params (task 4: "pass state via a small Zustand store, not via URL params").
 * Not persisted — a fresh draft is started every time `log-food` opens.
 */
export type DraftFoodItem = FoodItemMacros & {
  id: string;
  name: string;
  barcode?: string | null;
};

export type FoodDraftStatus = 'idle' | 'analyzing' | 'ready' | 'error';

export type FoodDraftErrorKind = 'ai_limit_reached' | 'generic' | null;

interface FoodDraftState {
  /** Client UUID for the food_log row-to-be. Regenerated on `start()`. */
  id: string;
  date: string;
  loggedAt: string;
  mealType: MealType;
  title: string;
  items: DraftFoodItem[];
  source: FoodSource;
  imagePath: string | null;
  aiConfidence: number | null;
  aiRaw: unknown | null;
  /** Follow-up question from the AI when the input was ambiguous (shown as a hint on review). */
  clarification: string | null;
  saveAsFavorite: boolean;
  /** Overall portion slider, 0.25–3x. Applied on top of individually-edited item grams. */
  portionMultiplier: number;
  status: FoodDraftStatus;
  errorKind: FoodDraftErrorKind;
  /** Technical error code of the last failed analysis (e.g. `502 ai_provider_error`), shown small on the error screen. */
  errorCode: string | null;

  /** Resets the draft and opens it for a given date + source. */
  start: (opts: { date: string; source: FoodSource }) => void;
  setStatus: (status: FoodDraftStatus, errorKind?: FoodDraftErrorKind) => void;
  setTitle: (title: string) => void;
  setMealType: (mealType: MealType) => void;
  setItems: (items: DraftFoodItem[]) => void;
  addItem: (item: Omit<DraftFoodItem, 'id'>) => void;
  updateItem: (id: string, patch: Partial<DraftFoodItem>) => void;
  removeItem: (id: string) => void;
  scaleItemGrams: (id: string, newGrams: number) => void;
  setPortionMultiplier: (multiplier: number) => void;
  setSaveAsFavorite: (value: boolean) => void;
  setImagePath: (path: string | null) => void;
  applyAiResult: (result: {
    title: string;
    mealType: MealType | null;
    items: DraftFoodItem[];
    confidence: number;
    aiRaw: unknown;
    clarification?: string | null;
  }) => void;
  reset: () => void;
}

function emptyState(): Omit<
  FoodDraftState,
  | 'start'
  | 'setStatus'
  | 'setTitle'
  | 'setMealType'
  | 'setItems'
  | 'addItem'
  | 'updateItem'
  | 'removeItem'
  | 'scaleItemGrams'
  | 'setPortionMultiplier'
  | 'setSaveAsFavorite'
  | 'setImagePath'
  | 'applyAiResult'
  | 'reset'
> {
  const now = new Date();
  return {
    id: Crypto.randomUUID(),
    date: toISODate(now),
    loggedAt: now.toISOString(),
    mealType: suggestMealType(now),
    title: '',
    items: [],
    source: 'manual',
    imagePath: null,
    aiConfidence: null,
    aiRaw: null,
    clarification: null,
    saveAsFavorite: false,
    portionMultiplier: 1,
    status: 'idle',
    errorKind: null,
    errorCode: null,
  };
}

export const useFoodDraftStore = create<FoodDraftState>((set, get) => ({
  ...emptyState(),

  start: ({ date, source }) => {
    const now = new Date();
    set({
      ...emptyState(),
      date,
      // Same time of day, but on the day being logged (may be a past/other day).
      loggedAt: loggedAtForDate(date, now),
      source,
      mealType: suggestMealType(now),
    });
  },

  setStatus: (status, errorKind = null) => set({ status, errorKind }),
  setTitle: (title) => set({ title }),
  setMealType: (mealType) => set({ mealType }),
  setItems: (items) => set({ items }),
  addItem: (item) =>
    set((state) => ({
      items: [...state.items, { ...item, id: Crypto.randomUUID() }],
    })),
  updateItem: (id, patch) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    })),
  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
  scaleItemGrams: (id, newGrams) => {
    const item = get().items.find((it) => it.id === id);
    if (!item || item.grams <= 0) return;
    const factor = newGrams / item.grams;
    get().updateItem(id, {
      grams: newGrams,
      kcal: item.kcal * factor,
      proteinG: item.proteinG * factor,
      carbsG: item.carbsG * factor,
      fatG: item.fatG * factor,
    });
  },
  setPortionMultiplier: (multiplier) => set({ portionMultiplier: multiplier }),
  setSaveAsFavorite: (value) => set({ saveAsFavorite: value }),
  setImagePath: (imagePath) => set({ imagePath }),
  applyAiResult: ({
    title,
    mealType,
    items,
    confidence,
    aiRaw,
    clarification,
  }) =>
    set((state) => ({
      title,
      mealType: mealType ?? state.mealType,
      items,
      aiConfidence: confidence,
      aiRaw,
      clarification: clarification ?? null,
      status: 'ready',
      errorKind: null,
      errorCode: null,
    })),
  reset: () => set(emptyState()),
}));
