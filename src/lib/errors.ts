/**
 * Domain-level error type for repository / API failures.
 *
 * Rule: `toUserMessage()` must NEVER leak raw SQL / Postgrest internals to the UI.
 * The raw `message` (which may contain those details) stays on the Error for
 * logging/observability only.
 */
export type DomainErrorCode =
  | 'CONFIGURATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'NETWORK'
  | 'UNKNOWN';

export interface DomainErrorOptions {
  cause?: unknown;
  details?: Record<string, unknown>;
}

const USER_MESSAGES: Record<DomainErrorCode, string> = {
  CONFIGURATION: 'This feature is not available right now. Please try again later.',
  UNAUTHORIZED: 'Please sign in to continue.',
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: 'We could not find what you were looking for.',
  VALIDATION: 'Please check your input and try again.',
  NETWORK: 'Connection problem. Please check your internet and try again.',
  UNKNOWN: 'Something went wrong. Please try again.',
};

/** Postgrest / PostgreSQL error codes that map to a well-known DomainErrorCode. */
const POSTGRES_CODE_MAP: Record<string, DomainErrorCode> = {
  PGRST116: 'NOT_FOUND', // no rows returned by .single()/.maybeSingle()
  PGRST301: 'UNAUTHORIZED', // JWT expired / invalid
  '42501': 'FORBIDDEN', // insufficient_privilege (RLS denial)
  '28000': 'UNAUTHORIZED', // invalid_authorization_specification
  '28P01': 'UNAUTHORIZED', // invalid_password
  '23505': 'VALIDATION', // unique_violation
  '23503': 'VALIDATION', // foreign_key_violation
  '23514': 'VALIDATION', // check_violation
  '22P02': 'VALIDATION', // invalid_text_representation
};

/**
 * Owner RPC exception codes (rc.3 messaging/support/appointments) that are
 * raised as plain `RAISE EXCEPTION 'CODE:detail'` messages rather than
 * Postgres error codes. Order matters -- checked top to bottom, first match wins.
 */
const RPC_MESSAGE_CODE_MAP: readonly (readonly [string, DomainErrorCode])[] = [
  ['FEATURE_DISABLED', 'CONFIGURATION'],
  ['NOT_PARTICIPANT', 'FORBIDDEN'],
  ['DOUBLE_BOOKING', 'VALIDATION'],
  ['INTERNAL_LEAK_DENIED', 'FORBIDDEN'],
  ['INVALID_TRANSITION', 'VALIDATION'],
  ['IDEMPOTENCY_CONFLICT', 'VALIDATION'],
  ['AUTH_REQUIRED', 'UNAUTHORIZED'],
  ['AUTH_NO_ACCESS', 'FORBIDDEN'],
  ['VALIDATION_FAILED', 'VALIDATION'],
  ['CONFLICT', 'VALIDATION'],
  ['FORBIDDEN', 'FORBIDDEN'],
  ['NOT_FOUND', 'NOT_FOUND'],
];

function mapRpcMessageToCode(message: string): DomainErrorCode | undefined {
  for (const [needle, code] of RPC_MESSAGE_CODE_MAP) {
    if (message.includes(needle)) return code;
  }
  return undefined;
}

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly details?: Record<string, unknown>;
  override readonly cause?: unknown;

  constructor(code: DomainErrorCode, message: string, options: DomainErrorOptions = {}) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.cause = options.cause;
    this.details = options.details;
  }

  /** Safe, generic copy for end users. Never includes SQL / stack traces. */
  toUserMessage(): string {
    return USER_MESSAGES[this.code] ?? USER_MESSAGES.UNKNOWN;
  }

  static configuration(message: string, options?: DomainErrorOptions): DomainError {
    return new DomainError('CONFIGURATION', message, options);
  }

  static unauthorized(message = 'Not authenticated', options?: DomainErrorOptions): DomainError {
    return new DomainError('UNAUTHORIZED', message, options);
  }

  static forbidden(message = 'Not allowed', options?: DomainErrorOptions): DomainError {
    return new DomainError('FORBIDDEN', message, options);
  }

  static notFound(message = 'Not found', options?: DomainErrorOptions): DomainError {
    return new DomainError('NOT_FOUND', message, options);
  }

  static validation(message: string, options?: DomainErrorOptions): DomainError {
    return new DomainError('VALIDATION', message, options);
  }
}

interface SupabaseLikeError {
  message?: string;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
}

function isSupabaseLikeError(value: unknown): value is SupabaseLikeError {
  return typeof value === 'object' && value !== null && 'message' in value;
}

/**
 * Convert a Supabase/Postgrest error (or unknown thrown value) into a DomainError.
 * Never returns a mock value — always represents the failure as an error.
 */
export function fromSupabaseError(
  error: unknown,
  fallbackCode: DomainErrorCode = 'UNKNOWN',
): DomainError {
  if (error instanceof DomainError) return error;

  if (isSupabaseLikeError(error)) {
    const message = error.message ?? 'Request failed';
    const code =
      (error.code ? POSTGRES_CODE_MAP[error.code] : undefined) ??
      mapRpcMessageToCode(message) ??
      fallbackCode;
    return new DomainError(code, message, {
      details: error.code ? { pgCode: error.code } : undefined,
      cause: error,
    });
  }

  if (error instanceof Error) {
    const code = mapRpcMessageToCode(error.message) ?? fallbackCode;
    return new DomainError(code, error.message, { cause: error });
  }

  return new DomainError(fallbackCode, 'Unknown error', { cause: error });
}
