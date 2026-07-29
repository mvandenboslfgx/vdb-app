import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { getWhatsAppConfig } from '@/config/whatsapp';
import { alertWhatsAppUnavailable, openConfiguredWhatsApp } from '@/lib/whatsapp';

/** Shared WhatsApp row behavior for Customer / Partner / Admin Meer. */
export function useWhatsAppContact() {
  const { t } = useTranslation('messages');
  const { i18n } = useTranslation();
  const config = getWhatsAppConfig();

  const open = useCallback(async () => {
    const result = await openConfiguredWhatsApp({ locale: i18n.language });
    if (!result.ok) {
      alertWhatsAppUnavailable(result.reason, {
        disabledTitle: t('whatsapp'),
        disabledBody: t('whatsappUnavailable'),
        failedTitle: t('whatsapp'),
        failedBody: t('whatsappOpenFailed'),
      });
    }
  }, [i18n.language, t]);

  return {
    enabled: config.enabled,
    title: t('whatsapp'),
    subtitle: config.enabled ? t('whatsappHint') : t('whatsappUnavailable'),
    open,
  };
}
