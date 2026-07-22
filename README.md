# Deft

Deft is an AI-assisted content workspace for creators. It guides users through niche onboarding, generates content plans, manages content across platforms, analyzes uploaded or linked media, and provides an AI script editor with file-aware chat.

The application now uses **Convex** for all application persistence, realtime data, background-job state, LangGraph checkpoints, and file storage. **Clerk** provides authentication, and Clerk user IDs are stored in Convex as each record's `user_id`.

## Architecture

- **Next.js 16 / React 19** — application UI and API routes
- **Convex** — database, realtime queries, mutations, indexes, vector search, and file storage
- **Clerk** — authentication and Convex identity tokens
- **Trigger.dev** — long-running content-plan, media-analysis, and attachment-processing jobs
- **LangChain / LangGraph** — AI workflows and the onboarding agent
- **Convex-backed LangGraph checkpointer** — resumable onboarding conversations without Postgres
- **PostHog** — product analytics

Supabase is no longer used by the running application. The SQL files under `supabase/migrations/` remain only as historical migration references.

## Convex data model

The complete schema is defined in [`convex/schema.ts`](convex/schema.ts). The migrated tables are:

| Convex table | Purpose |
| --- | --- |
| `user_content_profile` | Onboarding answers and creator profile |
| `content_items` | Planned and published content items |
| `content_engine_progress` | Realtime content-plan generation progress |
| `script_chat_sessions` | Script editor chat sessions and editor state |
| `script_chat_messages` | Ask/edit chat history and proposed changes |
| `script_chat_attachments` | Uploaded attachment metadata and processing state |
| `script_chat_attachment_chunks` | Extracted text and vector embeddings for retrieval |
| `content_analytics` | Video/text analysis records and stored media references |
| `content_analytics_progress` | Realtime media-processing progress |
| `custom_objects` | Brand guides, social links, and other user context |
| `langgraph_checkpoints` | Serialized onboarding-agent checkpoints |
| `langgraph_checkpoint_writes` | Pending LangGraph channel writes |

Convex does not use SQL foreign-key constraints. Relations between Convex documents use typed IDs such as `v.id("content_items")`; ownership relations use the authenticated Clerk ID stored as a string. Referential checks and cascading cleanup are enforced in Convex mutations.

## Prerequisites

