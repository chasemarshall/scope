import { desc, eq } from 'drizzle-orm';
import { db, conversations, messages, settings, type Conversation, type Message, type NewConversation, type NewMessage, type Setting } from './index';
import { nanoid } from 'nanoid';

export class ChatService {
  // Conversations
  static async createConversation(title: string): Promise<Conversation> {
    const id = nanoid();
    const [conversation] = await db
      .insert(conversations)
      .values({
        id,
        title,
      })
      .returning();
    return conversation;
  }

  static async getConversations(): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.updatedAt));
  }

  static async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);
    return conversation;
  }

  static async updateConversationTitle(id: string, title: string): Promise<void> {
    await db
      .update(conversations)
      .set({ 
        title, 
        updatedAt: new Date() 
      })
      .where(eq(conversations.id, id));
  }

  static async deleteConversation(id: string): Promise<void> {
    await db
      .delete(conversations)
      .where(eq(conversations.id, id));
  }

  // Messages
  static async addMessage(conversationId: string, role: 'user' | 'assistant', content: string): Promise<Message> {
    const id = nanoid();
    
    // Update conversation's updatedAt timestamp
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    const [message] = await db
      .insert(messages)
      .values({
        id,
        conversationId,
        role,
        content,
      })
      .returning();
    
    return message;
  }

  static async getMessages(conversationId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  static async deleteMessages(conversationId: string): Promise<void> {
    await db
      .delete(messages)
      .where(eq(messages.conversationId, conversationId));
  }

  // Settings
  static async getSetting(key: string): Promise<string | null> {
    const [setting] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);
    return setting?.value ?? null;
  }

  static async setSetting(key: string, value: string): Promise<void> {
    await db
      .insert(settings)
      .values({
        key,
        value,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value,
          updatedAt: new Date(),
        },
      });
  }

  static async deleteSetting(key: string): Promise<void> {
    await db
      .delete(settings)
      .where(eq(settings.key, key));
  }
}