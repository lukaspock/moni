import {
  applyResult,
  EMPTY_TRANSCRIPT,
  HOLD_THRESHOLD_MS,
  transcriptText,
  joinTranscript,
  normalizeVolume,
  releaseAction,
  shouldFallBackToServer,
  speechLocaleFor,
  voiceErrorKindFor,
} from './voiceModel';

describe('speechLocaleFor', () => {
  it('maps app languages to recognizer locales', () => {
    expect(speechLocaleFor('de')).toBe('de-DE');
    expect(speechLocaleFor('de-AT')).toBe('de-DE');
    expect(speechLocaleFor('en')).toBe('en-US');
    expect(speechLocaleFor(undefined)).toBe('en-US');
  });
});

describe('normalizeVolume', () => {
  it('clamps to 0..1 and treats <= 0 as silence', () => {
    expect(normalizeVolume(-2)).toBe(0);
    expect(normalizeVolume(0)).toBe(0);
    expect(normalizeVolume(4)).toBe(0.5);
    expect(normalizeVolume(10)).toBe(1);
    expect(normalizeVolume(Number.NaN)).toBe(0);
  });
});

describe('joinTranscript', () => {
  it('joins non-empty trimmed parts', () => {
    expect(joinTranscript(' Zwei Eier ', '', null, 'ein Toast')).toBe(
      'Zwei Eier ein Toast',
    );
    expect(joinTranscript('', undefined)).toBe('');
  });
});

describe('applyResult', () => {
  it('replaces interim text and appends final segments', () => {
    let acc = EMPTY_TRANSCRIPT;
    acc = applyResult(acc, false, 'Zwei');
    expect(transcriptText(acc)).toBe('Zwei');
    acc = applyResult(acc, false, 'Zwei Eier');
    expect(transcriptText(acc)).toBe('Zwei Eier');
    acc = applyResult(acc, true, 'Zwei Eier');
    acc = applyResult(acc, false, ' ein Toast');
    expect(transcriptText(acc)).toBe('Zwei Eier ein Toast');
    acc = applyResult(acc, true, ' ein Toast mit Butter');
    expect(transcriptText(acc)).toBe('Zwei Eier ein Toast mit Butter');
  });

  it('drops a repeated final (iOS 18 sends the last segment twice on stop)', () => {
    let acc = applyResult(EMPTY_TRANSCRIPT, true, 'ein Apfel');
    acc = applyResult(acc, true, ' ein Apfel');
    expect(transcriptText(acc)).toBe('ein Apfel');
  });
});

describe('voiceErrorKindFor', () => {
  it('maps native codes', () => {
    expect(voiceErrorKindFor('aborted')).toBeNull();
    expect(voiceErrorKindFor('not-allowed')).toBe('permission');
    expect(voiceErrorKindFor('language-not-supported')).toBe('unavailable');
    expect(voiceErrorKindFor('no-speech')).toBe('noSpeech');
    expect(voiceErrorKindFor('network')).toBe('network');
    expect(voiceErrorKindFor('interrupted')).toBe('interrupted');
    expect(voiceErrorKindFor('something-new')).toBe('generic');
  });
});

describe('shouldFallBackToServer', () => {
  it('only retries an on-device attempt without results', () => {
    expect(shouldFallBackToServer('language-not-supported', true, false)).toBe(
      true,
    );
    expect(shouldFallBackToServer('service-not-allowed', true, false)).toBe(
      true,
    );
    expect(shouldFallBackToServer('language-not-supported', false, false)).toBe(
      false,
    );
    expect(shouldFallBackToServer('language-not-supported', true, true)).toBe(
      false,
    );
    expect(shouldFallBackToServer('network', true, false)).toBe(false);
  });
});

describe('releaseAction', () => {
  it('distinguishes hold and tap', () => {
    expect(releaseAction(true, HOLD_THRESHOLD_MS + 50)).toBe('stop');
    expect(releaseAction(true, 120)).toBe('keep');
    expect(releaseAction(false, 50)).toBe('stop');
  });
});
