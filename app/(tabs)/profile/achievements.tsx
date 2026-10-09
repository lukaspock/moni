import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/brand';
import { Reveal } from '@/components/motion';
import { Pill } from '@/components/ui';
import {
  achievementDef,
  type AchievementCategory,
  type AchievementId,
  type AchievementStatus,
} from '@/domain';
import { useRhythm, useAchievements } from '@/features/rhythm';
import { achievementCopy } from '@/features/review';
import { haptic } from '@/lib/haptics';
import { textStyles } from '@/theme/typography';

const CATEGORIES: AchievementCategory[] = [
  'training',
  'nutrition',
  'consistency',
  'body',
  'explorer',
];

type BadgeName = 'firstLog' | 'rhythm7' | 'ringClosed';
const BADGE_BY_CATEGORY: Record<AchievementCategory, BadgeName> = {
  training: 'ringClosed',
  nutrition: 'firstLog',
  consistency: 'rhythm7',
  body: 'ringClosed',
  explorer: 'firstLog',
};

/** Stamp shelf: grid of seals (unlocked / locked / hidden) with a detail sheet. */
export default function AchievementsScreen() {
  const { t, i18n } = useTranslation();
  const { statuses, unlockedCount, total, isReady } = useAchievements();
  const { careFlagged } = useRhythm();
  const copy = achievementCopy(t);
  const [selected, setSelected] = useState<AchievementStatus | null>(null);

  const categoryLabel: Record<AchievementCategory, string> = {
    training: t('achievements.category.training'),
    nutrition: t('achievements.category.nutrition'),
    consistency: t('achievements.category.consistency'),
    body: t('achievements.category.body'),
    explorer: t('achievements.category.explorer'),
  };
  const rarityLabel = {
    common: t('achievements.rarity.common'),
    rare: t('achievements.rarity.rare'),
    special: t('achievements.rarity.special'),
  } as const;

  const fmtDate = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString(i18n.language, {
      dateStyle: 'medium',
    });

  const nameOf = (s: AchievementStatus) => {
    const def = achievementDef(s.id as AchievementId);
    return def.hidden && !s.unlocked
      ? t('achievements.hidden.name')
      : copy[s.id].name;
  };
  const descOf = (s: AchievementStatus) => {
    const def = achievementDef(s.id as AchievementId);
    return def.hidden && !s.unlocked
      ? t('achievements.hidden.desc')
      : copy[s.id].desc;
  };

  const sel = selected;
  const selDef = sel ? achievementDef(sel.id) : null;

  return (
    <ScrollView
      className="bg-bg flex-1"
      contentContainerClassName="gap-6 px-4 pb-12 pt-4"
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text className="text-label-secondary" style={textStyles.callout}>
        {t('achievements.shelf.count', { unlocked: unlockedCount, total })}
      </Text>
      {isReady && unlockedCount === 0 ? (
        <Text className="text-label" style={textStyles.body}>
          {t('achievements.shelf.empty')}
        </Text>
      ) : null}
      {CATEGORIES.map((cat) => {
        const items = statuses.filter(
          (s) => achievementDef(s.id as AchievementId).category === cat,
        );
        if (items.length === 0) return null;
        return (
          <View key={cat} className="gap-3">
            <Text
              className="text-label-secondary px-1"
              style={textStyles.overline}
            >
              {categoryLabel[cat]}
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {items.map((s, i) => {
                const earned = s.unlocked;
                return (
                  <Reveal key={s.id} index={i} style={{ width: '30.5%' }}>
                    <Pressable
                      onPress={() => {
                        haptic.tapLight();
                        setSelected(s);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${nameOf(s)}. ${
                        earned ? '' : t('achievements.shelf.locked')
                      }`}
                      className="bg-surface items-center gap-2 rounded-2xl px-2 py-3"
                      style={{ borderCurve: 'continuous' }}
                    >
                      <Badge
                        name={BADGE_BY_CATEGORY[cat]}
                        size={64}
                        earned={earned}
                      />
                      <Text
                        numberOfLines={2}
                        maxFontSizeMultiplier={1.2}
                        className={
                          earned
                            ? 'text-label text-center'
                            : 'text-label-secondary text-center'
                        }
                        style={textStyles.caption}
                      >
                        {nameOf(s)}
                      </Text>
                    </Pressable>
                  </Reveal>
                );
              })}
            </View>
          </View>
        );
      })}

      <Modal
        visible={sel != null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelected(null)}
      >
        {sel && selDef ? (
          <View className="bg-bg flex-1 items-center gap-4 p-6">
            <Badge
              name={BADGE_BY_CATEGORY[selDef.category]}
              size={120}
              earned={sel.unlocked}
            />
            <Text
              accessibilityRole="header"
              className="text-label text-center"
              style={textStyles.title}
            >
              {nameOf(sel)}
            </Text>
            <View className="flex-row gap-2">
              <Pill label={categoryLabel[selDef.category]} tone="neutral" />
              <Pill label={rarityLabel[selDef.rarity]} tone="accent" />
            </View>
            <Text
              className="text-label-secondary text-center"
              style={textStyles.body}
            >
              {descOf(sel)}
            </Text>
            {sel.unlocked ? (
              <>
                <Text
                  className="text-label text-center"
                  style={textStyles.body}
                >
                  {copy[sel.id].celebrate}
                </Text>
                {sel.unlockedOn ? (
                  <Text
                    className="text-label-secondary"
                    style={textStyles.caption}
                  >
                    {t('achievements.shelf.unlockedOn', {
                      date: fmtDate(sel.unlockedOn),
                    })}
                  </Text>
                ) : null}
              </>
            ) : sel.progress && !(careFlagged && selDef.weightRelated) ? (
              <Text className="text-label-secondary" style={textStyles.callout}>
                {t('achievements.shelf.progress', {
                  current: Math.floor(sel.progress.current),
                  target: sel.progress.target,
                })}
              </Text>
            ) : null}
            <Pressable
              onPress={() => setSelected(null)}
              accessibilityRole="button"
              className="bg-surface-raised mt-4 min-h-12 items-center justify-center self-stretch rounded-full"
            >
              <Text className="text-label" style={textStyles.button}>
                {t('achievements.shelf.close')}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </Modal>
    </ScrollView>
  );
}
