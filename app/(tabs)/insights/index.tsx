import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '../../../src/components/ui/PlaceholderScreen';

export default function InsightsScreen() {
  const { t } = useTranslation();

  return (
    <PlaceholderScreen
      title={t('insights.title')}
      description={t('insights.placeholder')}
    />
  );
}
