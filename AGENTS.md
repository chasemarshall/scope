# Repository Guidelines

## Project Structure & Module Organization
- `src/app`: App Router entry (`page.tsx`, `layout.tsx`, `globals.css`) and server routes in `src/app/api/**` (chat streaming, transcription, realtime session).
- `components`: UI building blocks (`ui/`, `layout/`, `chat/`). Prefer colocating small, reusable pieces here.
- `lib`: Utilities and helpers (add pure logic here to keep pages lean).
- `public`: Static assets served at the site root.
- Config: `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`.
- Env: `.env.local` for secrets (ignored), `.env.example` for documented keys.

## Build, Test, and Development Commands
- `npm run dev`: Start Next.js dev server at `http://localhost:3000`.
- `npm run build`: Production build (`.next/`).
- `npm start`: Run the production build locally.
- `npm run lint`: ESLint (uses `next/core-web-vitals` + TS rules).

## Coding Style & Naming Conventions
- Language: TypeScript + React (App Router). Indent 2 spaces; use double quotes.
- Components: `PascalCase.tsx` in `components/**`; default export component; define `Props` with `type`/`interface`.
- Pages/Routes: App Router under `src/app/**` (e.g., `src/app/api/chat/route.ts`).
- Styling: Tailwind CSS; prefer utility classes in `className` over ad‑hoc CSS.
- Linting: Keep `npm run lint` clean before pushing.

## Testing Guidelines
- No test runner is configured yet. If adding tests, prefer Vitest + React Testing Library.
- File names: `*.test.ts` / `*.test.tsx` colocated with the unit under `src/**`.
- Focus: pure helpers in `lib/`, UI behavior of components, and API route edge cases.

## Commit & Pull Request Guidelines
- Commits: Use Conventional Commits when possible (e.g., `feat:`, `fix:`, `chore:`). Write clear, present‑tense messages.
- PRs must include: concise description, linked issues, screenshots/gifs for UI, and a short testing note.
- Before opening a PR: `npm run lint` and `npm run build` should pass.

## Security & Configuration Tips
- Required env: `OPENAI_API_KEY` in `.env.local` (never commit secrets). Example:
  - `.env.local`: `OPENAI_API_KEY=sk‑...`
- Add any new env keys to `.env.example` with placeholder values.
- All OpenAI calls proxy through server routes in `src/app/api/**`; avoid exposing keys in the client.

