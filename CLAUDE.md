# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev`: Start development server at http://localhost:3000
- `npm run build`: Create production build  
- `npm start`: Run production build locally
- `npm run lint`: Run ESLint with Next.js and TypeScript rules
- `npx drizzle-kit generate`: Generate database migrations
- `npx drizzle-kit migrate`: Apply database migrations

## Architecture Overview

This is a Next.js 15 voice chat application with real-time communication capabilities:

### Core Structure
- **App Router**: Uses Next.js App Router with routes in `src/app/`
- **Database**: SQLite with Drizzle ORM for chat persistence
  - `conversations` table: Chat sessions with titles and timestamps
  - `messages` table: Individual messages linked to conversations
  - `settings` table: Application configuration
- **Real-time**: OpenAI Realtime API integration for voice interactions
- **AI Integration**: OpenAI GPT models for chat responses

### Key Components
- `VoiceChat`: Main voice interaction component with recording/playback
- `Chat`: Text-based chat interface with message history
- `Composer`: Text input component for chat messages
- `AppShell`/`AppHeader`: Layout components

### API Routes
- `api/chat/`: Text chat with OpenAI GPT
- `api/chat/realtime/session/`: WebSocket session management for voice
- `api/transcribe/`: Audio transcription service
- `api/conversations/`: CRUD operations for chat history
- `api/settings/`: Application configuration management

### Database Integration
Database connection and queries are centralized in `src/lib/db/`:
- `schema.ts`: Drizzle table definitions and TypeScript types
- `queries.ts`: Reusable database operations
- `index.ts`: Database connection setup

### Styling
- Tailwind CSS with dark theme by default
- Framer Motion for animations
- Lucide React for icons

## Environment Requirements

Required environment variables in `.env.local`:
- `OPENAI_API_KEY`: OpenAI API key for chat and voice features