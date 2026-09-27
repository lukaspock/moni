import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '../../../src/components/ui/PlaceholderScreen';

export default function TrainingScreen() {
  const { t } = useTranslation();

  return (
    <PlaceholderScreen
      title={t('training.title')}
      description={t('training.placeholder')}
    />
  );
}
