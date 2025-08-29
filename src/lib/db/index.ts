import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';
import { conversations, messages, settings } from './schema';

// Create database file in project root
const dbPath = path.join(process.cwd(), 'scope.db');
const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrent access
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, {
  schema: {
    conversations,
    messages,
    settings,
  },
});

// Auto-migrate on import
try {
  migrate(db, { migrationsFolder: './drizzle' });
} catch (_error) {
  // Migrations folder might not exist yet, that's ok
  console.log('Migrations not found, database will be created on first use');
}

export * from './schema';