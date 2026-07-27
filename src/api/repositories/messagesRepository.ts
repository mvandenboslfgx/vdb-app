import { mockStore } from '@/api/mockData';
import { fromOwnerTable, rpcOwner } from '@/api/contract/ownerClient';
import { mapPortalConversation, mapPortalMessage } from '@/api/contract/portalMappers';
import { delay, requireLiveSupabase, shouldUseMockApi } from '@/api/repositories/_utils';
import { DomainError, fromSupabaseError } from '@/lib/errors';
import type { Conversation, Message } from '@/types/domain';

type OwnerRow = Record<string, unknown>;

function isOwnerRow(value: unknown): value is OwnerRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * `conversation_type != 'INTERNAL'` is enforced server-side via RLS -- this
 * client-side filter is defense in depth only, never the sole guard.
 */
export async function listConversations(): Promise<Conversation[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.conversations];
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await fromOwnerTable(supabase, 'conversations')
    .select('*')
    .is('deleted_at', null)
    .neq('conversation_type', 'INTERNAL')
    .order('last_message_at', { ascending: false });
  if (error) throw fromSupabaseError(error);
  return (data ?? []).filter(isOwnerRow).map((row) => mapPortalConversation(row));
}

export async function getConversation(id: string): Promise<Conversation | null> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.conversations.find((c) => c.id === id) ?? null;
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await fromOwnerTable(supabase, 'conversations')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw fromSupabaseError(error);
  return data && isOwnerRow(data) ? mapPortalConversation(data) : null;
}

/**
 * `is_internal = false` is enforced server-side via RLS for non-staff
 * readers -- this client-side filter is defense in depth only, never the
 * sole guard against leaking internal notes to a customer.
 */
export async function listMessages(conversationId: string): Promise<Message[]> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.messages.filter((m) => m.conversationId === conversationId);
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await fromOwnerTable(supabase, 'messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .eq('is_internal', false)
    .order('created_at', { ascending: true });
  if (error) throw fromSupabaseError(error);
  return (data ?? []).filter(isOwnerRow).map(mapPortalMessage);
}

export async function sendMessage(input: {
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
}): Promise<Message>;
export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
  senderName?: string,
): Promise<Message>;
export async function sendMessage(
  inputOrConversationId:
    | {
        conversationId: string;
        senderId: string;
        senderName: string;
        body: string;
      }
    | string,
  senderId?: string,
  body?: string,
  senderName = 'You',
): Promise<Message> {
  const input =
    typeof inputOrConversationId === 'string'
      ? {
          conversationId: inputOrConversationId,
          senderId: senderId ?? 'demo-customer-0001',
          senderName,
          body: body ?? '',
        }
      : inputOrConversationId;

  const trimmed = input.body.trim();
  if (!trimmed) {
    throw DomainError.validation('Message body is required');
  }

  if (shouldUseMockApi()) {
    await delay();
    const message: Message = {
      id: `msg-${Date.now()}`,
      conversationId: input.conversationId,
      senderId: input.senderId,
      senderName: input.senderName,
      body: trimmed,
      deliveryStatus: 'sent',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockStore.messages.push(message);
    const conv = mockStore.conversations.find((c) => c.id === input.conversationId);
    if (conv) {
      conv.lastMessagePreview = trimmed;
      conv.lastMessageAt = message.createdAt;
      conv.updatedAt = message.createdAt;
    }
    return message;
  }

  const supabase = requireLiveSupabase();
  const { data, error } = await rpcOwner(supabase, 'send_message', {
    p_conversation_id: input.conversationId,
    p_body: trimmed,
  });
  if (error) throw fromSupabaseError(error);
  if (isOwnerRow(data)) return mapPortalMessage(data);

  const messageId = typeof data === 'string' ? data : null;
  if (messageId) {
    const { data: row, error: fetchError } = await fromOwnerTable(supabase, 'messages')
      .select('*')
      .eq('id', messageId)
      .maybeSingle();
    if (fetchError) throw fromSupabaseError(fetchError);
    if (row && isOwnerRow(row)) {
      return {
        ...mapPortalMessage(row),
        senderName: input.senderName || mapPortalMessage(row).senderName,
      };
    }
  }

  const now = new Date().toISOString();
  return {
    id: messageId ?? `msg-${Date.now()}`,
    conversationId: input.conversationId,
    senderId: input.senderId,
    senderName: input.senderName,
    body: trimmed,
    deliveryStatus: 'sent',
    createdAt: now,
    updatedAt: now,
  };
}

/** Marks a conversation read up to `readAt` (defaults server-side to now) via `mark_portal_conversation_read`. */
export async function markConversationRead(conversationId: string, readAt?: string): Promise<void> {
  if (shouldUseMockApi()) {
    await delay();
    return;
  }
  const supabase = requireLiveSupabase();
  const { error } = await rpcOwner(supabase, 'mark_conversation_read', {
    p_conversation_id: conversationId,
    p_read_at: readAt ?? undefined,
  });
  if (error) throw fromSupabaseError(error);
}

export const messagesRepository = {
  listConversations,
  getConversation,
  listMessages,
  getMessages: listMessages,
  sendMessage,
  markConversationRead,
  send: async (conversationId: string, body: string) =>
    sendMessage({
      conversationId,
      senderId: 'demo-customer-0001',
      senderName: 'You',
      body,
    }),
};
