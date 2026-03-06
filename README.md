# Voice to Code — AI Prompt Builder

Turn spoken development ideas into structured technical specifications and implementation-ready coding prompts.

## How It Works

1. **Record or upload** an audio note describing what you want to build
2. **Transcribe** the audio using OpenAI Whisper
3. **Generate** a structured technical spec and Claude-ready prompt via GPT-4o
4. **Edit** the generated prompt if needed
5. **Optionally run** the generated prompt through Claude to produce code

## Tech Stack

- **Next.js 14** (App Router) — full-stack TypeScript
- **Prisma** — type-safe ORM
- **PostgreSQL** — persistence (via Docker)
- **Tailwind CSS** — styling
- **OpenAI API** — Whisper transcription + GPT-4o prompt generation
- **Anthropic Claude API** — optional code generation

## Prerequisites

- Node.js 18+
- Docker (for PostgreSQL)
- OpenAI API key
- Anthropic API key (optional, for the Claude execution step)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
cp .env.example .env
```

Open `.env` and add your API keys:

```
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."     # optional
```

The `DATABASE_URL` is pre-configured to match the Docker Compose setup — no changes needed.

```bash
# 3. Start PostgreSQL
docker compose up -d

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
| `DATABASE_URL` | Yes | PostgreSQL connection string (pre-configured for Docker) |
| `OPENAI_API_KEY` | Yes | OpenAI API key (Whisper + GPT-4o) |
| `ANTHROPIC_API_KEY` | No | Anthropic API key (Claude code generation) |
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
  seed.ts                 # Demo seed data
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/audio-notes` | List all notes |
| `POST` | `/api/audio-notes` | Upload audio file |
| `GET` | `/api/audio-notes/:id` | Get note detail |
| `PATCH` | `/api/audio-notes/:id` | Update Claude prompt text |
| `DELETE` | `/api/audio-notes/:id` | Delete note |
| `POST` | `/api/audio-notes/:id/transcribe` | Transcribe audio |
| `POST` | `/api/audio-notes/:id/generate-prompt` | Generate spec + prompt |
| `POST` | `/api/audio-notes/:id/run-claude` | Execute prompt in Claude |

## Pipeline

Each note progresses through a visual pipeline:

```
uploaded -> transcribing -> transcribed -> generating_prompt -> prompt_generated -> running_claude -> claude_completed
                 |                              |                                        |
                 +------------------------------+----------------------------------------+-> error (with retry)
```

## Features

- Browser microphone recording
- Audio file upload (webm, mp3, wav, m4a, ogg, mp4)
- Audio playback on note detail page
- Editable Claude prompt before execution
- Copy-to-clipboard for prompts and outputs
- JSON and Markdown export of specs
- Retry buttons on failed pipeline steps
- Re-run any pipeline step (re-transcribe, regenerate prompt)
- Searchable history with status filters
- Visual pipeline progress tracker

## Database Schema

Four core tables:
- **AudioNote** — audio file metadata and pipeline status
- **Transcript** — raw and cleaned transcription text
- **PromptArtifact** — structured spec, requirements, and Claude prompt
- **ClaudeRun** — Claude API request/response history

## Storage

Audio files are stored locally in `./uploads/` by default. The storage layer uses a provider interface (`StorageProvider` in `src/lib/storage.ts`) designed to be swapped to S3-compatible storage.
