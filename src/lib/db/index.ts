// For now, we'll use a simple in-memory storage for development
// In production, this would need to be replaced with a proper database
// like Vercel Postgres, PlanetScale, or similar

import { conversations, messages, settings } from './schema';

// Mock database for development - replace with real DB in production
const mockDb = {
  settings: new Map<string, string>(),
  conversations: new Map<string, any>(),
  messages: new Map<string, any[]>(),
};

// Export mock db for now
export const db = {
  select: () => ({
    from: (table: any) => ({
      where: (condition: any) => ({
        limit: (n: number) => mockDb.settings.size ? [{ value: mockDb.settings.values().next().value }] : [],
        orderBy: (order: any) => [],
      }),
      orderBy: (order: any) => [],
    }),
  }),
  insert: (table: any) => ({
    values: (data: any) => ({
      returning: () => [data],
      onConflictDoUpdate: (config: any) => ({}),
    }),
  }),
  update: (table: any) => ({
    set: (data: any) => ({
      where: (condition: any) => ({}),
    }),
  }),
  delete: (table: any) => ({
    where: (condition: any) => ({}),
  }),
};

console.log('Using mock database - replace with real database for production');

export * from './schema';