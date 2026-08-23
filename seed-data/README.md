# Seed data

`prisma/seed.ts` loads everything in this folder into the database as
preloaded content (`isPreloaded = true`), visible to every user.

## Flashcards

`flashcards/*.json` — arrays of cards:

```json
{ "subject": "Physics", "examBoard": "AQA", "topic": "Mechanics", "category": "equation", "front": "F = ma", "back": "..." }
```

`category` is `"equation"` or `"definition"`. Equation fronts are LaTeX,
rendered with KaTeX. All wording here is written from scratch — the
underlying formulas and facts aren't copyrightable, but exam-board phrasing
is, so definitions are deliberately *not* copied from the specification or
any textbook.

## Papers

`papers/<subject>/*.json` — one past paper per file:

```json
{
  "subject": "Mathematics",
  "examBoard": "AQA",
  "level": "A-Level",
  "title": "...",
  "year": 2023,
  "paperText": "1. ... [3 marks]\n\n2. ...",
  "markSchemeText": "1. ... [3 marks total]\n\n2. ..."
}
```

Each paper is run through the same AI parsing pipeline as a user upload
(`parsePaperWithAI`), so `paperText`/`markSchemeText` can be pasted
straight from a PDF extract — they don't need to be pre-split into
questions.

### Adding real AQA past papers

AQA's past-papers search (aqa.org.uk/find-past-papers-and-mark-schemes) is
an interactive, JavaScript-driven UI with no stable, guessable URL per
paper, so it can't be scraped by a plain script. To add a real paper:

1. Download the question paper and mark scheme PDFs from AQA for the
   subject/paper you want.
2. Either:
   - Extract their text yourself and paste it into a new
     `papers/<subject>/*.json` file in the format above, or
   - Drop the PDFs into this folder and extend `prisma/seed.ts`'s
     `loadPdfPapers()` to point at them (it uses the same `extractPdfText`
     helper as the upload flow).
3. Set `title`/`year` to match the real paper, and set `examBoard`
   accordingly.

The two `sample-practice-paper-*.json` files included here are **not**
genuine AQA papers — they're original practice questions written for this
project, in AQA's style and covering AQA-specification topics, so the app
has something realistic to seed and test against out of the box without
redistributing copyrighted exam content.

## Running the seed

```bash
npm run seed
```

Requires `GEMINI_API_KEY` to be set (paper parsing is an AI call, same
as the upload flow). The script is safe to re-run — it clears out existing
preloaded flashcards/papers first, so it won't duplicate them.
