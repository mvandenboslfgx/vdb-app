import { mockStore } from '@/api/mockData';
import { delay, shouldUseMockApi } from '@/api/repositories/_utils';
import { DomainError } from '@/lib/errors';
import type { Conversation, Message } from '@/types/domain';

export async function listConversations(): Promise<Conversation[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.conversations];
  }
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:conversations');
}

export async function getConversation(id: string): Promise<Conversation | null> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.conversations.find((c) => c.id === id) ?? null;
  }
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:conversations');
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.messages.filter((m) => m.conversationId === conversationId);
  }
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:conversations');
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

  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:conversations');
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
