# Ascend — A-Level Revision App

Drop in a past paper, answer question-by-question, get AI marking against
the real mark scheme, and get weak topics resurfaced later as spaced
repetition. Includes a pressure-sensitive drawing canvas for graphs and
diagrams, an SM-2 flashcard system, and a distraction-minimising Focus Mode.

Initial content focus: AQA A-Level Maths and Physics. The architecture is
general — any subject or exam board can be added via upload.

## Tech stack

- Next.js (App Router) + TypeScript
- PostgreSQL + Prisma ORM (SQLite for local dev)
- NextAuth.js (credentials provider)
- Groq API (OpenAI-compatible REST, no SDK) for paper parsing, marking, and
  question rewriting — free API key, no card required. Text calls use
  `openai/gpt-oss-120b`; marking a drawn/handwritten answer (image input)
  uses the multimodal `qwen/qwen3.6-27b` instead, since not all Groq-hosted
  models take images. Verified working end-to-end against a real free-tier
  key. Free-tier accounts have a per-minute token cap (observed ~8000 TPM) —
  large paper uploads or rapid back-to-back requests can hit it; the app
  surfaces a clear "wait a minute and try again" error rather than a raw
  API error when that happens. See
  [console.groq.com/docs/rate-limits](https://console.groq.com/docs/rate-limits)
  for current limits, and [console.groq.com/docs/models](https://console.groq.com/docs/models)
  if a model here has since been retired — Groq's free-tier catalog changes
  over time, override with `GROQ_MODEL`/`GROQ_VISION_MODEL` if so
- Tailwind CSS + Framer Motion
- HTML5 Canvas (Pointer Events + `perfect-freehand`) for drawn answers
- KaTeX for equation rendering
- SM-2 spaced repetition for flashcards

## Getting started

```bash
npm install
cp .env.example .env   # then fill in GROQ_API_KEY at minimum
npx prisma migrate dev
npm run seed            # optional: preloaded AQA Maths/Physics content
npm run dev
```

Get a free `GROQ_API_KEY` at [console.groq.com/keys](https://console.groq.com/keys) — sign
up with just an email/Google account, no card required.

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Prisma connection string (`file:./dev.db` for local SQLite) |
| `NEXTAUTH_SECRET` | Random secret used to sign session tokens |
| `NEXTAUTH_URL` | Base URL of the app (`http://localhost:3000` locally) |
| `GROQ_API_KEY` | Required for paper parsing, marking, and question rewriting — free at [console.groq.com/keys](https://console.groq.com/keys), no card required |
| `GROQ_MODEL` | Optional, text model, defaults to `openai/gpt-oss-120b` |
| `GROQ_VISION_MODEL` | Optional, used only when marking a drawn/handwritten answer, defaults to `qwen/qwen3.6-27b` |

## Project structure

- `src/app/(auth)` — login / register
- `src/app/(app)` — authenticated app shell: dashboard, papers, flashcards, mock exams, checklist
- `src/app/(focus)` — distraction-free question/answer sessions
- `src/lib/ai.ts` — Groq calls (parse / mark / rewrite), strict JSON with one retry
- `src/lib/sm2.ts` — flashcard spaced-repetition scheduler
- `src/lib/mastery.ts`, `src/lib/gamification.ts` — topic mastery, XP, streaks
- `prisma/schema.prisma` — data model
- `seed-data/` — preloaded exam papers, mark schemes, and flashcards; `prisma/seed.ts` loads them into the DB
