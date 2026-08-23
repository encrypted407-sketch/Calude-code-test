import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parsePaperWithAI } from "../src/lib/ai";

const prisma = new PrismaClient();
const SEED_DATA_DIR = path.join(__dirname, "..", "seed-data");
const SYSTEM_USER_EMAIL = "seed-content@ascend.internal";

interface FlashcardSeed {
  subject: string;
  examBoard: string;
  topic?: string | null;
  category: "equation" | "definition";
  front: string;
  back: string;
}

interface PaperManifest {
  subject: string;
  examBoard: string;
  level: string;
  title: string;
  year: number | null;
  paperText: string;
  markSchemeText: string;
}

/** A dedicated, unusable-login account that owns preloaded content so Paper.userId has something to point at. */
async function ensureSystemUser() {
  const existing = await prisma.user.findUnique({ where: { email: SYSTEM_USER_EMAIL } });
  if (existing) return existing;

  const password = await bcrypt.hash(randomUUID(), 10);
  return prisma.user.create({
    data: { email: SYSTEM_USER_EMAIL, password, name: "Ascend Preloaded Content" },
  });
}

async function seedFlashcards() {
  const dir = path.join(SEED_DATA_DIR, "flashcards");
  if (!fs.existsSync(dir)) return;

  await prisma.flashcard.deleteMany({ where: { isPreloaded: true } });

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  let count = 0;
  for (const file of files) {
    const cards: FlashcardSeed[] = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"));
    for (const card of cards) {
      await prisma.flashcard.create({
        data: {
          subject: card.subject,
          examBoard: card.examBoard,
          topic: card.topic ?? null,
          category: card.category,
          front: card.front,
          back: card.back,
          isPreloaded: true,
        },
      });
      count++;
    }
  }
  console.log(`Seeded ${count} flashcard(s).`);
}

async function seedPapers(systemUserId: string) {
  const dir = path.join(SEED_DATA_DIR, "papers");
  if (!fs.existsSync(dir)) return;

  await prisma.paper.deleteMany({ where: { isPreloaded: true } });

  const subjectDirs = fs
    .readdirSync(dir)
    .filter((f) => fs.statSync(path.join(dir, f)).isDirectory());

  let created = 0;
  const failed: string[] = [];

  for (const subjectDir of subjectDirs) {
    const subjectPath = path.join(dir, subjectDir);
    const files = fs.readdirSync(subjectPath).filter((f) => f.endsWith(".json"));

    for (const file of files) {
      const manifest: PaperManifest = JSON.parse(
        fs.readFileSync(path.join(subjectPath, file), "utf-8")
      );

      try {
        const questions = await parsePaperWithAI({
          subject: manifest.subject,
          examBoard: manifest.examBoard,
          level: manifest.level,
          paperText: manifest.paperText,
          markSchemeText: manifest.markSchemeText,
        });

        await prisma.paper.create({
          data: {
            userId: systemUserId,
            subject: manifest.subject,
            examBoard: manifest.examBoard,
            level: manifest.level,
            title: manifest.title,
            year: manifest.year ?? null,
            rawText: manifest.paperText,
            markSchemeRawText: manifest.markSchemeText ?? null,
            isPreloaded: true,
            questions: {
              create: questions.map((q) => ({
                number: q.number,
                text: q.text,
                marksAvailable: q.marksAvailable,
                topic: q.topic ?? null,
                yearRequired: q.yearRequired ?? null,
                requiresDrawing: q.requiresDrawing,
                markSchemeText: q.markSchemeText ?? null,
              })),
            },
          },
        });
        created++;
        console.log(`  Seeded paper: ${manifest.title}`);
      } catch (err) {
        failed.push(`${subjectDir}/${file}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  console.log(`Seeded ${created} paper(s).`);
  if (failed.length > 0) {
    console.warn(
      `\nCouldn't parse ${failed.length} paper(s) (this usually means GROQ_API_KEY isn't set):`
    );
    for (const f of failed) console.warn(`  - ${f}`);
  }
}

async function main() {
  console.log("Seeding preloaded content...");
  const systemUser = await ensureSystemUser();
  await seedFlashcards();
  await seedPapers(systemUser.id);
  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
