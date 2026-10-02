# Oil Web

Modern web boilerplate built with SvelteKit 2, Svelte 5, Tailwind CSS v4, and integrated with the `authsvc` authentication service (Better Auth running on Cloudflare Workers).

## Key Features

- Framework: SvelteKit 2 with Svelte 5 (Runes mode `$state`, `$derived`, `$props`).
- Styling: Tailwind CSS v4 (`@tailwindcss/vite`), powered by bits-ui and shadcn-svelte primitives.
- Integrated Authentication (`authsvc`):
  - Uses Better Auth client with a BFF reverse proxy (`src/routes/api/auth/[...all]/+server.ts`).
  - Exchanges session token for app-scoped JWT via `POST /api/auth/token/issue`.
  - In-memory JWT token caching to prevent XSS token theft from browser storage.
  - `fetchWithAuth` client automatically injects the Bearer token and triggers an auto-refresh when encountering HTTP 401.
  - Comprehensive authentication flows: Sign in, Sign up, Forgot Password, Reset Password, Google Social Login, and modal prompts.
- Internationalization (i18n): Paraglide-js with support for English (`en`) and Indonesian (`id`).
- Deployment: Pre-configured for Cloudflare Pages or Cloudflare Workers via `@sveltejs/adapter-cloudflare` and `wrangler.jsonc`.
- Testing: Vitest unit tests for authentication utilities and the BFF proxy endpoint.

---

## Prerequisites

- [Bun](https://bun.sh/) (latest version recommended).
- A running instance of `authsvc` (default local address: `http://localhost:8787`).

---

## Installation and Running

1. Navigate to the `oil-web` directory:

   ```bash
   cd /Users/rill/Repos/projects/oil-web
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Copy the environment configuration template:

   ```bash
   cp .env.example .env
   ```

4. Run i18n compilation and sync SvelteKit:

   ```bash
   bun run prepare
   ```

5. Start the development server:
   ```bash
   bun run dev
   ```

The application will be accessible at `http://localhost:5173`.

---

## Registering the Application in authsvc

Before `authsvc` can issue app-scoped JWTs (`/api/auth/token/issue`) for `oil-web`, the application must be registered in the `authsvc` database. You can register it using either of the two methods below:

### Method 1: Using Wrangler D1 CLI (Local Development)

If you are running `authsvc` locally with Cloudflare D1, run the following command from the root of the `authsvc` repository:

```bash
cd /Users/rill/Repos/projects/authsvc

bunx wrangler d1 execute authgate-local-db --local --command "INSERT OR IGNORE INTO applications (id, name, allowed_origins, allowed_redirect_urls, is_active, host, created_at, updated_at) VALUES ('oil-web', 'Oil Web', '[\"http://localhost:5173\"]', '[]', 1, 'localhost', (cast(unixepoch('subsecond') * 1000 as integer)), (cast(unixepoch('subsecond') * 1000 as integer)));"
```

Alternatively, you can append the record to `authsvc/drizzle/seed-applications.sql`:

```sql
INSERT OR IGNORE INTO applications (id, name, allowed_origins, allowed_redirect_urls, is_active, host, created_at, updated_at)
VALUES ('oil-web', 'Oil Web', '["http://localhost:5173"]', '[]', 1, 'localhost', (cast(unixepoch('subsecond') * 1000 as integer)), (cast(unixepoch('subsecond') * 1000 as integer)));
```

Then execute:

```bash
bun run db:seed
```

### Method 2: Using the Admin REST API

If `authsvc` is already running and you have configured `ADMIN_API_KEY` (in `.dev.vars` inside `authsvc`):

```bash
curl -X POST http://localhost:8787/api/auth/applications \
  -H "Authorization: Bearer <ADMIN_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "oil-web",
    "name": "Oil Web",
    "allowed_origins": ["http://localhost:5173"],
    "allowed_redirect_urls": ["http://localhost:5173/auth/callback"],
    "is_active": true
  }'
```

---

## Environment Variables (.env)

| Variable          | Description                                   | Default Dev             |
| ----------------- | --------------------------------------------- | ----------------------- |
| `PUBLIC_AUTH_URL` | Base URL of the authsvc service (Better Auth) | `http://localhost:8787` |
| `PUBLIC_APP_ID`   | Application ID registered in authsvc          | `oil-web`               |
| `PUBLIC_API_URL`  | Base URL of your backend API                  | `http://localhost:8080` |

---

## Directory Structure

```
oil-web/
├── messages/                    # i18n translation dictionaries (en.json & id.json)
├── project.inlang/              # Paraglide i18n project configuration
├── src/
│   ├── app.html                 # Root HTML document template
│   ├── app.d.ts                 # SvelteKit and Cloudflare global type declarations
│   ├── worker-configuration.d.ts # Cloudflare environment binding types
│   ├── lib/
│   │   ├── auth.ts              # Better Auth client, in-memory JWT manager, and fetchWithAuth
│   │   ├── auth.spec.ts         # Unit tests for the authentication layer
│   │   ├── utils.ts             # Tailwind class merging utility (clsx + tailwind-merge)
│   │   ├── api/
│   │   │   └── error.ts         # Standardized API error parser with i18n support
│   │   ├── components/
│   │   │   ├── auth/            # AuthPromptModal and EmailVerificationPromptModal
│   │   │   └── ui/              # shadcn-svelte UI components (Button, Input, Card, etc.)
│   │   └── i18n/                # Active locale state management
│   └── routes/
│       ├── layout.css           # Tailwind v4 configuration and color design tokens
│       ├── +layout.svelte       # Root layout with header, language toggle, and toast notifications
│       ├── +page.svelte         # Minimal landing page
│       ├── auth/
│       │   ├── login/           # Authentication page (sign in, sign up, forgot password)
│       │   └── reset-password/  # Password reset page
│       ├── dashboard/           # Protected starter dashboard
│       └── api/auth/[...all]/   # BFF reverse proxy to authsvc
├── vite.config.ts               # Vite configuration and proxy setup
├── wrangler.jsonc               # Cloudflare Pages / Workers deployment configuration
└── README.md
```

---

## Available Scripts

- `bun run dev`: Starts the local development server with hot module replacement.
- `bun run build`: Builds the production bundle using the Cloudflare adapter.
- `bun run preview`: Runs a local preview of the production build using Wrangler Pages.
- `bun run check`: Executes TypeScript and Svelte template type checking.
- `bun run test`: Executes the Vitest unit test suite.
- `bun run format`: Formats all files using Prettier.
- `bun run lint`: Verifies code formatting compliance with Prettier.
