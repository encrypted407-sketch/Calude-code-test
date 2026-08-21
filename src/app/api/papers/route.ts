import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const questionInputSchema = z.object({
  number: z.string(),
  text: z.string(),
  marksAvailable: z.number().int().min(0),
  topic: z.string().nullable().optional(),
  yearRequired: z.union([z.literal(1), z.literal(2)]).nullable().optional(),
  requiresDrawing: z.boolean().default(false),
  markSchemeText: z.string().nullable().optional(),
});

const createPaperSchema = z.object({
  subject: z.string().min(1),
  examBoard: z.string().min(1),
  level: z.string().min(1),
  title: z.string().min(1),
  year: z.number().int().nullable().optional(),
  rawText: z.string().min(1),
  markSchemeRawText: z.string().nullable().optional(),
  isMock: z.boolean().optional(),
  mockDurationMins: z.number().int().nullable().optional(),
  questions: z.array(questionInputSchema).min(1),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const papers = await prisma.paper.findMany({
    where: { OR: [{ userId: session.user.id }, { isPreloaded: true }] },
    include: { _count: { select: { questions: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ papers });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createPaperSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid paper data.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const paper = await prisma.paper.create({
    data: {
      userId: session.user.id,
      subject: data.subject,
      examBoard: data.examBoard,
      level: data.level,
      title: data.title,
      year: data.year ?? null,
      rawText: data.rawText,
      markSchemeRawText: data.markSchemeRawText ?? null,
      isMock: data.isMock ?? false,
      mockDurationMins: data.mockDurationMins ?? null,
      questions: {
        create: data.questions.map((q) => ({
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
    select: { id: true },
  });

  return NextResponse.json({ id: paper.id }, { status: 201 });
}
