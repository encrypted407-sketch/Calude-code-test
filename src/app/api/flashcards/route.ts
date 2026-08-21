import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  subject: z.string().min(1),
  examBoard: z.string().min(1),
  topic: z.string().nullable().optional(),
  category: z.enum(["equation", "definition"]),
  front: z.string().min(1),
  back: z.string().min(1),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subject = new URL(req.url).searchParams.get("subject");
  const category = new URL(req.url).searchParams.get("category");

  const cards = await prisma.flashcard.findMany({
    where: {
      OR: [{ isPreloaded: true }, { createdById: session.user.id }],
      ...(subject ? { subject } : {}),
      ...(category ? { category } : {}),
    },
    orderBy: [{ subject: "asc" }, { topic: "asc" }],
  });

  return NextResponse.json({ cards });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid flashcard data." }, { status: 400 });
  }

  const card = await prisma.flashcard.create({
    data: {
      subject: parsed.data.subject,
      examBoard: parsed.data.examBoard,
      topic: parsed.data.topic ?? null,
      category: parsed.data.category,
      front: parsed.data.front,
      back: parsed.data.back,
      createdById: session.user.id,
    },
  });

  return NextResponse.json({ card }, { status: 201 });
}
