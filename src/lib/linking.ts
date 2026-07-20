/**
 * Deep link parsing — whitelist only vdbdigital.nl /app/* paths and custom scheme.
 */

export type DeepLinkTarget =
  | { type: 'login' }
  | { type: 'register' }
  | { type: 'resetPassword'; token?: string }
  | { type: 'verifyEmail'; token?: string }
  | { type: 'project'; id: string }
  | { type: 'message'; id: string }
  | { type: 'quote'; id: string }
  | { type: 'invoice'; id: string }
  | { type: 'document'; id: string }
  | { type: 'partner' }
  | { type: 'admin' }
  | { type: 'home' }
  | { type: 'paymentReturn'; invoiceId?: string; paymentId?: string }
  | { type: 'unknown'; reason: string };

const ALLOWED_HOSTS = new Set(['vdbdigital.nl', 'www.vdbdigital.nl']);
const CUSTOM_SCHEME = 'vdbdigital';

function isAllowedHost(host: string): boolean {
  return ALLOWED_HOSTS.has(host.toLowerCase());
}

function parseAppPath(pathname: string, searchParams: URLSearchParams): DeepLinkTarget {
  const normalized = pathname.replace(/^\/app\/?/, '/').replace(/\/+$/, '') || '/';
  const segments = normalized.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { type: 'home' };
  }

  const [root, id] = segments;

  switch (root) {
    case 'login':
      return { type: 'login' };
    case 'register':
      return { type: 'register' };
    case 'reset-password':
      return { type: 'resetPassword', token: searchParams.get('token') ?? undefined };
    case 'verify-email':
      return { type: 'verifyEmail', token: searchParams.get('token') ?? undefined };
    case 'projects':
      return id ? { type: 'project', id } : { type: 'home' };
    case 'messages':
      return id ? { type: 'message', id } : { type: 'home' };
    case 'quotes':
      return id ? { type: 'quote', id } : { type: 'home' };
    case 'invoices':
      return id ? { type: 'invoice', id } : { type: 'home' };
    case 'documents':
      return id ? { type: 'document', id } : { type: 'home' };
    case 'partner':
      return { type: 'partner' };
    case 'admin':
      return { type: 'admin' };
    case 'payments':
    case 'checkout':
    case 'payment-return': {
      // /app/payments/return?invoiceId=… or /app/checkout/return
      const invoiceId =
        searchParams.get('invoiceId') ?? searchParams.get('invoice_id') ?? undefined;
      const paymentId =
        searchParams.get('paymentId') ?? searchParams.get('payment_id') ?? undefined;
      if (id === 'return' || root === 'payment-return') {
        return { type: 'paymentReturn', invoiceId, paymentId };
      }
      return { type: 'paymentReturn', invoiceId: id ?? invoiceId, paymentId };
    }
    default:
      return { type: 'unknown', reason: `unmapped_path:${normalized}` };
  }
}

/**
 * Parse a URL into a typed deep-link target.
 * Only allows https://vdbdigital.nl/app/* and vdbdigital://* .
 * Rejects non-whitelisted hosts and open-redirect query params.
 */
export function parseAppDeepLink(url: string): DeepLinkTarget {
  try {
    const parsed = new URL(url);

    if (parsed.protocol === `${CUSTOM_SCHEME}:`) {
      // vdbdigital://app/projects/123 or vdbdigital://projects/123
      const path = parsed.hostname
        ? `/${parsed.hostname}${parsed.pathname}`
        : parsed.pathname;
      return parseAppPath(path.startsWith('/app') ? path : `/app${path}`, parsed.searchParams);
    }

    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      if (!isAllowedHost(parsed.hostname)) {
        return { type: 'unknown', reason: `host_not_allowed:${parsed.hostname}` };
      }
      if (!parsed.pathname.startsWith('/app')) {
        return { type: 'unknown', reason: `path_not_allowed:${parsed.pathname}` };
      }
      // Ignore open redirect params
      if (parsed.searchParams.has('redirect') || parsed.searchParams.has('returnUrl')) {
        parsed.searchParams.delete('redirect');
        parsed.searchParams.delete('returnUrl');
      }
      return parseAppPath(parsed.pathname, parsed.searchParams);
    }

    return { type: 'unknown', reason: `protocol_not_allowed:${parsed.protocol}` };
  } catch {
    return { type: 'unknown', reason: 'invalid_url' };
  }
}

/** @deprecated Prefer parseAppDeepLink */
export const parseDeepLink = parseAppDeepLink;

export function deepLinkToHref(target: DeepLinkTarget): string | null {
  switch (target.type) {
    case 'login':
      return '/(auth)/login';
    case 'register':
      return '/(auth)/register';
    case 'resetPassword':
      return '/(auth)/reset-password';
    case 'verifyEmail':
      return '/(auth)/verify-email';
    case 'project':
      return `/(customer)/projects/${target.id}`;
    case 'message':
      return `/(customer)/messages/${target.id}`;
    case 'quote':
      return `/(customer)/quotes/${target.id}`;
    case 'invoice':
      return `/(customer)/invoices/${target.id}`;
    case 'document':
      return `/(customer)/documents/${target.id}`;
    case 'partner':
      return '/(partner)/dashboard';
    case 'admin':
      return '/(admin)/dashboard';
    case 'home':
      return '/(customer)/home';
    case 'paymentReturn':
      return target.invoiceId
        ? `/(customer)/invoices/${target.invoiceId}`
        : '/(customer)/invoices';
    case 'unknown':
      return null;
  }
}

export { ALLOWED_HOSTS, CUSTOM_SCHEME };
