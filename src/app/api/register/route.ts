import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please provide a valid name, email, and a password of at least 8 characters." },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 }
    );
  }

  const hashed = await bcrypt.hash(parsed.data.password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      name: parsed.data.name,
    },
  });

  return NextResponse.json({ id: user.id, email: user.email });
}
