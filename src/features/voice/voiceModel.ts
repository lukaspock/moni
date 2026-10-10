/**
 * Pure helpers for voice capture (no RN/Expo imports, tested in voiceModel.test.ts).
 */

export type VoiceCaptureState =
  | 'idle'
  /** Waiting for the microphone / speech permission sheet. */
  | 'requesting'
  | 'listening'
  /** Stop requested, waiting for the final result. */
  | 'stopping'
  | 'error';

export type VoiceErrorKind =
  /** Microphone or speech recognition permission denied. */
  | 'permission'
  /** No native module in this binary, or no recognizer for this device/language. */
  | 'unavailable'
  | 'noSpeech'
  | 'network'
  | 'interrupted'
  | 'generic';

/** BCP-47 recognizer locale for the app language (only DE/EN are supported). */
export function speechLocaleFor(appLanguage: string | undefined): string {
  return (appLanguage ?? '').toLowerCase().startsWith('de') ? 'de-DE' : 'en-US';
}

/**
 * Maps the native `volumechange` value (-2..10, below 0 = inaudible) to a calm
 * 0..1 level. Normal speech sits around 2..7.
 */
export function normalizeVolume(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(value / 8, 1);
}

/** Joins non-empty transcript parts with a single space. */
export function joinTranscript(
  ...parts: (string | null | undefined)[]
): string {
  return parts
    .map((p) => (p ?? '').trim())
    .filter((p) => p.length > 0)
    .join(' ');
}

/** Running transcript of one recording session. */
export interface TranscriptAcc {
  /** Final segments so far. */
  committed: string;
  /** Latest interim (not yet final) segment. */
  partial: string;
  /** Last final segment, to drop the duplicate iOS 18 sends on stop. */
  lastFinal: string;
}

export const EMPTY_TRANSCRIPT: TranscriptAcc = {
  committed: '',
  partial: '',
  lastFinal: '',
};

/**
 * Folds one `result` event into the session transcript (Web Speech semantics:
 * final results are segments to append, interim results replace the pending
 * segment). Two identical finals in a row are treated as one.
 */
export function applyResult(
  acc: TranscriptAcc,
  isFinal: boolean,
  transcript: string,
): TranscriptAcc {
  const text = transcript.trim();
  if (!isFinal) return { ...acc, partial: text };
  if (!text || text === acc.lastFinal) return { ...acc, partial: '' };
  return {
    committed: joinTranscript(acc.committed, text),
    partial: '',
    lastFinal: text,
  };
}

/** Text to show for a session. */
export function transcriptText(acc: TranscriptAcc): string {
  return joinTranscript(acc.committed, acc.partial);
}

/** Maps a native recognizer error code; `null` = not an error worth showing (user abort). */
export function voiceErrorKindFor(code: string): VoiceErrorKind | null {
  switch (code) {
    case 'aborted':
      return null;
    case 'not-allowed':
      return 'permission';
    case 'service-not-allowed':
    case 'language-not-supported':
      return 'unavailable';
    case 'no-speech':
    case 'speech-timeout':
    case 'nomatch':
      return 'noSpeech';
    case 'network':
      return 'network';
    case 'interrupted':
    case 'audio-capture':
    case 'busy':
      return 'interrupted';
    default:
      return 'generic';
  }
}

/**
 * Whether an on-device attempt should be retried once with server recognition:
 * the device can't recognize this language offline and nothing was heard yet.
 */
export function shouldFallBackToServer(
  code: string,
  usedOnDevice: boolean,
  hadResult: boolean,
): boolean {
  return (
    usedOnDevice &&
    !hadResult &&
    (code === 'language-not-supported' || code === 'service-not-allowed')
  );
}

/** Hold-to-talk vs. tap-to-toggle: a press shorter than this keeps listening. */
export const HOLD_THRESHOLD_MS = 400;

/**
 * Decides what releasing the mic button does.
 * - press started the recording and was held  → stop (push-to-talk)
 * - press started the recording, short tap     → keep listening (tap mode)
 * - press happened while already listening     → stop (tap to stop)
 */
export function releaseAction(
  startedByThisPress: boolean,
  heldMs: number,
): 'stop' | 'keep' {
  if (!startedByThisPress) return 'stop';
  return heldMs >= HOLD_THRESHOLD_MS ? 'stop' : 'keep';
}
