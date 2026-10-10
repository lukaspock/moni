import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Linking,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { resolveLogDate, type MealType } from '@/domain';
import { useStartPhotoAnalysis } from '@/features/today/useQuickCapture';
import { PressableScale } from '@/components/motion';
import { toISODate } from '@/lib/date';
import { haptic, type HapticEvent } from '@/lib/haptics';
import { useReduceMotion } from '@/lib/motionPrefs';
import { fixedColors } from '@/theme/colors';
import { textStyles } from '@/theme/typography';

type FlashMode = 'off' | 'auto' | 'on';

const FLASH_ORDER: readonly FlashMode[] = ['off', 'auto', 'on'];
const FLASH_SYMBOL: Record<FlashMode, SymbolViewProps['name']> = {
  off: 'bolt.slash.fill',
  auto: 'bolt.badge.automatic.fill',
  on: 'bolt.fill',
};
/** How long the captured frame stays frozen before the review sheet opens. */
const FREEZE_MS = 550;
const FREEZE_MS_REDUCED = 300;
const SHUTTER = 76;
const MEALS: readonly MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/**
 * møni's own meal camera (fullScreenModal). Always dark: the camera is the
 * only content, so it uses the fixed (mode-independent) brand colors.
 * Shutter / library → same draft + analysis path as everywhere else
 * (`useStartPhotoAnalysis`), then the camera is replaced by `food-review`.
 * Params: `date` (YYYY-MM-DD, default today), optional `meal` preset.
 */
