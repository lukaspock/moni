import { Children, Fragment, type ReactNode } from 'react';
import { View } from 'react-native';

import { Card, SectionHeader } from '@/components/ui';

/**
 * Settings block: uppercase section label + one Card whose rows are separated
 * by hairlines (design-system "Lists inside a Card"). Rows bring their own
 * `px-4 py-3` padding.
 */
export function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View className="gap-2 pt-5">
      <SectionHeader title={title} />
      <Card className="gap-0 overflow-hidden p-0">
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 && <View className="bg-separator h-px" />}
            {row}
          </Fragment>
        ))}
      </Card>
    </View>
  );
}
