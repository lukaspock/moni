import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import { router, useLocalSearchParams } from 'expo-router';

import { GlassActionButton, SheetScreen } from '@/components/ui';
import { resolveLogDate } from '@/domain';
import {
  useFoodAnalysis,
  useFoodDraftStore,
  type AnalysisFailure,
} from '@/features/food';
import {
  joinTranscript,
  releaseAction,
  useVoiceCapture,
  VoiceWave,
  type VoiceErrorKind,
} from '@/features/voice';
import { toISODate } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { REDUCE, duration, exit } from '@/theme/motion';
import { themeColor, useThemeHex } from '@/theme/colors';
import { textStyles } from '@/theme/typography';

const MIC_SIZE = 96;

/**
 * Log a meal by voice: hold or tap the mic, watch the live transcript, edit it,
 * then "Estimate" runs the same text analysis as the describe flow and opens
 * the review sheet. Register with `SHEET_OPTIONS` (formSheet). Optional `?date=`.
 */
export default function VoiceLogScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ date?: string }>();
  const voice = useVoiceCapture();
  const { analyzeText } = useFoodAnalysis();
  const onAccent = useThemeHex('onAccent');
  const accent = useThemeHex('accent');
  const placeholder = useThemeHex('labelTertiary');

  /** Text before the current recording; new speech is appended to it. */
  const [base, setBase] = useState('');
  /** Manual edits after recording; null = follow base + transcript. */
  const [edited, setEdited] = useState<string | null>(null);
  const [holding, setHolding] = useState(false);
  const pressRef = useRef({ startedByThisPress: false, at: 0 });

  const listening = voice.state === 'listening';
  const busy =
    listening || voice.state === 'stopping' || voice.state === 'requesting';
  const spoken = joinTranscript(base, voice.transcript);
  const text = busy ? spoken : (edited ?? spoken);

  const onPressIn = () => {
    const startNow = !busy;
    pressRef.current = { startedByThisPress: startNow, at: Date.now() };
    if (!startNow) return;
    setBase(text);
    setEdited(null);
    setHolding(true);
    void voice.start();
  };

  const onPressOut = () => {
    setHolding(false);
    const { startedByThisPress, at } = pressRef.current;
    if (releaseAction(startedByThisPress, Date.now() - at) === 'stop')
      voice.stop();
  };

  const clear = () => {
    voice.reset();
    setBase('');
    setEdited(null);
  };

  const finish = (failure: AnalysisFailure | null) => {
    if (failure)
      useFoodDraftStore
        .getState()
        .setStatus(
          'error',
          failure === 'ai_limit_reached' ? 'ai_limit_reached' : 'generic',
        );
  };

  const estimate = () => {
    const value = text.trim();
    if (!value || busy) return;
    haptic.aiStart();
    const store = useFoodDraftStore.getState();
    store.start({
      date: resolveLogDate(params.date, toISODate()),
      source: 'voice',
    });
    store.setStatus('analyzing');
    // push (not replace): this sheet stays mounted until the analysis resolves;
    // the review's save dismisses the whole modal stack.
    router.push('/food-review');
    void analyzeText(value).then(finish);
  };

  const status = (() => {
    if (voice.state === 'requesting') return t('food.voice.requesting');
    if (voice.state === 'stopping') return t('food.voice.stopping');
    if (listening)
      return holding
        ? t('food.voice.listeningHold')
        : t('food.voice.listeningTap');
    if (text) return t('food.voice.editHint');
    return t('food.voice.tapOrHold');
  })();

  const errorText: Record<VoiceErrorKind, string> = {
    permission: t('food.voice.error.permission'),
    unavailable: t('food.voice.error.unavailable'),
    noSpeech: t('food.voice.error.noSpeech'),
    network: t('food.voice.error.network'),
    interrupted: t('food.voice.error.interrupted'),
    generic: t('food.voice.error.generic'),
  };
  const micDisabled = !voice.available;

  return (
    <SheetScreen
      title={t('food.voice.title')}
      subtitle={t('food.voice.subtitle')}
    >
      <View style={{ minHeight: 132 }} className="justify-center">
        {busy ? (
          <Text
            accessibilityLabel={t('food.voice.transcriptLabel')}
            accessibilityLiveRegion="polite"
            maxFontSizeMultiplier={1.3}
            className={text ? 'text-label' : 'text-label-tertiary'}
            style={[textStyles.title, { fontSize: 26, lineHeight: 34 }]}
          >
            {text || t('food.voice.example')}
          </Text>
        ) : (
          <TextInput
            value={text}
            onChangeText={setEdited}
            multiline
            placeholder={t('food.voice.example')}
            placeholderTextColor={placeholder}
            accessibilityLabel={t('food.voice.transcriptLabel')}
            maxFontSizeMultiplier={1.3}
            className="text-label"
            style={[
              textStyles.title,
              { fontSize: 26, lineHeight: 34, minHeight: 132 },
            ]}
            textAlignVertical="top"
          />
        )}
      </View>

      <VoiceWave volume={voice.volume} active={listening} />

      <View className="items-center gap-3">
        <Pressable
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={micDisabled}
          accessibilityRole="button"
          accessibilityLabel={
            listening
              ? t('food.voice.stopRecording')
              : t('food.voice.startRecording')
          }
          accessibilityHint={t('food.voice.tapOrHold')}
          accessibilityState={{ selected: listening, disabled: micDisabled }}
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.95 : 1 }],
            opacity: micDisabled ? 0.4 : 1,
          })}
        >
          <View
            className={listening ? 'bg-tint' : 'bg-tint-soft'}
            style={{
              width: MIC_SIZE,
              height: MIC_SIZE,
              borderRadius: MIC_SIZE / 2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SymbolView
              name={listening ? 'stop.fill' : 'mic.fill'}
              size={listening ? 30 : 38}
              weight="semibold"
              tintColor={listening ? onAccent : accent}
            />
          </View>
        </Pressable>
        <Text
          maxFontSizeMultiplier={1.4}
          className="text-label-secondary text-center"
          style={textStyles.callout}
        >
          {status}
        </Text>
      </View>

      {voice.error ? (
        <Animated.View
          entering={FadeIn.duration(duration.fast).reduceMotion(REDUCE)}
          exiting={FadeOut.duration(exit(duration.fast)).reduceMotion(REDUCE)}
          className="bg-surface gap-3 p-4"
          style={{ borderRadius: 20, borderCurve: 'continuous' }}
          accessibilityLiveRegion="polite"
        >
          <Text
            maxFontSizeMultiplier={1.4}
            className="text-label"
            style={textStyles.body}
          >
            {errorText[voice.error]}
          </Text>
          {voice.error === 'permission' ? (
            <Pressable
              onPress={() => void Linking.openSettings()}
              accessibilityRole="link"
              hitSlop={8}
            >
              <Text
                maxFontSizeMultiplier={1.4}
                style={[
                  textStyles.body,
                  { color: themeColor('accent'), fontWeight: '600' },
                ]}
              >
                {t('food.voice.openSettings')}
              </Text>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}

      <View className="gap-3">
        <GlassActionButton
          label={t('food.voice.estimate')}
          symbol="sparkles"
          disabled={!text.trim() || busy}
          onPress={estimate}
        />
        {text && !busy ? (
          <Pressable
            onPress={clear}
            accessibilityRole="button"
            hitSlop={8}
            className="items-center py-2"
          >
            <Text
              maxFontSizeMultiplier={1.4}
              className="text-label-secondary"
              style={textStyles.body}
            >
              {t('food.voice.clear')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </SheetScreen>
  );
}