- Node.js 20 or later
- npm (the repository also includes a Bun lockfile)
- A [Convex](https://www.convex.dev/) account and project
- A [Clerk](https://clerk.com/) application
- A [Trigger.dev](https://trigger.dev/) project for background processing
- API keys for the AI providers used by the workflows you run

Media analysis also requires yt-dlp and FFmpeg. See [`docs/yt-dlp-ffmpeg-setup.md`](docs/yt-dlp-ffmpeg-setup.md).

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Connect the repository to Convex

```bash
npx convex dev
```

Sign in when prompted and select or create the Convex project for this application. The command links the local repository, creates the development deployment, pushes the schema/functions, generates `convex/_generated`, and writes the local Convex deployment variables.

Keep this command running during development so schema and function changes are synchronized.

### 3. Configure Clerk for Convex

Create a Clerk application and copy its publishable and secret keys. In Clerk, create a JWT template named exactly `convex`; Convex requests tokens using this template name.

Set the Clerk issuer domain in the Convex deployment environment:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-clerk-instance.clerk.accounts.dev
```

`convex/auth.config.ts` registers that issuer with the `convex` application ID. After changing the issuer, restart `npx convex dev` so the auth configuration is deployed.

### 4. Configure environment variables

Copy the safe template and fill in the required values:

```bash
cp .env.example .env.local
```

Core variables:

| Variable | Used by |
| --- | --- |
| `CONVEX_DEPLOYMENT` | Convex CLI deployment selection |
| `NEXT_PUBLIC_CONVEX_URL` | Browser, Next.js server, and Trigger.dev Convex clients |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Convex HTTP/site endpoint when required |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk browser client |
| `CLERK_SECRET_KEY` | Clerk server authentication |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex Clerk token validation |
| `TRIGGER_CONVEX_SECRET` | Server-to-server authorization for workers and checkpoints |
| `GEMINI_API_KEY`, `XAI_API_KEY`, `COHERE_API_KEY` | AI generation and attachment embeddings |

`TRIGGER_CONVEX_SECRET` is not the Trigger.dev API key. Generate a separate long random value and set the identical value in:

1. `.env.local` for Next.js server code.
2. The Convex deployment environment.
3. The Trigger.dev project environment.

```bash
npx convex env set TRIGGER_CONVEX_SECRET your-random-secret
```

Never expose this secret through a `NEXT_PUBLIC_` variable.

Additional integrations used by specific workflows include `ASSEMBLY_AI_API_KEY`, `WEB_SEARCH_API_KEY`, `YT_WORKER_URL`, `NEXT_PUBLIC_POSTHOG_KEY`, and `NEXT_PUBLIC_POSTHOG_HOST`.

### 5. Run the application

Run Convex and Next.js in separate terminals:

```bash
npx convex dev
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For background tasks, authenticate the Trigger.dev CLI, configure its environment variables, and run:

```bash
npm run trigger:dev
```

## Authentication and data access

`ClerkProvider` wraps the application, and `ConvexProviderWithClerk` passes Clerk identity tokens to Convex. UI components access Clerk through the custom hooks in `hooks/use-clerk-auth.ts`.

Authenticated Convex functions derive the current user from `ctx.auth.getUserIdentity()`; callers do not choose another user's ID. Trigger.dev jobs cannot use a browser session, so the functions in `convex/triggerWorkers.ts` require `TRIGGER_CONVEX_SECRET` and an explicit user ID.

## File storage and background processing

Uploads use Convex Storage rather than Supabase Storage:

1. An authenticated Convex function generates an upload URL.
2. The client uploads the file directly to Convex Storage.
3. A Convex storage ID is saved on the associated document.
4. Trigger.dev processes the file and updates progress through protected Convex functions.
5. UI queries receive progress updates reactively.

Script-chat attachments are extracted, security-scanned, chunked, embedded, and stored for vector retrieval. Content analytics stores uploaded videos, generated audio, and thumbnails in Convex Storage. More detail is available in [`docs/google-cloud-setup.md`](docs/google-cloud-setup.md).

## LangGraph checkpoints

The onboarding niche agent no longer needs a Postgres checkpointer. `lib/ai/agents/checkpointer.ts` implements a Convex-backed `BaseCheckpointSaver` using `langgraph_checkpoints` and `langgraph_checkpoint_writes`. It uses `CONVEX_URL` or `NEXT_PUBLIC_CONVEX_URL` plus the server-only `TRIGGER_CONVEX_SECRET`.

See [`docs/onboarding-niche-agent.md`](docs/onboarding-niche-agent.md) for the agent flow and troubleshooting notes.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npx convex dev` | Sync Convex functions/schema and watch for changes |
| `npm run trigger:dev` | Run Trigger.dev tasks locally |
| `npm run typecheck` | Run TypeScript checks |
| `npm run build` | Create a production Next.js build |
| `npm run trigger:deploy` | Deploy Trigger.dev tasks |

## Deployment

Before deploying:

1. Deploy Convex functions and schema with `npx convex deploy`.
2. Configure Clerk issuer and `TRIGGER_CONVEX_SECRET` in the production Convex deployment.
3. Configure the Next.js host with the production Convex URL, Clerk keys, AI keys, and Trigger.dev variables.
4. Configure Trigger.dev with the production Convex URL and the same worker secret.
5. Deploy Trigger.dev tasks with `npm run trigger:deploy`.

Run `npm run typecheck` and `npm run build` before release.

## Migration notes

- Supabase Auth was replaced by Clerk.
- Supabase tables and realtime subscriptions were replaced by Convex tables, queries, and mutations.
- Supabase Storage was replaced by Convex Storage.
- Trigger.dev tasks now read and write through protected Convex functions.
- Script ask/edit APIs and attachment retrieval now persist through Convex.
- The Postgres LangGraph checkpointer was replaced by Convex checkpoint tables.
- Legacy Supabase migrations are retained for schema history only and should not be applied to new environments.
