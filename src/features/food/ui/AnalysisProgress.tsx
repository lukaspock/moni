import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { TideLoader } from '@/components/motion';

export type AnalysisKind = 'photo' | 'text' | 'barcode' | 'label' | 'other';

/** Milliseconds between two phase texts. */
const PHASE_MS = 2600;
/** After this many ticks without a result the "takes a bit longer" line wins. */
const PATIENCE_TICK = 5;

type PhaseKey =
  | 'photoStart'
  | 'ingredients'
  | 'portions'
  | 'calculating'
  | 'text'
  | 'barcode'
  | 'label'
  | 'patience';

const SEQUENCE: Record<AnalysisKind, PhaseKey[]> = {
  photo: ['photoStart', 'ingredients', 'portions', 'calculating'],
  text: ['text', 'ingredients', 'portions', 'calculating'],
  barcode: ['barcode'],
  label: ['label', 'calculating'],
  other: ['calculating'],
};

/** Rotating, progressive phase text (never loops back; ends on "calculating" / "patience"). */
export function useAnalysisPhase(kind: AnalysisKind, active = true): string {
  const { t } = useTranslation();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((n) => n + 1), PHASE_MS);
    return () => clearInterval(id);
  }, [active]);

  const sequence = SEQUENCE[kind];
  const key: PhaseKey =
    tick >= PATIENCE_TICK
      ? 'patience'
      : sequence[Math.min(tick, sequence.length - 1)]!;

  switch (key) {
    case 'photoStart':
      return t('identity.ai.photoStart');
    case 'ingredients':
      return t('identity.ai.ingredients');
    case 'portions':
      return t('identity.ai.portions');
    case 'calculating':
      return t('identity.ai.calculating');
    case 'text':
      return t('identity.ai.text');
    case 'barcode':
      return t('identity.ai.barcode');
    case 'label':
      return t('identity.ai.label');
    case 'patience':
      return t('identity.ai.patience');
  }
}

/** TideLoader + rotating phase text (the TideLoader also uses it as accessibility label). */
export function AnalysisProgress({
  kind,
  size = 160,
}: {
  kind: AnalysisKind;
  size?: number;
}) {
  const phase = useAnalysisPhase(kind);
  return (
    <View className="items-center py-12">
      <TideLoader size={size} phase={phase} />
    </View>
  );
}
