import { delay, mockConversations, mockMessages } from '@/features/_shared/mockData';
import type { Conversation, Message } from '@/types';

export interface MessagesRepository {
  listConversations(): Promise<Conversation[]>;
  listMessages(conversationId: string): Promise<Message[]>;
  sendMessage(conversationId: string, body: string): Promise<Message>;
}

class MockMessagesRepository implements MessagesRepository {
  async listConversations(): Promise<Conversation[]> {
    await delay();
    return [...mockConversations];
  }

  async listMessages(conversationId: string): Promise<Message[]> {
    await delay();
    return mockMessages.filter((message) => message.conversationId === conversationId);
  }

  async sendMessage(conversationId: string, body: string): Promise<Message> {
    await delay();
    const message: Message = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId: 'mock-user-1',
      senderName: 'Demo Gebruiker',
      body,
      deliveryStatus: 'sent',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockMessages.push(message);
    return message;
  }
}

export function createMessagesRepository(): MessagesRepository {
  // Supabase realtime wiring comes later — mock is safe default when env missing
  return new MockMessagesRepository();
}
