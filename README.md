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
- Google Gemini API (`@google/genai`) for paper parsing, marking (including
  image input for drawn/handwritten answers), and question rewriting — has
  a free tier, see [ai.google.dev/pricing](https://ai.google.dev/gemini-api/docs/pricing)
  for current limits
- Tailwind CSS + Framer Motion
- HTML5 Canvas (Pointer Events + `perfect-freehand`) for drawn answers
- KaTeX for equation rendering
- SM-2 spaced repetition for flashcards

## Getting started

```bash
npm install
cp .env.example .env   # then fill in GEMINI_API_KEY at minimum
npx prisma migrate dev
npm run seed            # optional: preloaded AQA Maths/Physics content
npm run dev
```

Get a free `GEMINI_API_KEY` at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) —
no billing required to start, within the free tier's rate limits.

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Prisma connection string (`file:./dev.db` for local SQLite) |
| `NEXTAUTH_SECRET` | Random secret used to sign session tokens |
| `NEXTAUTH_URL` | Base URL of the app (`http://localhost:3000` locally) |
| `GEMINI_API_KEY` | Required for paper parsing, marking, and question rewriting — free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | Optional, defaults to `gemini-flash-latest` |

## Project structure

- `src/app/(auth)` — login / register
- `src/app/(app)` — authenticated app shell: dashboard, papers, flashcards, mock exams, checklist
- `src/app/(focus)` — distraction-free question/answer sessions
- `src/lib/ai.ts` — Gemini calls (parse / mark / rewrite), strict JSON with one retry
- `src/lib/sm2.ts` — flashcard spaced-repetition scheduler
- `src/lib/mastery.ts`, `src/lib/gamification.ts` — topic mastery, XP, streaks
- `prisma/schema.prisma` — data model
- `seed-data/` — preloaded exam papers, mark schemes, and flashcards; `prisma/seed.ts` loads them into the DB
