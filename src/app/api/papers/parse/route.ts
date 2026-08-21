import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { extractPdfText } from "@/lib/pdf";
import { parsePaperWithAI } from "@/lib/ai";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const subject = String(form.get("subject") || "").trim();
  const examBoard = String(form.get("examBoard") || "AQA").trim();
  const level = String(form.get("level") || "A-Level").trim();

  if (!subject) {
    return NextResponse.json({ error: "Subject is required." }, { status: 400 });
  }

  const paperTextField = form.get("paperText");
  const paperFile = form.get("paperFile");
  const markSchemeTextField = form.get("markSchemeText");
  const markSchemeFile = form.get("markSchemeFile");

  let paperText = typeof paperTextField === "string" ? paperTextField.trim() : "";
  if (!paperText && paperFile instanceof File && paperFile.size > 0) {
    const buffer = Buffer.from(await paperFile.arrayBuffer());
    paperText = await extractPdfText(buffer);
  }

  let markSchemeText = typeof markSchemeTextField === "string" ? markSchemeTextField.trim() : "";
  if (!markSchemeText && markSchemeFile instanceof File && markSchemeFile.size > 0) {
    const buffer = Buffer.from(await markSchemeFile.arrayBuffer());
    markSchemeText = await extractPdfText(buffer);
  }

  if (!paperText) {
    return NextResponse.json(
      { error: "Paste the question paper text or upload a PDF." },
      { status: 400 }
    );
  }

  try {
    const questions = await parsePaperWithAI({
      subject,
      examBoard,
      level,
      paperText,
      markSchemeText: markSchemeText || null,
    });

    return NextResponse.json({ questions, paperText, markSchemeText });
  } catch (err) {
    console.error("Paper parse failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Couldn't parse this paper: ${message}` },
      { status: 502 }
    );
  }
}
