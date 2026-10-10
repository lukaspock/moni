import {
  Button,
  Host,
  Image,
  Menu,
  Section,
  type ButtonProps,
} from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  contentShape,
  frame,
  shapes,
} from '@expo/ui/swift-ui/modifiers';

import { useThemeHex } from '@/theme/colors';

type SFSymbol = NonNullable<ButtonProps['systemImage']>;

export interface NativeMenuItem {
  key: string;
  label: string;
  systemImage?: SFSymbol;
  destructive?: boolean;
  onPress: () => void;
}

export interface NativeMenuSection {
  key: string;
  title: string;
  items: NativeMenuItem[];
}

function renderItem(item: NativeMenuItem) {
  return (
    <Button
      key={item.key}
      label={item.label}
      systemImage={item.systemImage}
      role={item.destructive ? 'destructive' : 'default'}
      onPress={item.onPress}
    />
  );
}

/**
 * Native SwiftUI menu (`@expo/ui/swift-ui` Menu, opens on a single tap).
 * Trigger: a "⋯" glyph with a 44 pt hit area (default), or a text label with
 * an SF Symbol (`text`), which SwiftUI tints with the app accent.
 */
export function NativeMenu({
  label,
  items = [],
  sections = [],
  text,
  textSymbol,
  symbol = 'ellipsis',
}: {
  /** VoiceOver label of the trigger. */
  label: string;
  items?: NativeMenuItem[];
  sections?: NativeMenuSection[];
  /** Text trigger instead of the glyph. */
  text?: string;
  textSymbol?: SFSymbol;
  symbol?: SFSymbol;
}) {
  const color = useThemeHex('labelSecondary');
  const content = [
    ...items.map(renderItem),
    ...sections.map((s) => (
      <Section key={s.key} title={s.title}>
        {s.items.map(renderItem)}
      </Section>
    )),
  ];
  return (
    <Host matchContents>
      {text ? (
        <Menu
          label={text}
          systemImage={textSymbol}
          modifiers={[
            accessibilityLabel(label),
            frame({ minHeight: 44 }),
            contentShape(shapes.rectangle()),
          ]}
        >
          {content}
        </Menu>
      ) : (
        <Menu
          modifiers={[accessibilityLabel(label)]}
          label={
            <Image
              systemName={symbol}
              size={18}
              color={color}
              modifiers={[
                frame({ width: 44, height: 44 }),
                contentShape(shapes.rectangle()),
              ]}
            />
          }
        >
          {content}
        </Menu>
      )}
    </Host>
  );
}
