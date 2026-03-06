# Voice to Code — AI Prompt Builder

Turn spoken development ideas into structured technical specifications and implementation-ready coding prompts.

## How It Works

1. **Record or upload** an audio note describing what you want to build
2. **Transcribe** the audio using OpenAI Whisper
3. **Generate** a structured technical spec and Claude-ready prompt via GPT-4o
4. **Optionally run** the generated prompt through Claude to produce code

## Tech Stack

- **Next.js 14** (App Router) — full-stack TypeScript
- **Prisma** — type-safe ORM
- **PostgreSQL** — persistence
- **Tailwind CSS** — styling
- **OpenAI API** — Whisper transcription + GPT-4o prompt generation
- **Anthropic Claude API** — optional code generation

## Prerequisites

- Node.js 18+
- Docker (for PostgreSQL) or an existing PostgreSQL instance
- OpenAI API key
- Anthropic API key (optional, for Claude execution step)

## Setup

```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env
# Edit .env with your API keys (DATABASE_URL is pre-configured for docker compose)

# 4. Create database tables
npx prisma db push

# 5. (Optional) Seed demo data
npm run db:seed

# 6. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `OPENAI_API_KEY` | Yes | OpenAI API key (Whisper + GPT-4o) |
| `ANTHROPIC_API_KEY` | No | Anthropic API key (Claude code gen) |
| `STORAGE_PROVIDER` | No | `local` (default) or `s3` |
| `STORAGE_LOCAL_PATH` | No | Local upload directory (default: `./uploads`) |

## Project Structure

```
src/
  app/                    # Next.js App Router pages + API routes
    api/audio-notes/      # REST API endpoints
    notes/[id]/           # Note detail page
    history/              # History/search page
  components/             # React UI components
  services/               # Business logic + external API adapters
    transcription.service # OpenAI Whisper transcription
    openai.service        # GPT-4o prompt generation
    claude.service        # Claude code execution
    note.service          # Orchestration layer
  lib/                    # Shared utilities (Prisma, storage, helpers)
  types/                  # TypeScript interfaces
prisma/
  schema.prisma           # Database schema
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/audio-notes` | List all notes |
| `POST` | `/api/audio-notes` | Upload audio file |
| `GET` | `/api/audio-notes/:id` | Get note detail |
| `DELETE` | `/api/audio-notes/:id` | Delete note |
| `POST` | `/api/audio-notes/:id/transcribe` | Transcribe audio |
| `POST` | `/api/audio-notes/:id/generate-prompt` | Generate spec + prompt |
| `POST` | `/api/audio-notes/:id/run-claude` | Execute prompt in Claude |

## Pipeline Status Flow

```
uploaded -> transcribing -> transcribed -> generating_prompt -> prompt_generated -> running_claude -> claude_completed
                 |                              |                                        |
                 +------------------------------+----------------------------------------+-> error
```

## Database Schema

Four core tables:
- **AudioNote** — audio file metadata and pipeline status
- **Transcript** — raw and cleaned transcription text
- **PromptArtifact** — structured spec, requirements, and Claude prompt
- **ClaudeRun** — Claude API request/response history

## Storage

Audio files are stored locally in `./uploads/` by default. The storage layer uses a provider interface that can be swapped to S3-compatible storage by implementing `StorageProvider` in `src/lib/storage.ts`.
