# Wavmo - AI Writing Agent

An AI Writing Agent that helps you write better documents. The system uses a network of agents to plan, write, review, and improve documents based on your requirements.


## Demo
<img src="https://5kas5z928t.ufs.sh/f/wBHVA4PQTleADjmboom4zTmgt2LeHUrOS9INl1qQRxADv6dM" width="400px" />

<br />

- [View Explanation Here](https://www.loom.com/share/326bbc9a5c194182beb18406825375df)
- [Flow Diagram](https://excalidraw.com/#json=lIvnB6TcVPxj94zeDgBKA,azRy62HdfeNaQJADn-H9Ig)

## What You Get

- Use slash commands or mdx format to format the document
- Ask agent to edit, review, proofread, help you prepare a draft
- Steer the agent to focus on specific aspects of the document
- Use mermaid syntax to render diagrams in the document
- Review changes before applying and flag any inconsistencies or issues

## How It Works

```
User Prompt
    ↓
Planner (generates plan, outline, tone, style)
    ↓
Writer (produces the document draft)
    ↓
Reviewer (flags issues and gaps)
    ↓
Improver (polishes the final document)
    ↓
Final Document
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Bun.js
- pnpm (v10.10.0 or higher)

### Installation

First, install the dependencies:

```bash
pnpm install
```

### Environment Variables

- For Server
Copy the example file and set your values:

```bash
cp apps/server/.env.example apps/server/.env
```

Server variables:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_BASE_URL=https://api.groq.com/openai/v1/
PORT=8000
CORS_ORIGIN=http://localhost:3001

# Rate limiting (see "Rate Limiting" section below)
REDIS_URL=redis://default:password@host:port
RATE_LIMIT_DEFAULT=5
RATE_LIMIT_WINDOW_SECONDS=86400
RATE_LIMIT_BYPASS_DEFAULT_LIMIT=200
```

- For Client
Copy the example file and set your values:

```bash
cp apps/web/.env.example apps/web/.env
```

Client variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Running the Application

Start all applications in development mode:

```bash
pnpm run dev
```

This will start:

- **Web Application**: [http://localhost:3001](http://localhost:3001) - Frontend UI
- **Server**: [http://localhost:8000](http://localhost:8000) - Backend API

### Running Individual Services

- **Web only**: `pnpm run dev:web`
- **Server only**: `pnpm run dev:server`

## Project Structure

```
ai-writing-agent/
├── apps/
│   ├── web/                    # Frontend application (Next.js)
│   │   ├── src/
│   │   │   ├── app/           # Next.js app router pages
│   │   │   ├── components/    # React components
│   │   │   │   ├── ui/        # UI component library
│   │   │   │   ├── chat-panel.tsx
│   │   │   │   ├── document-panel.tsx
│   │   │   │   └── ...
│   │   │   └── lib/           # Utility libraries
│   │   └── package.json
│   └── server/                 # Backend Server (Bun.js/Fastify)
│       ├── src/
│       │   ├── helpers/
│       │   │   └── prompts/   # Agent prompt templates
│       │   │       ├── planning.ts
│       │   │       ├── writing.ts
│       │   │       ├── review.ts
│       │   │       └── improvement.ts
│       │   ├── index.ts       # Fastify server setup
│       │   ├── network.ts     # LangGraph orchestration for agent workflow
│       │   └── types.ts       # TypeScript type definitions
│       └── package.json
├── packages/
│   └── config/                 # Shared configuration
└── package.json
```

## Available Scripts

- `pnpm run dev`: Start all applications in development mode
- `pnpm run build`: Build all applications for production
- `pnpm run build:web`: Build only the web application
- `pnpm run build:server`: Build only the server
- `pnpm run dev:web`: Start only the web application
- `pnpm run dev:server`: Start only the server
- `pnpm run check-types`: Check TypeScript types across all apps
- `pnpm run check`: Run Biome formatting and linting

## Technology Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Bun.js, Fastify
- **Orchestration**: LangGraph for workflow management
- **Code Quality**: Biome for linting and formatting

## Contributing

This project uses Biome for code formatting and linting. Before committing, run:

```bash
pnpm run check
```

This will automatically format and lint your code.

## Rate Limiting

The chat endpoints (`/api/chat` and `/api/chat/stream/init`) are rate limited per client IP. Limits are stored in Redis under the key `rl:ip:<ip>` as a small JSON blob `{ count, windowStart }` that expires after the window.

**Defaults:** 5 messages per 24h rolling window, anchored at the user's first message of the cycle.

**Configurable via env** (see `apps/server/.env.example`):

- `REDIS_URL` — required. Any Redis-compatible endpoint (Redis Cloud free tier works).
- `RATE_LIMIT_DEFAULT` — default per-IP limit (default `5`).
- `RATE_LIMIT_WINDOW_SECONDS` — window length in seconds (default `86400`).
- `RATE_LIMIT_BYPASS_DEFAULT_LIMIT` — limit used for IPs in the bypass set that don't have a custom limit (default `200`).

**Bypass / elevated users (per-IP override in Redis):**

```bash
# Grant bypass to an IP with a custom limit
SADD rl:bypass:ips 1.2.3.4
SET  rl:bypass:limit:1.2.3.4 500

# Revoke
SREM rl:bypass:ips 1.2.3.4
DEL  rl:bypass:limit:1.2.3.4
```

If an IP is in the `rl:bypass:ips` set but has no `rl:bypass:limit:<ip>` key, it falls back to `RATE_LIMIT_BYPASS_DEFAULT_LIMIT`.

**Failure mode:** if `REDIS_URL` is unset or Redis is unreachable, the server fails closed (returns `503`) rather than allowing unlimited traffic.

**Response on limit hit:** HTTP `429` with `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After` headers, plus a JSON body:

```json
{
  "error": "rate_limit_exceeded",
  "limit": 5,
  "remaining": 0,
  "resetAt": "2026-06-23T12:34:56.000Z"
}
```

**Read-only quota endpoint:** `GET /api/chat/quota` returns the current `limit`, `remaining`, and `resetAt` for the caller's IP without incrementing the counter. The web app uses this to display the "You have N messages remaining today!" pill above the chat input.
