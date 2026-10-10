import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

import { haptic } from '@/lib/haptics';

import { getSpeechModule, safeCheck, type SpeechModule } from './speech';
import {
  applyResult,
  EMPTY_TRANSCRIPT,
  normalizeVolume,
  shouldFallBackToServer,
  speechLocaleFor,
  transcriptText,
  voiceErrorKindFor,
  type TranscriptAcc,
  type VoiceCaptureState,
  type VoiceErrorKind,
} from './voiceModel';

export interface VoiceCapture {
  state: VoiceCaptureState;
  /** Live transcript of the current/last recording (interim + final). */
  transcript: string;
  /** Input level 0..1 (UI-thread shared value, ~10 Hz), 0 when not listening. */
  volume: SharedValue<number>;
  error: VoiceErrorKind | null;
  /** Native module present and a recognizer exists (synchronous). */
  available: boolean;
  /** Asks for permission on first use, then starts listening. No-op while busy. */
  start: () => Promise<void>;
  /** Stops listening; the final result still arrives. */
  stop: () => void;
  /** Cancels without a final result and clears transcript + error. */
  reset: () => void;
}

/** Whether voice capture can work in this binary/device (no permission check). */
export function isVoiceCaptureAvailable(): boolean {
  const mod = getSpeechModule();
  return !!mod && safeCheck(() => mod.isRecognitionAvailable());
}

/**
 * Speech-to-text for logging meals. Uses the app language (de-DE / en-US),
 * prefers on-device recognition and retries once with server recognition
 * when the device can't do this language offline. Haptic `select` on the
 * user's start/stop.
 */
export function useVoiceCapture(): VoiceCapture {
  const { i18n } = useTranslation();
  const [state, setStateValue] = useState<VoiceCaptureState>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<VoiceErrorKind | null>(null);
  const [available] = useState(isVoiceCaptureAvailable);
  const volume = useSharedValue(0);

  const stateRef = useRef<VoiceCaptureState>('idle');
  const accRef = useRef<TranscriptAcc>(EMPTY_TRANSCRIPT);
  const onDeviceRef = useRef(false);
  const hadResultRef = useRef(false);
  const fallbackRef = useRef(false);
  const langRef = useRef(speechLocaleFor(i18n.language));
  const mountedRef = useRef(true);

  useEffect(() => {
    langRef.current = speechLocaleFor(i18n.language);
  }, [i18n.language]);

  const setState = useCallback((next: VoiceCaptureState) => {
    stateRef.current = next;
    setStateValue(next);
  }, []);

  const fail = useCallback(
    (kind: VoiceErrorKind) => {
      volume.set(0);
      setError(kind);
      setState('error');
    },
    [setState, volume],
  );

  const launch = useCallback((mod: SpeechModule, onDevice: boolean) => {
    onDeviceRef.current = onDevice;
    mod.start({
      lang: langRef.current,
      interimResults: true,
      continuous: true,
      requiresOnDeviceRecognition: onDevice,
      addsPunctuation: true,
      iosTaskHint: 'dictation',
      volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const mod = getSpeechModule();
    if (!mod) return;
    const subs = [
      mod.addListener('result', (event) => {
        hadResultRef.current = true;
        accRef.current = applyResult(
          accRef.current,
          event.isFinal,
          event.results[0]?.transcript ?? '',
        );
        setTranscript(transcriptText(accRef.current));
      }),
      mod.addListener('volumechange', (event) => {
        volume.set(normalizeVolume(event.value));
      }),
      mod.addListener('error', (event) => {
        if (
          shouldFallBackToServer(
            event.error,
            onDeviceRef.current,
            hadResultRef.current,
          )
        ) {
          fallbackRef.current = true;
          return;
        }
        const kind = voiceErrorKindFor(event.error);
        // "No speech" after the user already said something is just the end.
        if (!kind || (kind === 'noSpeech' && hadResultRef.current)) return;
        fail(kind);
      }),
      mod.addListener('end', () => {
        volume.set(0);
        if (fallbackRef.current) {
          fallbackRef.current = false;
          try {
            launch(mod, false);
          } catch {
            fail('unavailable');
          }
          return;
        }
        if (stateRef.current !== 'error') setState('idle');
      }),
    ];
    return () => {
      mountedRef.current = false;
      subs.forEach((s) => s.remove());
      const s = stateRef.current;
      if (s === 'listening' || s === 'stopping') {
        try {
          mod.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [fail, launch, setState, volume]);

  const start = useCallback(async () => {
    const s = stateRef.current;
    if (s === 'requesting' || s === 'listening' || s === 'stopping') return;
    const mod = getSpeechModule();
    if (!mod || !safeCheck(() => mod.isRecognitionAvailable())) {
      fail('unavailable');
      return;
    }
    setError(null);
    accRef.current = EMPTY_TRANSCRIPT;
    hadResultRef.current = false;
    fallbackRef.current = false;
    setTranscript('');
    setState('requesting');
    let granted = false;
    try {
      granted = (await mod.requestPermissionsAsync()).granted;
    } catch {
      granted = false;
    }
    if (!mountedRef.current) return;
    if (!granted) {
      fail('permission');
      return;
    }
    try {
      launch(
        mod,
        safeCheck(() => mod.supportsOnDeviceRecognition()),
      );
      setState('listening');
      haptic.select();
    } catch {
      fail('generic');
    }
  }, [fail, launch, setState]);

  const stop = useCallback(() => {
    if (stateRef.current !== 'listening') return;
    const mod = getSpeechModule();
    setState('stopping');
    haptic.select();
    try {
      mod?.stop();
    } catch {
      setState('idle');
    }
  }, [setState]);

  const reset = useCallback(() => {
    const s = stateRef.current;
    if (s === 'listening' || s === 'stopping') {
      try {
        getSpeechModule()?.abort();
      } catch {
        // ignore
      }
    }
    accRef.current = EMPTY_TRANSCRIPT;
    volume.set(0);
    setTranscript('');
    setError(null);
    setState('idle');
  }, [setState, volume]);

  return { state, transcript, volume, error, available, start, stop, reset };
}
