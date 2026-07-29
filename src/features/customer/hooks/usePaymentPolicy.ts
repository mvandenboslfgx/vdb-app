import { Platform } from 'react-native';

import { evaluatePaymentPolicy } from '@/security/paymentPolicy';
import { getFeatureFlags } from '@/security/featureFlags';
import type { ProductCategory } from '@/types/domain';

export function useInvoicePaymentPolicy(productCategory: ProductCategory = 'service') {
  const flags = getFeatureFlags();
  const platform = Platform.OS === 'android' ? 'android' : Platform.OS === 'ios' ? 'ios' : 'web';

  return evaluatePaymentPolicy({
    productType: productCategory,
    platform,
    mollieCheckoutEnabled: flags.mollieCheckout,
    digitalProductCheckoutEnabled: flags.digitalProductCheckout,
  });
}
