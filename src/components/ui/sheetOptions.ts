/** Screen options for every popup: native form sheet with grabber, no header. */
export const SHEET_OPTIONS = {
  presentation: 'formSheet' as const,
  sheetAllowedDetents: [0.75, 1],
  sheetGrabberVisible: true,
  headerShown: false,
};

/**
 * Full-height popup (long forms). Native page sheet (`modal`), swipe-down to
 * dismiss. Not a `formSheet` with `sheetAllowedDetents: [1]`: with a single
 * detent react-native-screens 4.26 on iOS 26 lays out an empty sheet.
 */
export const FULL_SHEET_OPTIONS = {
  presentation: 'modal' as const,
  headerShown: false,
};
