import { useState, type ReactNode } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { themeColor } from '@/theme/colors';

export interface FieldInputProps extends Pick<
  TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'placeholder'
  | 'returnKeyType'
  | 'onSubmitEditing'
  | 'accessibilityLabel'
  | 'autoCapitalize'
> {
  /** Right-hand slot (send button, library picker …). */
  trailing?: ReactNode;
  /** Display font for names / titles. */
  display?: boolean;
}

/** Doc 02 §5.10: 56 pt, radius 16, S2 surface, 2 pt accent border on focus. */
export function FieldInput({
  trailing,
  display = false,
  ...input
}: FieldInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View
      className="bg-surface-raised h-14 flex-row items-center gap-2 pl-4 pr-3"
      style={{
        borderRadius: 16,
        borderCurve: 'continuous',
        borderWidth: 2,
        borderColor: focused ? themeColor('accent') : 'transparent',
      }}
    >
      <TextInput
        {...input}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor={themeColor('labelTertiary')}
        selectionColor={themeColor('accent')}
        maxFontSizeMultiplier={1.3}
        className={`text-label h-full flex-1 text-[17px] ${display ? 'font-display-bold' : ''}`}
      />
      {trailing}
    </View>
  );
}
