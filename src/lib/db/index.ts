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

// Initialize database tables if they don't exist
try {
  // Create tables manually since we might not have migrations
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
      updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()) NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
    );
  `);
  console.log('Database tables initialized');
} catch (error) {
  console.error('Failed to initialize database:', error);
}

// Try to migrate if migrations exist
try {
  migrate(db, { migrationsFolder: './drizzle' });
} catch (_error) {
  // Migrations folder might not exist yet, that's ok
  console.log('No migrations to apply');
}

export * from './schema';