import { nanoid } from 'nanoid';

// Temporary in-memory storage for development
// In production, replace this with a proper database
const storage = {
  settings: new Map<string, string>(),
  conversations: new Map<string, any>(),
  messages: new Map<string, any[]>(),
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Message = {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
};

export class ChatService {
  // Settings - simplified for now
  static async getSetting(key: string): Promise<string | null> {
    return storage.settings.get(key) || null;
  }

  static async setSetting(key: string, value: string): Promise<void> {
    storage.settings.set(key, value);
  }

  static async deleteSetting(key: string): Promise<void> {
    storage.settings.delete(key);
  }

  // Conversations - simplified for now
  static async createConversation(title: string): Promise<Conversation> {
    const id = nanoid();
    const conversation = {
      id,
      title,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    storage.conversations.set(id, conversation);
    return conversation;
  }

  static async getConversations(): Promise<Conversation[]> {
    return Array.from(storage.conversations.values()).sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  static async getConversation(id: string): Promise<Conversation | undefined> {
    return storage.conversations.get(id);
  }

  static async updateConversationTitle(id: string, title: string): Promise<void> {
    const conversation = storage.conversations.get(id);
    if (conversation) {
      conversation.title = title;
      conversation.updatedAt = new Date();
      storage.conversations.set(id, conversation);
    }
  }

  static async deleteConversation(id: string): Promise<void> {
    storage.conversations.delete(id);
    storage.messages.delete(id);
  }

  // Messages - simplified for now
  static async addMessage(conversationId: string, role: 'user' | 'assistant', content: string): Promise<Message> {
    const id = nanoid();
    const message = {
      id,
      conversationId,
      role,
      content,
      createdAt: new Date(),
    };

    if (!storage.messages.has(conversationId)) {
      storage.messages.set(conversationId, []);
    }
    storage.messages.get(conversationId)!.push(message);

    // Update conversation timestamp
    const conversation = storage.conversations.get(conversationId);
    if (conversation) {
      conversation.updatedAt = new Date();
      storage.conversations.set(conversationId, conversation);
    }

    return message;
  }

  static async getMessages(conversationId: string): Promise<Message[]> {
    return storage.messages.get(conversationId) || [];
  }

  static async deleteMessages(conversationId: string): Promise<void> {
    storage.messages.delete(conversationId);
  }
}