export default function FoodCameraScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ date?: string; meal?: string }>();
  const date = resolveLogDate(params.date, toISODate());
  const meal = MEALS.find((m) => m === params.meal);
  const [permission, requestPermission] = useCameraPermissions();
  const startAnalysis = useStartPhotoAnalysis();
  const reduce = useReduceMotion();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const cameraRef = useRef<CameraView>(null);
  const busyRef = useRef(false);
  const [flash, setFlash] = useState<FlashMode>('off');
  const [ready, setReady] = useState(false);
  const [frozenUri, setFrozenUri] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const handOff = (uri: string) => {
    startAnalysis(uri, { date, meal, replace: true });
  };

  const capture = async () => {
    if (busyRef.current || !ready) return;
    busyRef.current = true;
    try {
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.85,
      });
      if (!photo?.uri) {
        busyRef.current = false;
        haptic.aiFail();
        return;
      }
      setFrozenUri(photo.uri);
      timer.current = setTimeout(
        () => handOff(photo.uri),
        reduce ? FREEZE_MS_REDUCED : FREEZE_MS,
      );
    } catch {
      busyRef.current = false;
      haptic.aiFail();
    }
  };

  const pickFromLibrary = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      // The system photo picker needs no library permission.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });
      const uri = result.canceled ? undefined : result.assets?.[0]?.uri;
      if (uri) handOff(uri);
    } catch {
      haptic.aiFail();
    } finally {
      busyRef.current = false;
    }
  };

  const flashLabel: Record<FlashMode, string> = {
    off: t('food.camera.flashOff'),
    auto: t('food.camera.flashAuto'),
    on: t('food.camera.flashOn'),
  };

  const cycleFlash = () => {
    setFlash((f) => FLASH_ORDER[(FLASH_ORDER.indexOf(f) + 1) % 3]);
  };

  const close = () => router.back();

  const closeButton = (
    <Pressable
      onPress={close}
      hitSlop={8}
      className="absolute left-4 h-11 w-11 items-center justify-center rounded-full bg-black/50"
      style={{ top: insets.top + 8 }}
      accessibilityRole="button"
      accessibilityLabel={t('food.camera.close')}
    >
      <SymbolView name="xmark" size={18} weight="semibold" tintColor="white" />
    </Pressable>
  );

  if (!permission) {
    return (
      <View className="flex-1 bg-black">
        <Stack.Screen options={{ headerShown: false }} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-6">
        <Stack.Screen options={{ headerShown: false }} />
        {closeButton}
        <Animated.View
          entering={FadeIn.duration(220)}
          className="w-full items-center gap-4 p-6"
          style={{
            borderRadius: 28,
            borderCurve: 'continuous',
            backgroundColor: fixedColors.forest,
          }}
        >
          <SymbolView
            name="camera.fill"
            size={36}
            tintColor={fixedColors.lime}
          />
          <Text
            style={[
              textStyles.headline,
              { color: fixedColors.heroLabel, textAlign: 'center' },
            ]}
            maxFontSizeMultiplier={1.3}
          >
            {t('food.camera.permissionTitle')}
          </Text>
          <Text
            style={[
              textStyles.body,
              { color: fixedColors.heroLabel2, textAlign: 'center' },
            ]}
            maxFontSizeMultiplier={1.3}
          >
            {t('food.camera.permissionBody')}
          </Text>
          <PressableScale
            onPress={() =>
              permission.canAskAgain
                ? void requestPermission()
                : void Linking.openSettings()
            }
            haptic="tap"
            accessibilityRole="button"
            className="w-full"
          >
            <View
              className="h-12 items-center justify-center"
              style={{
                borderRadius: 16,
                borderCurve: 'continuous',
                backgroundColor: fixedColors.lime,
              }}
            >
              <Text style={[textStyles.button, { color: fixedColors.ink }]}>
                {permission.canAskAgain
                  ? t('food.camera.allow')
                  : t('food.camera.openSettings')}
              </Text>
            </View>
          </PressableScale>
          <Pressable
            onPress={() => void pickFromLibrary()}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text
              style={[textStyles.callout, { color: fixedColors.heroLabel }]}
            >
              {t('food.camera.useLibrary')}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  // Square hint frame, slightly above center; the area around it is dimmed.
  const frame = Math.min(width - 48, height * 0.48);
  const frameTop = Math.max(insets.top + 72, (height - frame) / 2 - 56);
  const frameLeft = (width - frame) / 2;
  const dim = 'rgba(0,0,0,0.45)';

  return (
    <View className="flex-1 bg-black">
      <Stack.Screen options={{ headerShown: false }} />
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing="back"
        flash={flash}
        onCameraReady={() => setReady(true)}
      />

      {/* Dimmed surroundings + rounded accent frame. */}
      <View pointerEvents="none" className="absolute inset-0">
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: frameTop,
            backgroundColor: dim,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: frameTop + frame,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: dim,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: frameTop,
            left: 0,
            width: frameLeft,
            height: frame,
            backgroundColor: dim,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: frameTop,
            right: 0,
            width: frameLeft,
            height: frame,
            backgroundColor: dim,
          }}
        />
        <Animated.View
          entering={FadeIn.duration(400)}
          accessible
          accessibilityLabel={t('food.camera.frameHint')}
          style={{
            position: 'absolute',
            top: frameTop,
            left: frameLeft,
            width: frame,
            height: frame,
            borderRadius: 32,
            borderCurve: 'continuous',
            borderWidth: 2.5,
            borderColor: fixedColors.lime,
            opacity: 0.9,
          }}
        />
        <View
          style={{ position: 'absolute', top: frameTop + frame + 16 }}
          className="inset-x-0 items-center"
        >
          <View className="rounded-full bg-black/55 px-4 py-2">
            <Text
              style={[textStyles.callout, { color: fixedColors.heroLabel }]}
              maxFontSizeMultiplier={1.3}
            >
              {t('food.camera.frameHint')}
            </Text>
          </View>
        </View>
      </View>

      {closeButton}

      {/* Bottom controls: library · shutter · flash. */}
      <View
        className="absolute inset-x-0 bottom-0 flex-row items-center justify-between px-10"
        style={{ paddingBottom: insets.bottom + 24 }}
      >
        <RoundIconButton
          symbol="photo.on.rectangle"
          label={t('food.camera.library')}
          haptic="tapLight"
          onPress={() => void pickFromLibrary()}
        />
        <PressableScale
          onPress={() => void capture()}
          preset="strong"
          haptic="tap"
          disabled={!ready || frozenUri !== null}
          accessibilityRole="button"
          accessibilityLabel={t('food.camera.shutter')}
          style={{ opacity: ready ? 1 : 0.5 }}
        >
          <View
            className="items-center justify-center"
            style={{
              width: SHUTTER,
              height: SHUTTER,
              borderRadius: SHUTTER / 2,
              borderWidth: 4,
              borderColor: 'white',
            }}
          >
            <View
              style={{
                width: SHUTTER - 16,
                height: SHUTTER - 16,
                borderRadius: (SHUTTER - 16) / 2,
                backgroundColor: 'white',
              }}
            />
          </View>
        </PressableScale>
        <RoundIconButton
          symbol={FLASH_SYMBOL[flash]}
          label={flashLabel[flash]}
          haptic="toggle"
          onPress={cycleFlash}
          active={flash !== 'off'}
        />
      </View>

      {/* Freeze frame: the shot stays on screen briefly before the review opens. */}
      {frozenUri ? (
        <Animated.View
          entering={reduce ? undefined : FadeIn.duration(120)}
          pointerEvents="none"
          className="absolute inset-0 bg-black"
        >
          <Image
            source={{ uri: frozenUri }}
            style={{ flex: 1 }}
            resizeMode="cover"
            accessibilityLabel={t('food.camera.captured')}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

function RoundIconButton({
  symbol,
  label,
  onPress,
  haptic: hapticEvent,
  active = false,
}: {
  symbol: SymbolViewProps['name'];
  label: string;
  onPress: () => void;
  haptic: HapticEvent;
  active?: boolean;
}) {
  return (
    <PressableScale
      onPress={onPress}
      haptic={hapticEvent}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View
        className="h-12 w-12 items-center justify-center rounded-full"
        style={{
          backgroundColor: active ? fixedColors.lime : 'rgba(0,0,0,0.5)',
        }}
      >
        <SymbolView
          name={symbol}
          size={20}
          weight="semibold"
          tintColor={active ? fixedColors.ink : 'white'}
        />
      </View>
    </PressableScale>
  );
}
