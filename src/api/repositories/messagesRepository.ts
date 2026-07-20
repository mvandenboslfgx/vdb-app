import { mockStore } from '@/api/mockData';
import { delay, shouldUseMockApi } from '@/api/repositories/_utils';
import { getSupabase } from '@/lib/supabase';
import type { Conversation, Message } from '@/types/domain';

export async function listConversations(): Promise<Conversation[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.conversations];
  }
  const supabase = getSupabase();
  if (!supabase) return [...mockStore.conversations];
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('last_message_at', { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Conversation[];
}

export async function getConversation(id: string): Promise<Conversation | null> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.conversations.find((c) => c.id === id) ?? null;
  }
  const supabase = getSupabase();
  if (!supabase) return mockStore.conversations.find((c) => c.id === id) ?? null;
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Conversation | null;
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.messages.filter((m) => m.conversationId === conversationId);
  }
  const supabase = getSupabase();
  if (!supabase) {
    return mockStore.messages.filter((m) => m.conversationId === conversationId);
  }
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Message[];
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
    throw new Error('Message body is required');
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

  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: input.conversationId,
      sender_id: input.senderId,
      body: trimmed,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Message;
}

export const messagesRepository = {
  listConversations,
  getConversation,
  listMessages,
  getMessages: listMessages,
  sendMessage,
  send: async (conversationId: string, body: string) =>
    sendMessage({
      conversationId,
      senderId: 'demo-customer-0001',
      senderName: 'You',
      body,
    }),
};
