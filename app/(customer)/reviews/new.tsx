import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Screen, Text, TextInput } from '@/design-system';
import { useSubmitReview } from '@/features/partner/hooks/usePartnerData';
import { screenStyles } from '@/features/shared/screenStyles';
import { colors, spacing } from '@/theme';

export default function NewReviewScreen() {
  const { t } = useTranslation('app');
  const submit = useSubmitReview();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [consent, setConsent] = useState(false);

  return (
    <Screen scroll>
      <View style={screenStyles.hero}>
        <Text variant="title">{t('customer.reviews.title')}</Text>
      </View>
      <View style={screenStyles.form}>
        <Text variant="label" color="textSecondary">
          {t('customer.reviews.rating')}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable
              key={value}
              onPress={() => setRating(value)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: value <= rating ? colors.champagneGold : colors.surfaceElevated,
              }}
            >
              <Text variant="label" color={value <= rating ? 'backgroundPrimary' : 'textSecondary'}>
                {value}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          label={t('customer.reviews.reviewTitle')}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          label={t('customer.reviews.body')}
          value={body}
          onChangeText={setBody}
          multiline
          style={{ minHeight: 120, textAlignVertical: 'top' }}
        />
        <Pressable onPress={() => setConsent((v) => !v)}>
          <Text variant="body" color={consent ? 'champagneGold' : 'textSecondary'}>
            {consent ? '✓ ' : '○ '}
            {t('customer.reviews.consent')}
          </Text>
        </Pressable>
        <Button
          title={t('customer.reviews.cta')}
          variant="gold"
          fullWidth
          loading={submit.isPending}
          disabled={!consent}
          onPress={() =>
            submit.mutate({
              projectId: 'proj-1',
              rating,
              title,
              body,
              publishConsent: consent,
            })
          }
        />
      </View>
    </Screen>
  );
}
