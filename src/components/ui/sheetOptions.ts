/** Screen options for every popup: native form sheet with grabber, no header. */
export const SHEET_OPTIONS = {
  presentation: 'formSheet' as const,
  sheetAllowedDetents: [0.75, 1],
  sheetGrabberVisible: true,
  headerShown: false,
};

/** Same sheet, but opens full height (long forms, active workouts). */
export const FULL_SHEET_OPTIONS = {
  ...SHEET_OPTIONS,
  sheetAllowedDetents: [1],
};
