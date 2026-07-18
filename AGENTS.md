# Repository Guidelines

## Project Structure & Module Organization

- `src/app/`: pages, global styles, icons, and Node.js API routes.
- `src/components/`: client-side UI and broadcast controls.
- `src/lib/`: domain contracts, SQLite storage, production providers, playback logic, and co-located unit tests.
- `e2e/`: Playwright browser tests.
- `data/`: curated track catalog and schema documentation. Never commit SQLite files.
- `docs/`: product specifications, implementation plans, ADRs, discussions, and research notes.
- `generated/audio/` and `.crowdfm/`: ignored generated speech and runtime state.

Use the `@/` alias for imports from `src/`.

## Build, Test, and Development Commands

- `pnpm install`: install dependencies and approved native builds.
- `pnpm dev`: start the local development server at `http://localhost:3000`.
- `pnpm build`: create the production Next.js build.
- `pnpm start`: run the production build locally.
- `pnpm test`: run all Vitest unit and integration tests once.
- `pnpm test:watch`: run Vitest interactively.
- `pnpm lint`: run ESLint with Next.js Core Web Vitals and TypeScript rules.
- `pnpm typecheck`: run TypeScript without emitting files.
- `pnpm test:e2e`: build the application and run Playwright in installed Chrome.

## Coding Style & Naming Conventions

Use strict TypeScript, two-space indentation, double quotes, and semicolons. Validate untrusted input and provider output with Zod. Use `PascalCase` for components and types, `camelCase` for functions and variables, and kebab-case filenames such as `program-store.ts`. Keep filesystem, SQLite, and API-key access out of client components.

## Testing Guidelines

For behavior changes, add a failing test, implement the smallest fix, then refactor. Name unit tests `*.test.ts` beside their source and browser journeys `e2e/*.spec.ts`. Tests must use mock providers; never spend OpenAI credits or depend on public media. Before handoff, run:

```bash
pnpm test && pnpm lint && pnpm typecheck && pnpm build
```

Run `pnpm test:e2e` for UI or playback changes.

## Commit & Pull Request Guidelines

Use short Conventional Commit-style subjects found in history, such as `feat:`, `docs:`, and `build:`. Keep commits focused and verified. Pull requests should explain the outcome, reference the relevant spec or issue, list verification commands, and include desktop/mobile screenshots for UI changes. Call out schema, environment-variable, or licensing changes.

## Security & Configuration

Copy `.env.example` to `.env.local`; never place real keys in tracked files. Keep `OPENAI_API_KEY` server-side. Do not log listener messages, provider secrets, or signed asset URLs. Preserve the local-only deployment constraint unless an ADR and specification change explicitly approve otherwise.
