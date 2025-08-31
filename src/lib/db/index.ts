import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { conversations, messages, settings } from './schema';

// Initialize Neon database connection
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, {
  schema: {
    conversations,
    messages,
    settings,
  },
});

console.log('Database connected - using Neon PostgreSQL');

export * from './schema';