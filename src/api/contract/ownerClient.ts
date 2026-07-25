import type { SupabaseClient } from '@supabase/supabase-js';

import { assertRc2Rpc, resolveRequiredOwnerTable } from '@/api/contract/ownerSurfaces';
import { DomainError } from '@/lib/errors';
import type { TypedSupabaseClient } from '@/lib/supabase';

/**
 * Minimal owner-schema typing for rc.2 tables. Local `database.generated.ts`
 * still describes Mobile proposal tables; live queries must not use those names.
 */
export type OwnerSchema = {
  public: {
    Tables: Record<
      string,
      {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      }
    >;
    Views: Record<string, never>;
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type OwnerSupabaseClient = SupabaseClient<OwnerSchema>;

function asOwnerClient(client: TypedSupabaseClient): OwnerSupabaseClient {
  // Widen only the Database generic — never `any`.
  return client as unknown as OwnerSupabaseClient;
}

/**
 * Mandatory contract adapter: maps logical Mobile names → owner tables and
 * refuses non-rc.2 surfaces.
 */
export function fromOwnerTable(client: TypedSupabaseClient, logicalOrOwner: string) {
  try {
    const table = resolveRequiredOwnerTable(logicalOrOwner);
    return asOwnerClient(client).from(table);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith('CONTRACT_SURFACE_UNAVAILABLE:')) {
      throw DomainError.configuration(message, { details: { surface: message.split(':')[1] } });
    }
    throw error;
  }
}

export function rpcOwner(
  client: TypedSupabaseClient,
  logicalOrOwnerRpc: string,
  args?: Record<string, unknown>,
) {
  try {
    const fn = assertRc2Rpc(logicalOrOwnerRpc);
    return asOwnerClient(client).rpc(fn, args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith('CONTRACT_SURFACE_UNAVAILABLE')) {
      throw DomainError.configuration(message, {
        details: { surface: message.split(':').slice(1).join(':') },
      });
    }
    throw error;
  }
}

export function isContractSurfaceUnavailable(error: unknown): boolean {
  return (
    error instanceof DomainError &&
    error.code === 'CONFIGURATION' &&
    typeof error.message === 'string' &&
    error.message.includes('CONTRACT_SURFACE_UNAVAILABLE')
  );
}
