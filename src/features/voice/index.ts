// CONTRACT (owner: `voice`). Speech-to-text for meal logging (`app/voice-log.tsx`).
export { useVoiceCapture, isVoiceCaptureAvailable } from './useVoiceCapture';
export type { VoiceCapture } from './useVoiceCapture';
export { VoiceWave } from './VoiceWave';
export { releaseAction, HOLD_THRESHOLD_MS, joinTranscript } from './voiceModel';
export type { VoiceCaptureState, VoiceErrorKind } from './voiceModel';
