# AGENTS.md

## Cursor Cloud specific instructions

### What this repo is
The primary runnable application is the Next.js 14 app in `afiliads_app/nextjs_space` ("AfiliAds — Central de Campanhas"), a PT-BR affiliate-marketing campaign manager. It uses Prisma + PostgreSQL, NextAuth (email/password credentials), and Tailwind. See `afiliads_app/.project_instructions.md` for the page/feature map.

The other two top-level folders are not long-running services:
- `afiliado-google-ads-pro/` — a "skill" bundle of standalone Python scripts + markdown docs (no server).
- `mcp-afiliads/` — a stdio MCP server that talks to the *production* Railway DB; not part of local dev.

All commands below run inside `afiliads_app/nextjs_space` unless noted.

### Local services / how to run
- PostgreSQL is installed locally (v16) but is NOT auto-started on boot. Start it each session:
  `sudo pg_ctlcluster 16 main start`
- Dev server (port 3000): `npm run dev` (defined in `package.json`; it runs `rm -rf .next && next dev`).
- The local dev DB is `afiliads` on `localhost:5432` (user/pass `postgres`/`postgres`). Connection + auth secrets live in `afiliads_app/nextjs_space/.env`, which is git-ignored and persisted in the VM snapshot (not committed). If it is ever missing, recreate it with `DATABASE_URL`, `NEXTAUTH_URL=http://localhost:3000`, and any non-empty `NEXTAUTH_SECRET`.

### Database
- Schema is managed by Prisma with `npx prisma db push` (no migration files in the repo).
- Seed with `npx prisma db seed` (self-contained; needs no external APIs). Seeded login: `john@doe.com` / `johndoe123` (full demo data). A second manually-created login `demo@afiliads.dev` / `demo1234` also exists.
- Seeding goes through `scripts/safe-seed.ts`, which refuses to run if `scripts/seed.ts` contains `delete`/`deleteMany` (guard against wiping shared prod data) — do not add deletes there.

### Non-obvious gotchas
- `npm install` fails with an `ERESOLVE` peer conflict; always use `npm install --legacy-peer-deps`.
- `npm run lint` is currently broken: `eslint@9` + `eslint-config-next@15` are incompatible with `next lint` from `next@14` (Invalid Options / removed keys). This is a pre-existing dependency-version mismatch, not an env issue. Builds are unaffected because `next.config.js` sets `eslint.ignoreDuringBuilds: true`.
- All LLM / Google Ads / ClickBank / AnswerThePublic integrations are optional (`process.env.*` keys). The app runs fully with manual data and no external API keys; only AI-generation features need keys.
- `instrumentation.ts` starts a background loop scheduler only when `LOOP_SCHEDULER=on`; it stays off by default.
