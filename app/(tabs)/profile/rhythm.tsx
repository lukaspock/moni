import { ScrollView } from 'react-native';

import { RhythmSettingsGroup, StageCard } from '@/features/review';

/** Rhythm: current stage with progress, display switch, grace weeks and pause mode. */
export default function ProfileRhythmScreen() {
  return (
    <ScrollView
      className="bg-bg flex-1"
      contentContainerClassName="px-4 pb-12 pt-4"
    >
      <StageCard />
      <RhythmSettingsGroup />
    </ScrollView>
  );
}
