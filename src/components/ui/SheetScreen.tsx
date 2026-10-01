import type { ReactNode } from 'react';
import { ScrollView, Text } from 'react-native';

/**
 * Body of every popup/sheet: centered title, scrollable content, 20 px padding —
 * identical to the log-food sheet. Register the route with `SHEET_OPTIONS`
 * (formSheet + grabber, headerShown false) so all popups look the same.
 */
export function SheetScreen({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <ScrollView
      className="bg-system-background flex-1"
      contentContainerClassName="gap-5 p-5 pt-6"
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-label text-center text-lg font-semibold">
        {title}
      </Text>
      {children}
    </ScrollView>
  );
}
