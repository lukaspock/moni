import type { TFunction } from 'i18next';

import type { ShareCardModel } from '@/domain';

/**
 * Plain-text share content from a privacy-filtered share-card model (docs/05 §7). Image sharing would
 * need a native view-capture package; the text carries only what the model allows.
 */
export function buildShareText(
  t: TFunction,
  model: ShareCardModel,
  title: string,
  stageName: string | null,
  unit: string,
): string {
  const lines: string[] = [
    model.name
      ? t('insights.review.share.ofName', { name: model.name, title })
      : title,
  ];
  for (const stat of model.stats) {
    switch (stat.key) {
      case 'trainingDays':
        lines.push(
          t('insights.review.share.stat.trainingDays', { value: stat.value }),
        );
        break;
      case 'foodDays':
        lines.push(
          t('insights.review.share.stat.foodDays', { value: stat.value }),
        );
        break;
      case 'proteinDays':
        lines.push(
          t('insights.review.share.stat.proteinDays', { value: stat.value }),
        );
        break;
      case 'avgProteinG':
        lines.push(
          t('insights.review.share.stat.avgProteinG', { value: stat.value }),
        );
        break;
      case 'trendDelta':
        lines.push(
          t('insights.review.share.stat.trendDelta', {
            value: stat.value,
            unit,
          }),
        );
        break;
      case 'rhythmWeeks':
        lines.push(
          t('insights.review.share.stat.rhythmWeeks', { value: stat.value }),
        );
        break;
    }
  }
  if (stageName) lines.push(stageName);
  lines.push('', t('insights.review.share.tagline'));
  return lines.join('\n');
}
